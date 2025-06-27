import { type Request, type Response } from 'express';
import secrets from 'secret-manager';
import { Logger } from 'logger';
import whatsapp from 'whatsapp-utils';

const logger = new Logger('Whatsapp');

// Add work in progress auto response
async function jobyWebhook(req: Request, res: Response) {
  try {
    res.status(200).send('Message sent successfully'); // no retries

    const accessToken = secrets.WHATSAPP_ACCESS_TOKEN;

    // Log the incoming request body to understand its structure
    logger.log('Incoming webhook payload:', { debug: JSON.stringify(req.body, null, 2) });

    const message = await whatsapp.getMessage(req.body, accessToken);

    await whatsapp.respond(req.body, `Work in progress: ${message}`, accessToken);

    return;
  } catch (error) {
    logger.error('Error with webhook:', { error });
  }
}

export { jobyWebhook as default };
