#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Real-time YouTube Live Stream Audio Transcription
 * Streams audio from YouTube and transcribes it in real-time using Whisper.
 */

import { spawn, ChildProcess } from 'child_process';
import { existsSync, unlinkSync, statSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const videoUrl = 'https://www.youtube.com/watch?v=r2fqxxR_WDQ';

interface ChunkInfo {
  file: string;
  index: number;
}

/**
 * Get the direct audio stream URL from YouTube using yt-dlp
 */
async function getAudioStreamUrl(videoUrl: string): Promise<string | null> {
  try {
    const ytdlArgs = [
      '--format',
      'bestaudio/best',
      '--quiet',
      '--no-warnings',
      '--extractor-args',
      'youtube:player_client=default',
      '--get-url',
      videoUrl
    ];

    return new Promise((resolve, reject) => {
      const ytdl = spawn('yt-dlp', ytdlArgs);
      let stdout = '';
      let stderr = '';

      ytdl.stdout.on('data', data => {
        stdout += data.toString();
      });

      ytdl.stderr.on('data', data => {
        stderr += data.toString();
      });

      ytdl.on('close', code => {
        if (code === 0) {
          const url = stdout.trim();
          resolve(url || null);
        } else {
          console.error(`Error getting audio stream URL: ${stderr}`);
          reject(new Error(`yt-dlp exited with code ${code}`));
        }
      });

      ytdl.on('error', error => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.error('Error: yt-dlp is not installed. Please install it with:');
          console.error('  pip install yt-dlp');
        }
        reject(error);
      });
    });
  } catch (error) {
    console.error(`Error getting audio stream URL: ${error}`);
    return null;
  }
}

/**
 * Transcribe an audio file chunk using Whisper
 */
async function transcribeAudioChunk(model: string, audioFile: string): Promise<string | null> {
  try {
    if (!existsSync(audioFile) || statSync(audioFile).size === 0) {
      return null;
    }

    return new Promise(resolve => {
      const whisper = spawn('whisper', [
        audioFile,
        '--model',
        model,
        '--language',
        'en',
        '--fp16',
        'False',
        '--output_format',
        'txt',
        '--output_dir',
        '/tmp'
      ]);

      let stderr = '';

      whisper.stderr.on('data', data => {
        stderr += data.toString();
      });

      whisper.on('close', code => {
        if (code === 0) {
          // Whisper outputs to a .txt file with the same name as the input
          const txtFile = audioFile.replace(/\.(wav|mp3|m4a)$/i, '.txt');
          try {
            if (existsSync(txtFile)) {
              const text = readFileSync(txtFile, 'utf-8').trim();
              // Clean up the txt file
              unlinkSync(txtFile);
              resolve(text || null);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        } else {
          if (stderr.includes('not found') || stderr.includes('command not found')) {
            console.error('Error: openai-whisper is not installed or not accessible.');
            console.error('\nPlease install it with:');
            console.error('  python3 -m pip install openai-whisper');
            console.error('or');
            console.error('  pip3 install openai-whisper');
            console.error('\nFor faster real-time transcription, you can also use:');
            console.error('  pip install faster-whisper');
          }
          resolve(null);
        }
      });

      whisper.on('error', () => {
        console.error('Error: whisper command not found. Please install openai-whisper.');
        resolve(null);
      });
    });
  } catch (error) {
    console.error(`Error transcribing audio: ${error}`);
    return null;
  }
}

/**
 * Stream audio continuously and transcribe in overlapping chunks
 */
async function processAudioStreamSimple(
  model: string,
  audioUrlParam: string,
  videoUrl: string,
  chunkDuration: number = 15,
  maxInactivitySeconds: number = 60
): Promise<void> {
  let audioUrl = audioUrlParam;
  console.log(`\n${'='.repeat(60)}`);
  console.log('REAL-TIME TRANSCRIPTION');
  console.log('='.repeat(60));
  console.log('Streaming audio and transcribing in real-time...\n');
  console.log('Note: There will be a delay of ~10-15 seconds for processing.\n');

  const seenTexts = new Set<string>();
  const transcriptionQueue: ChunkInfo[] = [];
  let isProcessing = true;
  let ffmpegProcess: ChildProcess | null = null;
  let streamRestartCount = 0;
  const maxRestarts = 5;
  let lastChunkTime = Date.now();

  // Worker function to process transcription queue
  const processTranscriptionQueue = async () => {
    while (isProcessing || transcriptionQueue.length > 0) {
      if (transcriptionQueue.length > 0) {
        const chunkInfo = transcriptionQueue.shift();
        if (chunkInfo) {
          try {
            const text = await transcribeAudioChunk(model, chunkInfo.file);
            if (text && !seenTexts.has(text)) {
              const timestamp = new Date().toLocaleTimeString();
              console.log(`[${timestamp}] ${text}`);
              seenTexts.add(text);
            }
          } catch {
            // Ignore transcription errors
          } finally {
            // Clean up chunk file
            if (existsSync(chunkInfo.file)) {
              try {
                unlinkSync(chunkInfo.file);
              } catch {
                // Ignore cleanup errors
              }
            }
          }
        }
      } else {
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  // Start transcription worker
  const workerPromise = processTranscriptionQueue();

  const monitorFfmpegStderr = (stderr: NodeJS.ReadableStream) => {
    const ignorePatterns = [
      'keepalive request failed',
      'cannot reuse http connection for different host',
      'retrying with new connection',
      'http error',
      'http/1.1 403'
    ];

    let buffer = '';
    stderr.on('data', (data: Buffer) => {
      buffer += data.toString('utf-8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const lineStr = line.trim();
        if (!lineStr) {
          continue;
        }

        const shouldIgnore = ignorePatterns.some(pattern => lineStr.toLowerCase().includes(pattern));

        if (!shouldIgnore) {
          if (['error', 'failed', 'timeout'].some(keyword => lineStr.toLowerCase().includes(keyword))) {
            if (!lineStr.toLowerCase().includes('keepalive') && !lineStr.toLowerCase().includes('cannot reuse')) {
              console.error(`[FFmpeg] ${lineStr}`);
            }
          }
        }
      }
    });
  };

  try {
    while (streamRestartCount < maxRestarts) {
      const tmpdirPath = join(tmpdir(), `whisper-chunks-${Date.now()}`);
      mkdirSync(tmpdirPath, { recursive: true });

      const chunkFilePattern = join(tmpdirPath, 'chunk_%03d.wav');

      const cmd = [
        'ffmpeg',
        '-loglevel',
        'warning',
        '-i',
        audioUrl,
        '-f',
        'segment',
        '-segment_time',
        chunkDuration.toString(),
        '-segment_format',
        'wav',
        '-ar',
        '16000',
        '-ac',
        '1',
        '-reset_timestamps',
        '1',
        '-reconnect',
        '1',
        '-reconnect_at_eof',
        '1',
        '-reconnect_streamed',
        '1',
        '-reconnect_delay_max',
        '5',
        '-timeout',
        '10000000',
        '-y',
        chunkFilePattern
      ];

      console.log(`Starting ffmpeg stream (attempt ${streamRestartCount + 1}/${maxRestarts})...`);
      console.log(`Monitoring chunks in: ${tmpdirPath}`);

      ffmpegProcess = spawn(cmd[0], cmd.slice(1), {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Check if process started successfully
      if (!ffmpegProcess.pid) {
        console.error('[Error] Failed to start ffmpeg process');
        streamRestartCount++;
        continue;
      }

      console.log(`[Monitor] FFmpeg process started (PID: ${ffmpegProcess.pid})`);

      monitorFfmpegStderr(ffmpegProcess.stderr!);

      let chunkNum = 0;
      const processedChunks = new Set<string>();
      lastChunkTime = Date.now();
      let processEnded = false;

      // Monitor for new chunk files in a continuous loop
      let processStatus: number | null = null;

      // Set up exit handler
      ffmpegProcess.on('exit', code => {
        processStatus = code ?? null;
        processEnded = true;
      });

      // Monitor continuously for chunks
      let loopIteration = 0;
      while (true) {
        loopIteration++;
        // Log every 10 iterations (every 10 seconds) to show we're alive
        if (loopIteration % 10 === 0) {
          console.log(
            `[Monitor] Still monitoring... (iteration ${loopIteration}, checking for chunks ${chunkNum - 2} to ${chunkNum + 15})`
          );
        }

        // Check for new chunk files
        let foundNewChunk = false;

        // Check current and next chunks
        for (let i = Math.max(0, chunkNum - 2); i < chunkNum + 15; i++) {
          const chunkFile = join(tmpdirPath, `chunk_${i.toString().padStart(3, '0')}.wav`);
          if (existsSync(chunkFile) && !processedChunks.has(chunkFile)) {
            // Wait a bit to ensure file is fully written
            await new Promise(resolve => setTimeout(resolve, 500));
            if (statSync(chunkFile).size > 0) {
              processedChunks.add(chunkFile);
              transcriptionQueue.push({ file: chunkFile, index: i });
              chunkNum = Math.max(chunkNum, i + 1);
              lastChunkTime = Date.now();
              foundNewChunk = true;
              console.log(`[Monitor] Found new chunk: ${chunkFile} (chunk ${i})`);
            }
          }
        }

        // Also check if any files exist at all in the directory (for debugging)
        if (loopIteration === 5) {
          try {
            const files = readdirSync(tmpdirPath);
            if (files.length > 0) {
              console.log(
                `[Monitor] Found ${files.length} files in temp directory: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`
              );
            } else {
              console.log(`[Monitor] No files found in temp directory yet. FFmpeg may still be starting...`);
            }
          } catch {
            // Ignore errors reading directory
          }
        }

        // Check if process is still running (exitCode is null if still running)
        if (processStatus !== null || ffmpegProcess.exitCode !== null) {
          processStatus = ffmpegProcess.exitCode;
          // Process ended
          if (processStatus !== 0) {
            console.log(`\n[Warning] FFmpeg process ended with status ${processStatus}`);
          }

          // Process any remaining chunks
          await new Promise(resolve => setTimeout(resolve, 2000));
          for (let i = Math.max(0, chunkNum - 2); i < chunkNum + 10; i++) {
            const chunkFile = join(tmpdirPath, `chunk_${i.toString().padStart(3, '0')}.wav`);
            if (existsSync(chunkFile) && !processedChunks.has(chunkFile)) {
              if (statSync(chunkFile).size > 0) {
                processedChunks.add(chunkFile);
                transcriptionQueue.push({ file: chunkFile, index: i });
              }
            }
          }

          // If process ended unexpectedly, try to restart
          if (processStatus !== 0) {
            console.log('\n[Info] Attempting to reconnect to stream...');
            streamRestartCount++;
            if (streamRestartCount < maxRestarts) {
              console.log('Refreshing stream URL...');
              const newAudioUrl = await getAudioStreamUrl(videoUrl);
              if (newAudioUrl) {
                audioUrl = newAudioUrl;
                console.log('Stream URL refreshed successfully.');
              } else {
                console.log('Warning: Could not refresh stream URL, using previous URL.');
              }
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            break;
          } else {
            // Normal exit
            break;
          }
        }

        // Check for inactivity timeout
        const timeSinceLastChunk = Date.now() - lastChunkTime;
        if (timeSinceLastChunk > maxInactivitySeconds * 1000) {
          console.log(
            `\n[Warning] No new chunks for ${Math.floor(timeSinceLastChunk / 1000)} seconds. Stream may have stopped.`
          );
          console.log('Checking stream status...');

          // Check if ffmpeg is still running
          if (ffmpegProcess.exitCode === null && !ffmpegProcess.killed) {
            // Process is running but not producing chunks - might be stuck
            console.log('FFmpeg appears to be stuck. Restarting...');
            ffmpegProcess.kill();
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (ffmpegProcess.exitCode === null && !ffmpegProcess.killed) {
              ffmpegProcess.kill('SIGKILL');
            }
            streamRestartCount++;
            if (streamRestartCount < maxRestarts) {
              // Refresh audio URL
              const newAudioUrl = await getAudioStreamUrl(videoUrl);
              if (newAudioUrl) {
                audioUrl = newAudioUrl;
              }
              await new Promise(resolve => setTimeout(resolve, 2000));
              break;
            } else {
              console.log('Max restart attempts reached.');
              break;
            }
          } else {
            // Process already ended
            break;
          }
        }

        // If we broke out of the inner loop due to normal exit, break outer loop too
        if (processStatus !== null && processStatus === 0 && !foundNewChunk && Date.now() - lastChunkTime > 10000) {
          break;
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Clean up
      if (ffmpegProcess && !ffmpegProcess.killed) {
        ffmpegProcess.kill();
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (ffmpegProcess && !ffmpegProcess.killed) {
          ffmpegProcess.kill('SIGKILL');
        }
      }

      // If process ended unexpectedly, try to restart
      if (processEnded && streamRestartCount < maxRestarts) {
        console.log('\n[Info] Attempting to reconnect to stream...');
        streamRestartCount++;
        if (streamRestartCount < maxRestarts) {
          console.log('Refreshing stream URL...');
          const newAudioUrl = await getAudioStreamUrl(videoUrl);
          if (newAudioUrl) {
            audioUrl = newAudioUrl;
            console.log('Stream URL refreshed successfully.');
          } else {
            console.log('Warning: Could not refresh stream URL, using previous URL.');
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else {
        break;
      }
    }

    if (streamRestartCount >= maxRestarts) {
      console.log('\n[Error] Maximum restart attempts reached. Stream may be unavailable.');
    }

    // Wait for all transcriptions to complete
    console.log('\n[Info] Waiting for remaining transcriptions to complete...');
    isProcessing = false;
    await Promise.race([
      workerPromise,
      new Promise(resolve => setTimeout(resolve, 30000)) // 30 second timeout
    ]);
  } catch (error) {
    console.error(`Error: ${error}`);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    isProcessing = false;
    if (ffmpegProcess && !ffmpegProcess.killed) {
      ffmpegProcess.kill();
    }
  }
}

async function main(): Promise<void> {
  console.log(`Connecting to live stream: ${videoUrl}`);
  console.log('Getting audio stream URL...');

  // Get audio stream URL
  const audioUrl = await getAudioStreamUrl(videoUrl);

  if (!audioUrl) {
    console.error('Error: Could not get audio stream URL.');
    process.exit(1);
  }

  console.log('Audio stream URL obtained.');
  console.log('Loading Whisper model (this may take a moment on first run)...');

  // Use base model for speed (can use 'small', 'medium', 'large' for better accuracy)
  const model = 'base';

  // Process audio stream
  try {
    await processAudioStreamSimple(model, audioUrl, videoUrl, 15);
  } catch (error) {
    if (error instanceof Error && error.message.includes('SIGINT')) {
      console.log('\n\nStopped by user.');
      process.exit(0);
    }
    throw error;
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nStopping...');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
