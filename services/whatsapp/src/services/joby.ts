import { type Request, type Response } from 'express';
import secrets from 'secret-manager';
import { Logger } from 'logger';

const logger = new Logger('Whatsapp');

// Add work in progress auto response
async function jobyWebhook(req: Request, res: Response) {
  try {
    res.status(200).send('Message sent successfully'); // no retries

    const accessToken = secrets.WHATSAPP_ACCESS_TOKEN;
    const phoneId = secrets.JOBY_WHATSAPP_PHONE_ID;

    // Log the incoming request body to understand its structure
    logger.log('Incoming webhook payload:', { debug: JSON.stringify(req.body, null, 2) });

    const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: req.body.entry[0].changes[0].value.messages[0].from,
      type: 'text',
      text: {
        body: `Work in progress`
      }
    };

    const result = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!result.ok) {
      throw new Error('Failed to send message');
    }

    return;
  } catch (error) {
    logger.error('Error with webhook:', { error });
  }
}

export { jobyWebhook as default };
