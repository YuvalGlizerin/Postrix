import fs from 'fs';
import os from 'os';
import path from 'path';

import { Request, Response } from 'express';

interface WhatsAppMessagePayload {
  object: string;
  entry: Entry[];
}

interface Entry {
  id: string;
  changes: Change[];
}

interface Change {
  value: Value;
  field: string;
}

interface Value {
  messaging_product: string;
  metadata: Metadata;
  contacts: Contact[];
  messages: Message[];
}

interface Metadata {
  display_phone_number: string;
  phone_number_id: string;
}

interface Contact {
  profile: Profile;
  wa_id: string;
}

interface Profile {
  name: string;
}

interface Message {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: Text;
  video?: Video;
}

interface Text {
  body: string;
}

interface Video {
  mime_type: string;
  sha256: string;
  id: string;
}

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

/**
 * Get the media URL from the WhatsApp payload.
 * @param {WhatsAppMessagePayload} whatsappPayload The WhatsApp payload.
 * @param {string} accessToken The Facebook access token.
 * @returns The media URL.
 */
async function getMediaUrl(whatsappPayload: WhatsAppMessagePayload, accessToken: string): Promise<string | null> {
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

  const json = await response.json();
  return json.url;
}

/**
 * Downloads a video from the given URL and saves it to the specified path.
 *
 * @param {string} mediaUrl - The URL of the video to download.
 * @param {string} accessToken The Facebook access token
 * @param {string} savePath - The path to save the downloaded video.
 * @returns {Promise<string>} The path where the media was saved
 */
async function downloadMedia(mediaUrl: string, accessToken: string, savePath?: string): Promise<string> {
  console.log(`Attempting to download media from: ${mediaUrl}`);

  try {
    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status}`);
    }

    // Ensure we're getting the raw binary data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a save path if not provided
    const finalSavePath = savePath || path.join(os.tmpdir(), `whatsapp_media_${Date.now()}.mp4`);

    // Write the binary data directly to file
    fs.writeFileSync(finalSavePath, buffer);

    return finalSavePath;
  } catch (error) {
    console.error('Error in downloadMedia:', error);
    throw error;
  }
}

async function getVideoCaptionsUrl(videoPath: string, apiVideoKey: string): Promise<string> {
  const baseUrl = 'https://ws.api.video';

  try {
    // 1. Create video container with automatic transcription
    const createResponse = await fetch(`${baseUrl}/videos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiVideoKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `Caption Video ${Date.now()}`,
        transcript: true // This enables automatic caption generation
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create video: ${await createResponse.text()}`);
    }

    const { videoId } = await createResponse.json();

    // 2. Upload the video file using FormData
    const fileBuffer = fs.readFileSync(videoPath);
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: 'video/mp4' }), path.basename(videoPath));

    const uploadResponse = await fetch(`${baseUrl}/videos/${videoId}/source`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiVideoKey}`
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload video: ${errorText}`);
    }

    // 3. Wait for video processing (captions will be generated automatically)
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10-second intervals

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`${baseUrl}/videos/${videoId}/status`, {
        headers: {
          Authorization: `Bearer ${apiVideoKey}`
        }
      });

      if (statusResponse.ok) {
        const status = await statusResponse.json();
        if (status.encoding.playable) {
          return `https://embed.api.video/vod/${videoId}`;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
    }

    throw new Error('Timed out waiting for video processing');
  } catch (error) {
    console.error('Error in getVideoCaptionsUrl:', error);
    throw error;
  }
}

export default {
  verifyToken,
  getMediaUrl,
  downloadMedia,
  getVideoCaptionsUrl
};
