import { type Request, type Response } from 'express';
import secrets from 'secret-manager';
import { Logger } from 'logger';
import whatsapp, { type WhatsAppMessagePayload } from 'whatsapp-utils';
import prisma from 'lumo-db';
import type { usersModel as User, websitesModel as Website } from 'lumo-db';
import { streamText, tool } from 'ai';
import { z } from 'zod';

import { getModel } from '../lib/ai-providers.ts';

import { buildSystemContent } from './lumo/lumo-model-settings.ts';

const accessToken = secrets.SECRET_WHATSAPP_ACCESS_TOKEN;
const logger = new Logger('Whatsapp');

interface WebsiteCreationArgs {
  website_name: string;
  website_code: string;
}

interface ToolExecuteParams {
  website_name: string;
  website_code: string;
}

// Tool definition for website management using Vercel AI SDK format
const websiteTools = {
  save_complete_website: tool({
    description: `Save a website. Requires both website_name AND website_code. Only call this when you have generated the complete HTML.`,
    parameters: z.object({
      website_name: z
        .string()
        .min(1, 'website_name is required and cannot be empty')
        .describe(
          'REQUIRED: URL-friendly website name (e.g., "flower-business", "photography-portfolio"). Must be provided.'
        ),
      website_code: z
        .string()
        .min(100, 'website_code must be a complete HTML document with at least 100 characters')
        .describe(
          'REQUIRED: Complete HTML document with embedded CSS. Must include: DOCTYPE declaration, html/head/body tags, title, embedded CSS styles, and complete website content. Example: "<!DOCTYPE html><html><head><title>My Site</title><style>/* CSS here */</style></head><body>/* content here */</body></html>". This is mandatory - do not call without this parameter!'
        )
    }),
    execute: async (params: ToolExecuteParams) => {
      const websiteName = params.website_name;
      const websiteCode = params.website_code;

      // Validate that both parameters are actually provided and meaningful
      if (!websiteName || websiteName.trim().length === 0) {
        throw new Error('website_name parameter is required and cannot be empty');
      }

      if (!websiteCode || websiteCode.trim().length < 100) {
        throw new Error(
          'website_code parameter is required and must be a complete HTML document (at least 100 characters)'
        );
      }

      return {
        success: true,
        websiteName,
        websiteCodeLength: websiteCode.length,
        message: `Website "${websiteName}" ready to be created/updated with ${websiteCode.length} characters of code`
      };
    }
  })
};

async function lumoWebhook(req: Request, res: Response) {
  try {
    res.status(200).send('Message sent successfully'); // no retries
    const whatsAppPayload: WhatsAppMessagePayload = req.body;
    logger.log('Lumo whatsapp webhook payload:', {
      debug: { headers: req.rawHeaders, body: whatsAppPayload, json: JSON.stringify(whatsAppPayload, null, 2) }
    });

    const user = await setupFirstTimeUser(whatsAppPayload, accessToken);
    const message = await whatsapp.getMessage(whatsAppPayload, accessToken);

    logger.log('Lumo message received:', { message });
    const phoneNumber = whatsAppPayload.entry[0].changes[0].value.messages[0].from;
    if (phoneNumber !== '972544686188' && phoneNumber !== '972526269826') {
      await whatsapp.respond(
        whatsAppPayload,
        'Lumo is currently unavailable. We will update you once it is live!',
        accessToken
      );
      return;
    }
    if (phoneNumber === '972544686188' || phoneNumber === '972526269826') {
      await whatsapp.respond(whatsAppPayload, 'Olma!', accessToken);
      return;
    }

    // Handle reset command
    if (message.trim().toLowerCase() === '/reset') {
      await handleResetCommand(user, whatsAppPayload, accessToken);
      return;
    }

    // Check if user has an existing website
    const existingWebsite = await prisma.websites.findUnique({
      where: { user_id: user.id }
    });

    // Get the AI model (can be configured via environment variable)
    const model = getModel(process.env.AI_MODEL);

    // Build conversation history
    const messages = [
      {
        role: 'system' as const,
        content: buildSystemContent(existingWebsite)
      },
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Stream AI response and handle trigger sentence detection
    const stream = await streamText({
      model,
      messages,
      tools: websiteTools,
      toolChoice: 'auto',
      temperature: 0.7,
      maxTokens: 12000
    });

    const TRIGGER_SENTENCE = 'BUILDING_WEBSITE_NOW';
    let fullResponse = '';
    let acknowledgmentSent = false;
    let toolCalls: ToolCall[] = [];

    // Process the stream
    for await (const chunk of stream.textStream) {
      fullResponse += chunk;

      // Check for trigger sentence in early chunks (only if not already sent)
      if (!acknowledgmentSent && fullResponse.includes(TRIGGER_SENTENCE)) {
        // Send acknowledgment message
        await whatsapp.respond(
          whatsAppPayload,
          'I am building your website now. This may take a moment...',
          accessToken
        );
        acknowledgmentSent = true;
        logger.log('Website building acknowledgment sent', { userId: user.id });
      }
    }

    // Wait for final result to get tool calls
    toolCalls = await stream.toolCalls;

    // Remove trigger sentence from response if present
    fullResponse = fullResponse.replace(TRIGGER_SENTENCE, '').trim();

    // Check if AI wants to call a tool
    if (toolCalls && toolCalls.length > 0) {
      logger.log('AI tool calls detected:', {
        toolCallsCount: toolCalls.length,
        toolCalls: toolCalls.map(tc => {
          const args = tc.args as WebsiteCreationArgs;
          return {
            toolName: tc.toolName,
            hasWebsiteName: !!args?.website_name,
            hasWebsiteCode: !!args?.website_code,
            websiteNameLength: (args?.website_name || '').length,
            websiteCodeLength: (args?.website_code || '').length,
            args: tc.args
          };
        })
      });
      await handleToolCalls(toolCalls, user, whatsAppPayload, accessToken);
    } else {
      // Regular response without tool call
      const reply =
        fullResponse || "I'm here to help you build a website. Describe what you'd like your website to look like!";
      await whatsapp.respond(whatsAppPayload, reply, accessToken);
    }

    // Update user's last_response_id for conversation threading if available
    const responseMetadata = await stream.response;
    const responseId = responseMetadata?.id || responseMetadata?.headers?.['x-request-id'];
    if (responseId) {
      await prisma.users.update({
        where: { id: user.id },
        data: { last_response_id: responseId, updated_at: new Date() }
      });
    }
  } catch (error) {
    logger.error('Error in lumoWebhook:', { error });

    // Send user a friendly error message
    await whatsapp.respond(
      req.body,
      'Sorry, I encountered an error while processing your request. Please try again or contact support if the issue persists.',
      accessToken
    );
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

interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: WebsiteCreationArgs;
}

async function handleToolCalls(
  toolCalls: ToolCall[],
  user: User,
  whatsAppPayload: WhatsAppMessagePayload,
  accessToken: string
) {
  for (const toolCall of toolCalls) {
    if (toolCall.toolName === 'save_complete_website') {
      try {
        const args = toolCall.args;

        // Validate that both required parameters are present
        if (!args.website_name || !args.website_code) {
          logger.error('Tool call missing required parameters:', {
            hasWebsiteName: !!args.website_name,
            hasWebsiteCode: !!args.website_code,
            args
          });

          await whatsapp.respond(
            whatsAppPayload,
            "I need more details to create your website. Please describe what kind of website you want and I'll build it for you!",
            accessToken
          );
          continue;
        }

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
          `You can view it at: ${process.env.WEBSITE_URL}/website/${website.id}\n\n`;

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

  // await whatsapp.respond(
  //   whatsAppPayload,
  //   "Hi! I'm Lumo, an AI agent that helps you build a website.\n\n" +
  //     'By continuing, you agree to our terms and have read our privacy policy at https://whatsapp.postrix.io/privacy-policy.\n\n' +
  //     'To get started, tell me:\n' +
  //     '1. What kind of website you want to build\n' +
  //     "2. What content or features you'd like it to have\n\n" +
  //     'Available commands:\n' +
  //     '• /reset - Clear all your data and start fresh',
  //   accessToken
  // );
  return newUser;
}

export { lumoWebhook as default };
