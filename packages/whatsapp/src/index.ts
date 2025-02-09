import { type Request, type Response } from 'express';

/**
 * Verifies the whatsapp webhook verification token.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {string} verificationToken - The verification token to verify against.
 *
 * @description This function checks if the webhook verification token is valid.
 * If the token is valid, it sends a 200 response with the challenge.
 * If the token is invalid, it sends a 403 response.
 */
function verifyToken(req: Request, res: Response, verificationToken: string) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verificationToken) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.error('Failed webhook verification');
    res.sendStatus(403);
  }
}

export default {
  verifyToken
};
