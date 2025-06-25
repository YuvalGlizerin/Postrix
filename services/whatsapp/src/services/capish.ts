import fs from 'fs';

import { type Request, type Response } from 'express';
import whatsapp from 'whatsapp-utils';
import creatomate from 'creatomate';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import secrets from 'secret-manager';
import fileSystem from 'file-system';
import { Logger } from 'logger';

const logger = new Logger('Whatsapp');

// Add work in progress auto response
async function capishWebhook(req: Request, res: Response) {
  try {
    res.status(200).send('Message sent successfully'); // no retries

    const accessToken = secrets.WHATSAPP_ACCESS_TOKEN;
    const phoneId = secrets.CAPISH_WHATSAPP_PHONE_ID;
    const apiVideoKey = secrets.CREATOMATE_API_KEY_TRIAL;

    // Log the incoming request body to understand its structure
    logger.log('Incoming webhook payload:', { debug: JSON.stringify(req.body, null, 2) });

    if (req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type !== 'video') {
      const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: req.body.entry[0].changes[0].value.messages[0].from,
        type: 'text',
        text: {
          body: `We only support videos. Please send a video to get it back with captions.`
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
    }

    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: req.body.entry[0].changes[0].value.messages[0].from,
        type: 'text',
        text: {
          body: `We are processing your video. It will be ready shortly with subtitles.`
        }
      })
    });

    const media = await whatsapp.getMedia(req.body, accessToken);
    if (media) {
      const videoPath = await whatsapp.downloadMedia(media, accessToken);

      const fileContent = fs.readFileSync(videoPath);
      const fileName = `video_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp4`;

      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME || 'capish-videos',
        Key: fileName,
        Body: fileContent,
        ContentType: 'video/mp4'
      };

      await fileSystem.s3Client.send(new PutObjectCommand(uploadParams));
      const s3VideoUrl = `https://${uploadParams.Bucket}.s3.amazonaws.com/${uploadParams.Key}`;
      logger.log('S3 Video URL:', { debug: { s3VideoUrl } });

      const captionsUrl = await creatomate.getCaptionsVideoUrlCreatomate(s3VideoUrl, apiVideoKey);
      logger.log(captionsUrl);

      const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: req.body.entry[0].changes[0].value.messages[0].from,
        type: 'video',
        video: {
          link: captionsUrl,
          caption: 'Here is your video with captions!'
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
    }
  } catch (error) {
    logger.error('Error with webhook:', { error });
  }
}

export { capishWebhook as default };
