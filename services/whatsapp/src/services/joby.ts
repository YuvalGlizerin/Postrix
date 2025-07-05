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

// Define the function for saving job preferences
const saveJobPreferenceFunction = {
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
    required: ['job_preference']
  }
};

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

      const responseMessage = `📋 Here are your saved job preferences:\n\n${user.job_preferences.job_preference}\n\nTo update your preferences, just tell me what you're looking for!`;

      await whatsapp.respond(whatsAppPayload, responseMessage, accessToken);
      return;
    }

    const user = await setupFirstTimeUser(whatsAppPayload, accessToken);

    // Build conversation history
    const conversationHistory = await buildConversationHistory(user);

    // Send message to OpenAI and get response with conversation context and function calling
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: jobyModelSettings
        },
        ...conversationHistory,
        {
          role: 'user',
          content: message
        }
      ],
      tools: [
        {
          type: 'function',
          function: saveJobPreferenceFunction
        }
      ],
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2048,
      user: user.phone_number || `user_${user.id}` // Add user identifier for OpenAI
    });

    const assistantMessage = response.choices[0].message;
    let aiResponse = assistantMessage.content || '';

    // Log the response for debugging
    logger.log('OpenAI response details', {
      hasContent: !!assistantMessage.content,
      content: assistantMessage.content,
      hasToolCalls: !!assistantMessage.tool_calls,
      toolCallsCount: assistantMessage.tool_calls?.length || 0
    });

    // Handle function calls if any
    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.function.name === 'save_job_preference') {
          try {
            const functionArgs = JSON.parse(toolCall.function.arguments);
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

            // If there's no content but we successfully saved preferences, generate a response
            if (!aiResponse.trim()) {
              aiResponse = `✅ I've saved your job preference:\n\n"${jobPreference}"\n\nTell me more about what you're looking for or ask me anything about your job search.`;
            } else if (!aiResponse.includes('saved') && !aiResponse.includes('recorded')) {
              aiResponse += `\n\n✅ I've saved your job preference: "${jobPreference}"`;
            }
          } catch (error) {
            logger.error('Error saving job preference:', { error });
            if (!aiResponse.trim()) {
              aiResponse = 'I understood your job preference but had trouble saving it. Could you try again?';
            }
          }
        }
      }
    }

    // Final fallback if still no response
    if (!aiResponse.trim()) {
      aiResponse = "I'm here to help you with your job search! Tell me about what kind of job you're looking for.";
    }

    await whatsapp.respond(whatsAppPayload, aiResponse, accessToken);

    // Update user's last response ID and activity for conversation threading
    await prisma.users.update({
      where: { id: user.id },
      data: {
        last_response_id: response.id,
        updated_at: new Date()
      }
    });

    return;
  } catch (error) {
    logger.error('Error with webhook:', { error });
  }
}

async function buildConversationHistory(user: User) {
  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

  // Get user's job preferences for context
  const userWithPreferences = await prisma.users.findUnique({
    where: { id: user.id },
    include: { job_preferences: true }
  });

  // Add job preferences context if they exist
  if (userWithPreferences?.job_preferences?.job_preference) {
    messages.push({
      role: 'system',
      content: `User's current job preferences: ${userWithPreferences.job_preferences.job_preference}`
    });
  }

  // Add conversation continuity context if this is a returning user
  if (user.last_response_id) {
    messages.push({
      role: 'system',
      content: `This is a continuing conversation. Previous OpenAI response ID: ${user.last_response_id}. Maintain conversation context and remember what was discussed previously.`
    });
  }

  return messages;
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
      'Conversations may be reviewed for safety.\n\n' +
      'To get started, send a message like "I want to find a job as a [job title] in [location]"\n\n' +
      'Available commands:\n' +
      '• /preferences - View your saved job preferences\n' +
      '• /reset - Clear all your data and start fresh',
    accessToken
  );
  return newUser;
}

export { jobyWebhook as default };
