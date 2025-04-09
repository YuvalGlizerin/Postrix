import fileSystem from 'file-system';
import { type Request, type Response } from 'express';

import type { WhatsAppMessagePayload, WhatsAppMediaJson } from './types.ts';

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
    console.error('Failed to verify token');
    res.sendStatus(403);
  }
}

/**
 * Get the media URL from the WhatsApp payload.
 * @param {WhatsAppMessagePayload} whatsappPayload The WhatsApp payload.
 * @param {string} accessToken The Facebook access token.
 * @returns {Promise<WhatsAppMediaJson | null>} The media object, or null if failed to download media.
 */
async function getMedia(
  whatsappPayload: WhatsAppMessagePayload,
  accessToken: string
): Promise<WhatsAppMediaJson | null> {
  const message = whatsappPayload.entry[0].changes[0].value.messages[0];
  if (message.type !== 'video') {
    return null;
  }

  const response = await fetch(`https://graph.facebook.com/v22.0/${message.video?.id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const json: WhatsAppMediaJson = await response.json();
  return json;
}

/**
 * Downloads a whatsapp video from the given URL and saves it to the specified path.
 *
 * @param {WhatsAppMediaJson} media - The media object of the video to download.
 * @param {string} accessToken The Facebook access token
 * @param {string} savePath - The path to save the downloaded video, defaults to tmp directory.
 * @returns {Promise<string>} The path where the media was saved
 * @throws {Error} If the media type is not supported or if the download fails.
 */
async function downloadMedia(media: WhatsAppMediaJson, accessToken: string, savePath?: string): Promise<string> {
  console.log(`Attempting to download media from: ${media.url}`);
  const extension = media.mime_type.split('/').pop() || '';

  if (extension !== 'mp4' && extension !== 'mov') {
    throw new Error(`Unsupported media type: ${extension}. Only mp4 and mov are supported.`);
  }

  return fileSystem.downloadMedia(
    media.url,
    extension,
    `Bearer ${accessToken}`,
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    savePath
  );
}

export default {
  verifyToken,
  getMedia,
  downloadMedia
};
