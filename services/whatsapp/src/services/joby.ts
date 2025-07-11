import { type Request, type Response } from 'express';
import secrets from 'secret-manager';
import { Logger } from 'logger';
import whatsapp, { type WhatsAppMessagePayload } from 'whatsapp-utils';
import prisma from 'joby-db';
import type { usersModel as User } from 'joby-db';
import { Prisma } from 'joby-db/src/generated/prisma/client.ts';
import OpenAI from 'openai';

import { jobyModelSettings } from './joby/joby-model-settings.ts';

const logger = new Logger('Whatsapp');

const openai = new OpenAI({
  apiKey: secrets.OPENAI_TOKEN
});

async function jobyWebhook(req: Request, res: Response) {
  try {
    res.status(200).send('Message sent successfully'); // no retries

    const accessToken = secrets.WHATSAPP_ACCESS_TOKEN;
    const whatsAppPayload: WhatsAppMessagePayload = req.body;

    // Log the incoming request body to understand its structure
    logger.log('Incoming webhook payload:', {
      debug: { headers: JSON.stringify(req.rawHeaders, null, 2), body: JSON.stringify(whatsAppPayload, null, 2) }
    });

    const message = await whatsapp.getMessage(whatsAppPayload, accessToken);

    // Check for reset command
    if (message === '/reset') {
      const phoneNumber = whatsAppPayload.entry[0].changes[0].value.messages[0].from;

      // Delete user and their job preferences in a transaction
      await prisma.$transaction(async tx => {
        // First find the user to get their ID
        const user = await tx.users.findUnique({
          where: { phone_number: phoneNumber }
        });

        if (user) {
          // Delete job preferences first (foreign key constraint)
          await tx.job_preferences
            .delete({
              where: { user_id: user.id }
            })
            .catch(() => {
              // Ignore error if no job_preferences exist
            });

          // Then delete the user
          await tx.users.delete({
            where: { id: user.id }
          });
        }
      });

      logger.log('User reset requested and completed', { phoneNumber });

      await whatsapp.respond(whatsAppPayload, 'Your history has been successfully reset', accessToken);
      return;
    }

    // Check for preferences command
    if (message === '/preferences') {
      const phoneNumber = whatsAppPayload.entry[0].changes[0].value.messages[0].from;

      const user = await prisma.users.findUnique({
        where: { phone_number: phoneNumber },
        include: {
          job_preferences: true
        }
      });

      if (!user || !user.job_preferences) {
        await whatsapp.respond(
          whatsAppPayload,
          "You haven't saved any job preferences yet. Start by telling me what kind of job you're looking for!",
          accessToken
        );
        return;
      }

      let responseMessage = `📋 **Your Job Search Settings:**\n\n`;

      // Add job preferences
      if (user.job_preferences.job_preference) {
        responseMessage += `**Job Preferences:**\n"${user.job_preferences.job_preference}"\n\n`;
      }

      // Add keywords if available
      if (user.job_preferences.keywords) {
        responseMessage += `**Keywords:**\n${user.job_preferences.keywords}\n\n`;
      }

      // Add location if available
      if (user.job_preferences.location) {
        responseMessage += `**Location:**\n${user.job_preferences.location}\n\n`;
      }

      // Add companies if available
      if (user.job_preferences.companies && user.job_preferences.companies.length > 0) {
        responseMessage += `**Target Companies:**\n${user.job_preferences.companies.join(', ')}\n\n`;
      }

      // Add job type if available
      if (user.job_preferences.jobType) {
        responseMessage += `**Job Type:**\n${user.job_preferences.jobType}\n\n`;
      }

      // Add remote preference if available
      if (user.job_preferences.onsiteRemote) {
        responseMessage += `**Work Style:**\n${user.job_preferences.onsiteRemote}\n\n`;
      }

      // Add date posted preference if available
      if (user.job_preferences.datePosted) {
        responseMessage += `**Job Posting Age:**\n${user.job_preferences.datePosted}\n\n`;
      }

      // Add timezone if available
      if (user.job_preferences.time_zone) {
        responseMessage += `**Timezone:**\n${user.job_preferences.time_zone}\n\n`;
      }

      // Add alert schedule
      if (user.job_preferences.alert_schedule) {
        const schedule = user.job_preferences.alert_schedule;
        let scheduleDescription = '';

        // Parse cron to human-readable format
        const cronParts = schedule.split(' ');
        if (cronParts.length >= 5) {
          const hour = parseInt(cronParts[1]);
          const dayOfWeek = cronParts[4];
          const dayOfMonth = cronParts[2];

          let timeStr = '';
          if (hour === 9) {
            timeStr = '9 AM (morning)';
          } else if (hour === 14) {
            timeStr = '2 PM (afternoon)';
          } else if (hour === 18) {
            timeStr = '6 PM (evening)';
          } else {
            timeStr = `${hour}:00`;
          }

          if (dayOfWeek === '*' && dayOfMonth === '*') {
            scheduleDescription = `Daily at ${timeStr}`;
          } else if (dayOfWeek !== '*') {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = days[parseInt(dayOfWeek)] || 'Monday';
            scheduleDescription = `Weekly on ${dayName} at ${timeStr}`;
          } else if (dayOfMonth === '1') {
            scheduleDescription = `Monthly on the 1st at ${timeStr}`;
          } else {
            scheduleDescription = `Custom schedule: ${schedule}`;
          }
        }

        responseMessage += `**Alert Schedule:**\n${scheduleDescription}\n\n`;
      } else {
        responseMessage += `**Alert Schedule:**\nNot set up yet. Tell me when you'd like to receive job alerts!\n\n`;
      }

      responseMessage += `To update your preferences or schedule, just tell me what you're looking for!`;

      await whatsapp.respond(whatsAppPayload, responseMessage, accessToken);
      return;
    }

    const user = await setupFirstTimeUser(whatsAppPayload, accessToken);

    // Build initial context for new conversations or get previous response ID
    const { instructions, previousResponseId } = await buildResponseContext(user);

    // Send message to OpenAI using Responses API
    const response = await openai.responses.create({
      model: 'gpt-4o',
      instructions: instructions,
      previous_response_id: previousResponseId,
      input: message,
      tools: [
        {
          type: 'function',
          name: 'update_job_preferences',
          description: `Update user's job preferences in the database. Call this when a user expresses job preferences, requirements, search criteria, or wants to change their alert schedule. User's phone number: ${user.phone_number}`,
          parameters: {
            type: 'object',
            properties: {
              job_preference: {
                type: 'string',
                description:
                  'The detailed job preference including job title, salary range, industry, company size, or any other job-related criteria the user has mentioned.'
              },
              keywords: {
                type: 'string',
                description:
                  'Space-separated keywords for job search, extracted from the job preference (e.g., "python developer remote" or "marketing manager healthcare")'
              },
              location: {
                type: 'string',
                description:
                  'The job location preference (e.g., "New York", "San Francisco", "Remote", "London"). If not specified, omit this field.'
              },
              companies: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Array of target company names the user mentioned (e.g., ["Google", "Microsoft", "Apple"]). If none specified, omit this field.'
              },
              datePosted: {
                type: 'string',
                enum: ['anyTime', 'pastMonth', 'pastWeek', 'past24Hours'],
                description: 'How recent the job postings should be. If not specified, omit this field.'
              },
              jobType: {
                type: 'string',
                enum: ['fullTime', 'partTime', 'contract', 'internship'],
                description: 'The type of employment. If not specified, omit this field.'
              },
              onsiteRemote: {
                type: 'string',
                enum: ['onsite', 'remote', 'hybrid'],
                description: 'Work arrangement preference. If not specified, omit this field.'
              },
              alert_schedule: {
                type: 'string',
                description:
                  'Cron expression for when to send job alerts (e.g., "0 9 * * 1" for weekly Monday at 9 AM, "0 14 * * *" for daily at 2 PM). If not specified, omit this field.'
              },
              schedule_description: {
                type: 'string',
                description:
                  'Human-readable description of the alert schedule (e.g., "Weekly on Monday at 9 AM", "Daily at 2 PM"). If not specified, omit this field.'
              },
              timezone: {
                type: 'string',
                description:
                  'The timezone to use for scheduling alerts. If user specified a job location, use that location\'s timezone (e.g., "Asia/Jerusalem" for Tel Aviv, "America/New_York" for NYC). If no location or location is "remote", determine timezone from phone number (e.g., phone starting with 972 = "Asia/Jerusalem", 1 = "America/New_York"). Use IANA timezone format.'
              }
            },
            required: ['job_preference', 'keywords'],
            additionalProperties: false
          },
          strict: false
        },
        {
          type: 'web_search_preview'
        }
      ],
      temperature: 0.7,
      user: user.phone_number || `user_${user.id}` // Add user identifier for OpenAI
    });

    let aiResponse = response.output_text || '';

    // Log the response for debugging
    logger.log('OpenAI Responses API details', {
      responseId: response.id,
      status: response.status,
      hasOutput: !!response.output_text,
      outputLength: response.output?.length || 0
    });

    // Handle function calls if any - need to provide tool outputs
    const functionOutputs = [];
    if (response.output) {
      for (const output of response.output) {
        if (output.type === 'function_call' && output.name === 'update_job_preferences') {
          try {
            const functionArgs = JSON.parse(output.arguments);

            // Use AI-determined timezone or default
            const timeZone = functionArgs.timezone || 'America/New_York';

            // Prepare the data for upsert
            const updateData: Partial<Prisma.job_preferencesUpdateInput> = {
              job_preference: functionArgs.job_preference,
              keywords: functionArgs.keywords,
              time_zone: timeZone,
              updated_at: new Date()
            };

            // Add optional fields only if they were provided
            if (functionArgs.location) {
              updateData.location = functionArgs.location;
            }
            if (functionArgs.companies && functionArgs.companies.length > 0) {
              updateData.companies = functionArgs.companies;
            }
            if (functionArgs.datePosted) {
              updateData.datePosted = functionArgs.datePosted;
            }
            if (functionArgs.jobType) {
              updateData.jobType = functionArgs.jobType;
            }
            if (functionArgs.onsiteRemote) {
              updateData.onsiteRemote = functionArgs.onsiteRemote;
            }
            if (functionArgs.alert_schedule) {
              updateData.alert_schedule = functionArgs.alert_schedule;
            }

            // Upsert the job preferences (create or update the single record)
            const existingPreference = await prisma.job_preferences.findUnique({
              where: { user_id: user.id }
            });

            if (existingPreference) {
              await prisma.job_preferences.update({
                where: { user_id: user.id },
                data: updateData
              });
            } else {
              // For create, we need all required fields
              const createData: Prisma.job_preferencesCreateInput = {
                user: { connect: { id: user.id } },
                job_preference: functionArgs.job_preference,
                keywords: functionArgs.keywords,
                time_zone: timeZone,
                alert_schedule: functionArgs.alert_schedule || 'not_set', // Default value for required field
                created_at: new Date(),
                updated_at: new Date(),
                // Add optional fields if provided
                ...(functionArgs.location && { location: functionArgs.location }),
                ...(functionArgs.companies &&
                  functionArgs.companies.length > 0 && { companies: functionArgs.companies }),
                ...(functionArgs.datePosted && { datePosted: functionArgs.datePosted }),
                ...(functionArgs.jobType && { jobType: functionArgs.jobType }),
                ...(functionArgs.onsiteRemote && { onsiteRemote: functionArgs.onsiteRemote })
              };

              await prisma.job_preferences.create({
                data: createData
              });
            }

            logger.log('Job preferences updated', {
              userId: user.id,
              preferences: functionArgs
            });

            // Add function output for the API
            functionOutputs.push({
              type: 'function_call_output' as const,
              call_id: output.call_id,
              output: JSON.stringify({
                success: true,
                message: 'Job preferences have been successfully updated in the database.',
                updated_fields: Object.keys(functionArgs),
                user_id: user.id
              })
            });
          } catch (error) {
            logger.error('Error updating job preferences:', { error });

            // Add error output for the API
            functionOutputs.push({
              type: 'function_call_output' as const,
              call_id: output.call_id,
              output: JSON.stringify({
                success: false,
                message: 'Error updating job preferences. Please try again.'
              })
            });
          }
        }
      }
    }

    // If we have function outputs, make a follow-up call to provide them
    if (functionOutputs.length > 0) {
      const followUpResponse = await openai.responses.create({
        model: 'gpt-4o',
        previous_response_id: response.id,
        input: functionOutputs,
        temperature: 0.7,
        user: user.phone_number || `user_${user.id}`
      });

      aiResponse = followUpResponse.output_text || '';

      // Update the response ID to the latest one
      await prisma.users.update({
        where: { id: user.id },
        data: {
          last_response_id: followUpResponse.id,
          updated_at: new Date()
        }
      });

      logger.log('Follow-up response after function call', {
        followUpResponseId: followUpResponse.id,
        finalResponse: aiResponse
      });
    } else {
      // Update user's last response ID for conversation continuity
      await prisma.users.update({
        where: { id: user.id },
        data: {
          last_response_id: response.id,
          updated_at: new Date()
        }
      });
    }

    // Final fallback if still no response
    if (!aiResponse.trim()) {
      aiResponse = "I'm here to help you with your job search! Tell me about what kind of job you're looking for.";
    }

    // Check if we need to add guidance for missing mandatory fields
    const userWithPrefs = await prisma.users.findUnique({
      where: { id: user.id },
      include: { job_preferences: true }
    });

    const prefs = userWithPrefs?.job_preferences;
    const missingFields = [];

    if (!prefs?.job_preference) {
      missingFields.push('job preferences');
    }
    if (!prefs?.alert_schedule || prefs.alert_schedule === 'not_set') {
      missingFields.push('alert schedule');
    }

    // Add guidance message to the AI response
    if (missingFields.length > 0) {
      aiResponse += `\n\n⚠️ **Missing Required Fields:**\nPlease provide your ${missingFields.join(' and ')} to complete your profile.`;
    } else if (prefs?.job_preference && prefs?.alert_schedule && prefs.alert_schedule !== 'not_set') {
      aiResponse += `\n\n✅ **Profile Complete!**\nYou can update any preferences by just telling me what you'd like to change.`;
    }

    await whatsapp.respond(whatsAppPayload, aiResponse, accessToken);

    return;
  } catch (error) {
    logger.error('Error with webhook:', { error });
  }
}

async function buildResponseContext(user: User) {
  // Get user with preferences
  const userWithPreferences = await prisma.users.findUnique({
    where: { id: user.id },
    include: { job_preferences: true }
  });

  // Build instructions with job preferences context
  let instructions = jobyModelSettings;

  if (userWithPreferences?.job_preferences) {
    const prefs = userWithPreferences.job_preferences;
    instructions += `\n\nUSER'S CURRENT PROFILE:\n`;

    if (prefs.job_preference) {
      instructions += `- Job Preference: ${prefs.job_preference}\n`;
    }
    if (prefs.keywords) {
      instructions += `- Keywords: ${prefs.keywords}\n`;
    }
    if (prefs.location) {
      instructions += `- Location: ${prefs.location}\n`;
    }
    if (prefs.companies && prefs.companies.length > 0) {
      instructions += `- Target Companies: ${prefs.companies.join(', ')}\n`;
    }
    if (prefs.jobType) {
      instructions += `- Job Type: ${prefs.jobType}\n`;
    }
    if (prefs.onsiteRemote) {
      instructions += `- Work Style: ${prefs.onsiteRemote}\n`;
    }
    if (prefs.datePosted) {
      instructions += `- Job Posting Age: ${prefs.datePosted}\n`;
    }
    if (prefs.time_zone) {
      instructions += `- Timezone: ${prefs.time_zone}\n`;
    }
    if (prefs.alert_schedule && prefs.alert_schedule !== 'not_set') {
      instructions += `- Alert Schedule: ${prefs.alert_schedule}\n`;
    }

    // Note missing mandatory fields
    const missingFields = [];
    if (!prefs.job_preference) {
      missingFields.push('job preference');
    }
    if (!prefs.alert_schedule || prefs.alert_schedule === 'not_set') {
      missingFields.push('alert schedule');
    }

    if (missingFields.length > 0) {
      instructions += `\nMISSING REQUIRED: ${missingFields.join(', ')}\n`;
    }
  } else {
    instructions += `\n\nUSER PROFILE: New user - needs job preferences and alert schedule setup\n`;
  }

  // Return previous response ID for conversation continuity
  return {
    instructions,
    previousResponseId: user.last_response_id || undefined
  };
}

async function setupFirstTimeUser(whatsAppPayload: WhatsAppMessagePayload, accessToken: string): Promise<User> {
  const phoneNumber = whatsAppPayload.entry[0].changes[0].value.messages[0].from;
  const user = await prisma.users.findUnique({
    where: {
      phone_number: phoneNumber
    }
  });

  if (user) {
    logger.log('User already exists', { user });
    return user;
  }

  logger.log('User not found, creating new user', { phoneNumber });
  const newUser = await prisma.users.create({
    data: {
      phone_number: phoneNumber,
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  await whatsapp.respond(
    whatsAppPayload,
    "Hi! I'm Joby, an AI agent that sets up personalized WhatsApp notifications for job opportunities.\n\n" +
      '🎯 **My Purpose:**\n' +
      '• Collect your job preferences\n' +
      '• Set up your alert schedule\n' +
      '• Send you targeted job notifications via WhatsApp\n\n' +
      'By continuing, you agree to our terms and have read our privacy policy at https://whatsapp.postrix.io/privacy-policy.\n\n' +
      'To get started, tell me:\n' +
      "1. What kind of job you're looking for\n" +
      "2. When you'd like to receive job alerts\n\n" +
      'Available commands:\n' +
      '• /preferences - View your saved job preferences\n' +
      '• /reset - Clear all your data and start fresh',
    accessToken
  );
  return newUser;
}

export { jobyWebhook as default };
