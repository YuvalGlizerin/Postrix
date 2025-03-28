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

async function getCaptionsVideoUrlCreatomate(videoUrl: string, apiCreatomateKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.creatomate.com/v1/renders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiCreatomateKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        output_format: 'mp4',
        source: {
          elements: [
            {
              type: 'video',
              id: '17ca2169-786f-477f-aaea-4a2598bf24eb',
              source: videoUrl
            },
            {
              type: 'text',
              transcript_source: '17ca2169-786f-477f-aaea-4a2598bf24eb',
              transcript_maximum_length: 14,
              y: '82%',
              width: '81%',
              height: '35%',
              x_alignment: '50%',
              y_alignment: '50%',
              fill_color: '#ffffff',
              stroke_color: '#000000',
              stroke_width: '1.6 vmin',
              font_family: 'Montserrat',
              font_weight: '700',
              font_size: '9.29 vmin',
              background_color: 'rgba(216,216,216,0)',
              background_x_padding: '31%',
              background_y_padding: '17%',
              background_border_radius: '31%'
            }
          ]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create captioned video: ${await response.text()}`);
    }

    const data = await response.json();

    // The Creatomate API returns an array of renders
    // We're interested in the URL of the first render
    if (Array.isArray(data) && data.length > 0 && data[0].url) {
      const captionsUrl = data[0].url;

      // Poll until video is ready (max 2 minutes)
      let isReady = false;
      const maxAttempts = 24; // 24 attempts * 5 seconds = 2 minutes
      let attempts = 0;

      while (!isReady && attempts < maxAttempts) {
        const response = await fetch(captionsUrl, { method: 'HEAD' });
        isReady = <boolean>(response.ok && response.headers.get('content-type')?.startsWith('video/'));
        if (!isReady) {
          console.log(`Video not ready, attempt ${attempts + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          attempts++;
        }
      }

      return captionsUrl;
    } else {
      throw new Error('Invalid response from Creatomate API');
    }
  } catch (error) {
    console.error('Error in getCaptionsVideoUrlCreatomate:', error);
    throw error;
  }
}

export default {
  verifyToken,
  getMediaUrl,
  downloadMedia,
  getCaptionsVideoUrlCreatomate
};
