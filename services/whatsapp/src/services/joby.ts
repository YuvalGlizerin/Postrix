import { type Request, type Response } from 'express';
import secrets from 'secret-manager';
import { Logger } from 'logger';
import whatsapp, { type WhatsAppMessagePayload } from 'whatsapp-utils';
import prisma from 'joby-db';
import type { usersModel as User } from 'joby-db';

const logger = new Logger('Whatsapp');

async function jobyWebhook(req: Request, res: Response) {
  try {
    res.status(200).send('Message sent successfully'); // no retries

    const accessToken = secrets.WHATSAPP_ACCESS_TOKEN;
    const whatsAppPayload: WhatsAppMessagePayload = req.body;

    // Log the incoming request body to understand its structure
    logger.log('Incoming webhook payload:', { debug: JSON.stringify(whatsAppPayload, null, 2) });

    await setupFirstTimeUser(whatsAppPayload, accessToken);

    const message = await whatsapp.getMessage(whatsAppPayload, accessToken);

    await whatsapp.respond(whatsAppPayload, `Work in progress: ${message}`, accessToken);

    return;
  } catch (error) {
    logger.error('Error with webhook:', { error });
  }
}

async function setupFirstTimeUser(whatsAppPayload: WhatsAppMessagePayload, accessToken: string): Promise<User> {
  const phoneNumber = whatsAppPayload.entry[0].changes[0].value.metadata.display_phone_number;
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
    "You're messaging Joby, an AI assistant.\n\n" +
      'By continuing, you agree to our terms and have read our privacy policy at https://whatsapp.postrix.io/privacy-policy.\n\n' +
      'Conversations may be reviewed for safety.',
    accessToken
  );
  return newUser;
}

export { jobyWebhook as default };
