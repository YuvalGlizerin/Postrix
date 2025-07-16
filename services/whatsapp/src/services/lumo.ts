import { type Request, type Response } from 'express';
import secrets from 'secret-manager';
import { Logger } from 'logger';
import whatsapp, { type WhatsAppMessagePayload } from 'whatsapp-utils';
import prisma from 'lumo-db';
import type { usersModel as User, websitesModel as Website } from 'lumo-db';
import OpenAI from 'openai';

import { lumoModelSettings } from './lumo/lumo-model-settings.ts';

const accessToken = secrets.WHATSAPP_ACCESS_TOKEN;
const logger = new Logger('Whatsapp');

const openai = new OpenAI({
  apiKey: secrets.OPENAI_TOKEN
});

// Types for function calling
interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface WebsiteCreationArgs {
  website_name: string;
  website_code: string;
}

// Tool definition for website management
const websiteTools = [
  {
    type: 'function' as const,
    function: {
      name: 'create_or_update_website',
      description:
        "ALWAYS create or update a user's website whenever they mention wanting a website, even with minimal details. Create a basic website first, then iterate based on feedback.",
      parameters: {
        type: 'object',
        properties: {
          website_name: {
            type: 'string',
            description:
              'A short, URL-friendly name for the website. If not specified, create one based on the business type (e.g., "flower-business", "photography-portfolio")'
          },
          website_code: {
            type: 'string',
            description:
              'Complete HTML code for the website. Create a professional-looking website even with minimal details. Include modern CSS styling, responsive design, and placeholder content that can be updated later.'
          }
        },
        required: ['website_name', 'website_code']
      }
    }
  }
];

async function lumoWebhook(req: Request, res: Response) {
  try {
    res.status(200).send('Message sent successfully'); // no retries
    const whatsAppPayload: WhatsAppMessagePayload = req.body;
    logger.log('Lumo whatsapp webhook payload:', {
      debug: { headers: req.rawHeaders, body: whatsAppPayload }
    });

    const user = await setupFirstTimeUser(whatsAppPayload, accessToken);
    const message = await whatsapp.getMessage(whatsAppPayload, accessToken);

    // Handle reset command
    if (message.trim().toLowerCase() === '/reset') {
      await handleResetCommand(user, whatsAppPayload, accessToken);
      return;
    }

    // Build conversation history
    const messages = [
      {
        role: 'system' as const,
        content: `${lumoModelSettings}

IMPORTANT: When a user mentions wanting a website, ALWAYS call the create_or_update_website function immediately, even with minimal details. Create a professional basic website first, then ask follow-up questions to improve it. Don't just ask questions - take action by building something they can see right away.

Examples:
- "I want a website for my flower business" → CREATE a basic flower business website immediately with placeholder content
- "I need a portfolio site" → CREATE a basic portfolio website immediately 
- "Can you build me a website?" → CREATE a basic website and ask what type of business/purpose

Always build first, then iterate based on feedback.`
      },
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Send message to OpenAI with tools
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages,
      tools: websiteTools,
      tool_choice: 'auto',
      temperature: 0.7,
      user: user.phone_number || undefined
    });

    const responseMessage = response.choices[0].message;

    // Check if OpenAI wants to call a tool
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      await handleToolCalls(responseMessage.tool_calls, user, whatsAppPayload, accessToken, responseMessage.content);
    } else {
      // Regular response without tool call
      const reply =
        responseMessage.content ||
        "I'm here to help you build a website. Describe what you'd like your website to look like!";
      await whatsapp.respond(whatsAppPayload, reply, accessToken);
    }

    // Update user's last_response_id for conversation threading if available
    if (response.id) {
      await prisma.users.update({
        where: { id: user.id },
        data: { last_response_id: response.id, updated_at: new Date() }
      });
    }
  } catch (error) {
    logger.error('Error in lumoWebhook:', { error });
    res.status(500).send('Internal server error');
  }
}

async function handleResetCommand(user: User, whatsAppPayload: WhatsAppMessagePayload, accessToken: string) {
  try {
    // Delete user's website if it exists
    const existingWebsite = await prisma.websites.findUnique({
      where: { user_id: user.id }
    });

    if (existingWebsite) {
      await prisma.websites.delete({
        where: { user_id: user.id }
      });
      logger.log('Deleted website for user:', { userId: user.id, websiteId: existingWebsite.id });
    }

    // Reset user's conversation history
    await prisma.users.update({
      where: { id: user.id },
      data: {
        last_response_id: null,
        updated_at: new Date()
      }
    });

    logger.log('Reset user data:', { userId: user.id });

    await whatsapp.respond(
      whatsAppPayload,
      '🔄 Your data has been reset successfully!\n\n' +
        'All your website data and conversation history have been cleared.\n\n' +
        "You can now start fresh. Tell me what kind of website you'd like to build!",
      accessToken
    );
  } catch (error) {
    logger.error('Error handling reset command:', { error });
    await whatsapp.respond(
      whatsAppPayload,
      'Sorry, there was an error resetting your data. Please try again.',
      accessToken
    );
  }
}

async function handleToolCalls(
  toolCalls: ToolCall[],
  user: User,
  whatsAppPayload: WhatsAppMessagePayload,
  accessToken: string,
  previousMessageContent: string | null
) {
  for (const toolCall of toolCalls) {
    if (toolCall.function.name === 'create_or_update_website') {
      try {
        const args: WebsiteCreationArgs = JSON.parse(toolCall.function.arguments);
        const websiteName = args.website_name;
        const websiteCode = args.website_code;

        // Check if user already has a website
        const existingWebsite = await prisma.websites.findUnique({
          where: { user_id: user.id }
        });

        let website: Website;
        if (existingWebsite) {
          // Update existing website
          website = await prisma.websites.update({
            where: { user_id: user.id },
            data: {
              website_name: websiteName,
              website_code: websiteCode,
              updated_at: new Date()
            }
          });
          logger.log('Updated website for user:', { userId: user.id, websiteId: website.id });
        } else {
          // Create new website
          website = await prisma.websites.create({
            data: {
              user_id: user.id,
              website_name: websiteName,
              website_code: websiteCode,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
          logger.log('Created new website for user:', { userId: user.id, websiteId: website.id });
        }

        // Combine confirmation message with AI's follow-up questions
        let fullMessage =
          `✅ Your website has been ${existingWebsite ? 'updated' : 'created'} successfully!\n\n` +
          `You can view it at: https://whatsapp.postrix.io/website/${website.id}\n\n` +
          `Website name: ${websiteName}\n\n`;

        // Add AI's follow-up questions if they exist
        if (previousMessageContent && previousMessageContent.trim()) {
          fullMessage += `${previousMessageContent}\n\n`;
        }

        fullMessage += `You can continue to describe changes you'd like to make, or ask me to build additional features!`;

        await whatsapp.respond(whatsAppPayload, fullMessage, accessToken);
      } catch (error) {
        logger.error('Error handling website tool call:', { error });
        await whatsapp.respond(
          whatsAppPayload,
          'Sorry, there was an error creating/updating your website. Please try again.',
          accessToken
        );
      }
    }
  }
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
    "Hi! I'm Lumo, an AI agent that helps you build a website.\n\n" +
      'By continuing, you agree to our terms and have read our privacy policy at https://whatsapp.postrix.io/privacy-policy.\n\n' +
      'To get started, tell me:\n' +
      '1. What kind of website you want to build\n' +
      "2. What content or features you'd like it to have\n\n" +
      'Available commands:\n' +
      '• /reset - Clear all your data and start fresh',
    accessToken
  );
  return newUser;
}

export { lumoWebhook as default };
