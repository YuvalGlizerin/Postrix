import fs from 'fs';
import os from 'os';
import path from 'path';

import { S3Client } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-providers';
import { Logger } from 'logger';

const logger = new Logger('FileSystem');

const s3Client = new S3Client({
  region: 'us-east-1',
  ...(process.env.IS_LOCAL_DEV === 'true' ? { credentials: fromIni() } : {})
});

/**
 * Downloads a media from the given URL and saves it to the specified path.
 *
 * @param {string} mediaUrl - The URL of the media to download.
 * @param {string} extension The file extension to use for the saved media (e.g., 'mp4', 'mov', 'ogg', ...).
 * @param {string} authorization The authorization header (optional).
 * @param {string} userAgent The user agent header (optional).
 * @param {string} savePath - The path to save the downloaded media, defaults to tmp directory.
 * @returns {Promise<string>} The path where the media was saved
 * @throws {Error} If the media download fails.
 */
async function downloadMedia(
  mediaUrl: string,
  extension: string,
  authorization?: string,
  userAgent?: string,
  savePath?: string
): Promise<string> {
  logger.log(`Attempting to download media from: ${mediaUrl}`);

  try {
    const response = await fetch(mediaUrl, {
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
        ...(userAgent ? { 'User-Agent': userAgent } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status}`);
    }

    // Ensure we're getting the raw binary data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a save path if not provided
    const finalSavePath = savePath || path.join(os.tmpdir(), `download_media_${Date.now()}.${extension}`);

    // Write the binary data directly to file
    fs.writeFileSync(finalSavePath, buffer);

    return finalSavePath;
  } catch (error) {
    logger.error('Error in downloadMedia:', { error });
    throw error;
  }
}

export default {
  s3Client,
  downloadMedia
};
