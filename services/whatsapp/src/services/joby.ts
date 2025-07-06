import { type Request, type Response } from 'express';
import secrets from 'secret-manager';
import { Logger } from 'logger';
import whatsapp, { type WhatsAppMessagePayload } from 'whatsapp-utils';
import prisma from 'joby-db';
import type { usersModel as User } from 'joby-db';
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
    logger.log('Incoming webhook payload:', { debug: JSON.stringify(whatsAppPayload, null, 2) });

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
          name: 'save_job_preference',
          description:
            "Save a user's job preference to the database. Call this when a user expresses a job preference, requirement, or search criteria.",
          parameters: {
            type: 'object',
            properties: {
              job_preference: {
                type: 'string',
                description:
                  'The detailed job preference including job title, location, salary range, industry, company size, remote/hybrid preferences, or any other job-related criteria the user has mentioned.'
              }
            },
            required: ['job_preference'],
            additionalProperties: false
          },
          strict: true
        },
        {
          type: 'function',
          name: 'save_alert_schedule',
          description: 'Save when the user wants to receive job alerts. Convert their preferences to cron syntax.',
          parameters: {
            type: 'object',
            properties: {
              cron_expression: {
                type: 'string',
                description:
                  'The generated cron expression (e.g., "0 9 * * 1" for weekly Monday at 9 AM, "0 14 * * *" for daily at 2 PM, "0 18 1 * *" for monthly on 1st at 6 PM)'
              },
              description: {
                type: 'string',
                description:
                  'Human-readable description of the schedule (e.g., "Weekly on Monday at 9 AM", "Daily at 2 PM", "Monthly on 1st at 6 PM")'
              }
            },
            required: ['cron_expression', 'description'],
            additionalProperties: false
          },
          strict: true
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
        if (output.type === 'function_call' && output.name === 'save_job_preference') {
          try {
            const functionArgs = JSON.parse(output.arguments);
            const jobPreference = functionArgs.job_preference;

            // Upsert the job preference (create or update the single record)
            const existingPreference = await prisma.job_preferences.findUnique({
              where: { user_id: user.id }
            });

            if (existingPreference) {
              await prisma.job_preferences.update({
                where: { user_id: user.id },
                data: {
                  job_preference: jobPreference,
                  updated_at: new Date()
                }
              });
            } else {
              await prisma.job_preferences.create({
                data: {
                  user_id: user.id,
                  job_preference: jobPreference,
                  created_at: new Date(),
                  updated_at: new Date()
                }
              });
            }

            logger.log('Job preference saved/updated', {
              userId: user.id,
              preference: jobPreference
            });

            // Add function output for the API
            functionOutputs.push({
              type: 'function_call_output' as const,
              call_id: output.call_id,
              output: JSON.stringify({
                success: true,
                message: `Use this exact format with line breaks: ✅ I've saved your job preference:\n\n"${jobPreference}"\n\n[Add encouraging follow-up message]`
              })
            });
          } catch (error) {
            logger.error('Error saving job preference:', { error });

            // Add error output for the API
            functionOutputs.push({
              type: 'function_call_output' as const,
              call_id: output.call_id,
              output: JSON.stringify({
                success: false,
                message: 'Error saving job preference. Please try again.'
              })
            });
          }
        }

        if (output.type === 'function_call' && output.name === 'save_alert_schedule') {
          try {
            const functionArgs = JSON.parse(output.arguments);
            const cronExpression = functionArgs.cron_expression;
            const scheduleDescription = functionArgs.description;

            // Upsert the alert schedule (create or update the single record)
            const existingPreference = await prisma.job_preferences.findUnique({
              where: { user_id: user.id }
            });

            if (existingPreference) {
              await prisma.job_preferences.update({
                where: { user_id: user.id },
                data: {
                  alert_schedule: cronExpression,
                  updated_at: new Date()
                }
              });
            } else {
              await prisma.job_preferences.create({
                data: {
                  user_id: user.id,
                  alert_schedule: cronExpression,
                  created_at: new Date(),
                  updated_at: new Date()
                }
              });
            }

            logger.log('Alert schedule saved/updated', {
              userId: user.id,
              schedule: cronExpression,
              description: scheduleDescription
            });

            // Add function output for the API
            functionOutputs.push({
              type: 'function_call_output' as const,
              call_id: output.call_id,
              output: JSON.stringify({
                success: true,
                message: `✅ Perfect! I've scheduled ${scheduleDescription.toLowerCase()} job alerts for you.\n\nYou'll receive job updates based on your preferences. You can always change this schedule by telling me your new preference!`
              })
            });
          } catch (error) {
            logger.error('Error saving alert schedule:', { error });

            // Add error output for the API
            functionOutputs.push({
              type: 'function_call_output' as const,
              call_id: output.call_id,
              output: JSON.stringify({
                success: false,
                message: 'Error saving alert schedule. Please try again.'
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

  if (userWithPreferences?.job_preferences?.job_preference) {
    instructions += `\n\nUSER'S CURRENT JOB PREFERENCES: ${userWithPreferences.job_preferences.job_preference}`;
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
    "You're messaging Joby, an AI job finder assistant.\n" +
      'By continuing, you agree to our terms and have read our privacy policy at https://whatsapp.postrix.io/privacy-policy.\n' +
      'To get started, send a message like "I want to find a job as a [job title] in [location]"\n\n' +
      'Available commands:\n' +
      '• /preferences - View your saved job preferences\n' +
      '• /reset - Clear all your data and start fresh',
    accessToken
  );
  return newUser;
}

export { jobyWebhook as default };
