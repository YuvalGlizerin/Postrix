import fs from 'fs';

import fileSystem from 'file-system';
import type { Request, Response } from 'express';
import { Logger } from 'logger';
import OpenAI from 'openai';
import secrets from 'secret-manager';

import type { WhatsAppMessagePayload, WhatsAppMediaJson, WhatsAppMessageResult } from './types.ts';

const logger = new Logger('Whatsapp');
const openai = new OpenAI({
  apiKey: secrets.OPENAI_TOKEN
});

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
    logger.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    logger.error('Failed to verify token');
    res.sendStatus(403);
  }
}

/**
 * Get the message from the WhatsApp payload.
 * @param {WhatsAppMessagePayload} whatsappPayload The WhatsApp payload.
 * @param {string} accessToken The Facebook access token.
 * @param {boolean} transcribeAudio Whether to transcribe the audio message.
 * @returns {Promise<string>} The message.
 */
async function getMessage(
  whatsappPayload: WhatsAppMessagePayload,
  accessToken: string,
  transcribeAudio: boolean = true
): Promise<string> {
  const messageObj = whatsappPayload.entry[0].changes[0].value.messages[0];
  if (messageObj.type === 'audio' && transcribeAudio && messageObj.audio) {
    const media: WhatsAppMediaJson = await getMedia(messageObj.audio?.id, accessToken);
    const tempPath = await downloadMedia(media, accessToken);

    // Transcribe using OpenAI
    const audioStream = fs.createReadStream(tempPath);
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      response_format: 'text',
      language: 'en'
    });
    return transcription;
  }
  // Default to text message
  return messageObj.text?.body || '';
}

/**
 * Responds to a whatsapp message.
 * @param {WhatsAppMessagePayload} whatsappPayload The WhatsApp payload.
 * @param {string} message The message to send.
 * @param {string} accessToken The Facebook access token.
 *
 * @returns {Promise<any>} The response from the WhatsApp API.
 */
async function respond(
  whatsappPayload: WhatsAppMessagePayload,
  message: string,
  accessToken: string
): Promise<WhatsAppMessageResult> {
  const fromPhoneId = whatsappPayload.entry[0].changes[0].value.messages[0].from;
  const toPhoneId = whatsappPayload.entry[0].changes[0].value.metadata.phone_number_id;
  return sendMessage(fromPhoneId, toPhoneId, message, accessToken);
}

/**
 * Sends a message to a whatsapp user.
 * @param {string} toPhoneId The WhatsApp phone number ID of the recipient.
 * @param {string} fromPhoneId The WhatsApp phone number ID of the sender.
 * @param {string} message The message to send.
 * @param {string} accessToken The Facebook access token.
 * @returns {Promise<WhatsAppMessageResult>} The response from the WhatsApp API.
 */
async function sendMessage(
  toPhoneId: string,
  fromPhoneId: string,
  message: string,
  accessToken: string
): Promise<WhatsAppMessageResult> {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhoneId,
    type: 'text',
    text: {
      body: message
    }
  };
  const url = `https://graph.facebook.com/v22.0/${fromPhoneId}/messages`;

  const result = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!result.ok) {
    throw new Error(`Failed to send message: ${result.statusText}`);
  }

  const json: WhatsAppMessageResult = await result.json();
  return json;
}

/**
 * Get the media URL from the WhatsApp payload.
 * @param {string} mediaId The WhatsApp payload.
 * @param {string} accessToken The Facebook access token.
 * @returns {Promise<WhatsAppMediaJson | null>} The media object, or null if failed to download media.
 */
async function getMedia(mediaId: string, accessToken: string): Promise<WhatsAppMediaJson> {
  const response = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
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
  logger.log(`Attempting to download media from: ${media.url}`);
  const extension = media.mime_type.split('/').pop() || '';

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
  downloadMedia,
  respond,
  getMessage,
  sendMessage
};
