#!/usr/bin/env python3
"""
Real-time YouTube Live Stream Audio Transcription
Streams audio from YouTube and transcribes it in real-time using Whisper.
"""

video_url = "https://www.youtube.com/watch?v=j8ags57BAPI"

try:
    import yt_dlp
except ImportError:
    print("Error: yt-dlp is not installed. Please install it with:")
    print("  pip install yt-dlp")
    import sys
    sys.exit(1)

try:
    import whisper
except ImportError as e:
    print("Error: openai-whisper is not installed or not accessible.")
    print(f"Import error: {e}")
    print("\nPlease install it with:")
    print("  python3 -m pip install openai-whisper")
    print("or")
    print("  pip3 install openai-whisper")
    print("\nNote: Make sure you're using the same Python version that has whisper installed.")
    print(f"Current Python: {sys.executable}")
    print("\nFor faster real-time transcription, you can also use:")
    print("  pip install faster-whisper")
    import sys
    sys.exit(1)

import subprocess
import sys
import time
import os
import tempfile
from datetime import datetime
from typing import Optional
import threading
import queue


def get_audio_stream_url(video_url: str) -> Optional[str]:
    """Get the direct audio stream URL from YouTube."""
    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'no_warnings': True,
            'extractor_args': {'youtube': {'player_client': ['default']}},
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            if 'url' in info:
                return info['url']
            # Try to get from formats
            if 'formats' in info:
                for fmt in info['formats']:
                    if fmt.get('acodec') != 'none' and fmt.get('vcodec') == 'none':
                        return fmt.get('url')
    except Exception as e:
        print(f"Error getting audio stream URL: {e}", file=sys.stderr)
    return None


def stream_audio_to_file(audio_url: str, output_file: str, chunk_duration: int = 30):
    """Stream audio from URL and save chunks to file using ffmpeg."""
    try:
        # Use ffmpeg to stream and save audio in chunks
        # This will continuously append to the file
        cmd = [
            'ffmpeg',
            '-i', audio_url,
            '-f', 'wav',
            '-ar', '16000',  # Whisper works best with 16kHz
            '-ac', '1',     # Mono
            '-y',           # Overwrite output file
            output_file
        ]
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.PIPE
        )
        return process
    except Exception as e:
        print(f"Error starting audio stream: {e}", file=sys.stderr)
        return None


def transcribe_audio_chunk(model, audio_file: str) -> Optional[str]:
    """Transcribe an audio file chunk using Whisper."""
    try:
        if not os.path.exists(audio_file) or os.path.getsize(audio_file) == 0:
            return None
        
        result = model.transcribe(audio_file, language='en', fp16=False)
        text = result['text'].strip()
        return text if text else None
    except Exception as e:
        print(f"Error transcribing audio: {e}", file=sys.stderr)
        return None


def process_audio_stream_realtime(model, audio_url: str, chunk_duration: int = 10):
    """Process audio stream in real-time chunks and transcribe."""
    import wave
    import numpy as np
    
    print("\n" + "="*60)
    print("REAL-TIME TRANSCRIPTION")
    print("="*60)
    print("Processing audio in chunks and transcribing...\n")
    
    seen_texts = set()
    
    try:
        # Use ffmpeg to stream audio and pipe to stdout
        cmd = [
            'ffmpeg',
            '-i', audio_url,
            '-f', 'wav',
            '-ar', '16000',
            '-ac', '1',
            '-'  # Output to stdout
        ]
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            bufsize=0
        )
        
        # Read audio data in chunks
        sample_rate = 16000
        chunk_size = sample_rate * chunk_duration  # 10 seconds of audio
        bytes_per_sample = 2  # 16-bit audio
        bytes_per_chunk = chunk_size * bytes_per_sample
        
        # Skip WAV header (44 bytes)
        wav_header = process.stdout.read(44)
        
        chunk_num = 0
        buffer = b''
        
        while True:
            # Read audio data
            data = process.stdout.read(bytes_per_chunk)
            if not data:
                break
            
            buffer += data
            
            # When we have enough data for a chunk, transcribe it
            if len(buffer) >= bytes_per_chunk:
                chunk_num += 1
                
                # Save chunk to temporary file
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                    tmp_path = tmp_file.name
                    
                    # Write WAV header + audio data
                    import struct
                    num_samples = len(buffer) // bytes_per_sample
                    file_size = 36 + num_samples * bytes_per_sample
                    
                    wav_header_new = struct.pack('<4sI4s4sIHHIIHH4sI',
                        b'RIFF',
                        file_size,
                        b'WAVE',
                        b'fmt ',
                        16,  # fmt chunk size
                        1,   # audio format (PCM)
                        1,   # num channels
                        sample_rate,
                        sample_rate * bytes_per_sample,  # byte rate
                        bytes_per_sample,  # block align
                        16,  # bits per sample
                        b'data',
                        num_samples * bytes_per_sample
                    )
                    
                    with open(tmp_path, 'wb') as f:
                        f.write(wav_header_new)
                        f.write(buffer[:bytes_per_chunk])
                    
                    # Transcribe
                    text = transcribe_audio_chunk(model, tmp_path)
                    
                    if text and text not in seen_texts:
                        timestamp = datetime.now().strftime("%H:%M:%S")
                        print(f"[{timestamp}] {text}") # important
                        seen_texts.add(text)
                    
                    # Clean up
                    os.unlink(tmp_path)
                    
                    # Keep some overlap in buffer for better continuity
                    overlap = bytes_per_chunk // 4
                    buffer = buffer[-overlap:]
                
                # Small delay to prevent overwhelming the system
                time.sleep(0.1)
        
        process.terminate()
        
    except KeyboardInterrupt:
        print("\n\nStopped by user.")
        if 'process' in locals():
            process.terminate()
    except Exception as e:
        print(f"Error processing stream: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()


def process_audio_stream_simple(model, audio_url: str, video_url: str, chunk_duration: int = 15, max_inactivity_seconds: int = 60):
    """Stream audio continuously and transcribe in overlapping chunks."""
    print("\n" + "="*60)
    print("REAL-TIME TRANSCRIPTION")
    print("="*60)
    print("Streaming audio and transcribing in real-time...\n")
    print("Note: There will be a delay of ~10-15 seconds for processing.\n")
    
    seen_texts = set()
    transcription_queue = queue.Queue()
    ffmpeg_stderr_lines = []
    stderr_monitor_active = threading.Event()
    stderr_monitor_active.set()
    
    def transcribe_worker():
        """Worker thread to transcribe audio chunks."""
        while True:
            chunk_file = transcription_queue.get()
            if chunk_file is None:  # Poison pill
                break
            
            try:
                text = transcribe_audio_chunk(model, chunk_file)
                if text and text not in seen_texts:
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    print(f"[{timestamp}] {text}")
                    seen_texts.add(text)
            except Exception as e:
                print(f"Transcription error: {e}", file=sys.stderr)
            finally:
                # Clean up chunk file
                if os.path.exists(chunk_file):
                    os.unlink(chunk_file)
                transcription_queue.task_done()
    
    def monitor_ffmpeg_stderr(stderr_pipe):
        """Monitor ffmpeg stderr for errors."""
        # Non-critical warnings to filter out
        ignore_patterns = [
            'keepalive request failed',
            'cannot reuse http connection for different host',
            'retrying with new connection',
            'http error',
            'http/1.1 403',  # Sometimes YouTube returns 403 but retries work
        ]
        
        try:
            for line in iter(stderr_pipe.readline, b''):
                if not stderr_monitor_active.is_set():
                    break
                line_str = line.decode('utf-8', errors='ignore').strip()
                if line_str:
                    ffmpeg_stderr_lines.append(line_str)
                    
                    # Check if this is a non-critical warning we should ignore
                    should_ignore = any(pattern in line_str.lower() for pattern in ignore_patterns)
                    
                    # Print important errors (but not the keepalive warnings)
                    if not should_ignore:
                        if any(keyword in line_str.lower() for keyword in ['error', 'failed', 'timeout']):
                            # But exclude keepalive-related errors even if they contain "error"
                            if 'keepalive' not in line_str.lower() and 'cannot reuse' not in line_str.lower():
                                print(f"[FFmpeg] {line_str}", file=sys.stderr)
        except Exception as e:
            print(f"Error monitoring ffmpeg stderr: {e}", file=sys.stderr)
        finally:
            stderr_pipe.close()
    
    # Start transcription worker thread
    worker_thread = threading.Thread(target=transcribe_worker, daemon=True)
    worker_thread.start()
    
    last_chunk_time = time.time()
    stream_restart_count = 0
    max_restarts = 5
    
    try:
        while stream_restart_count < max_restarts:
            with tempfile.TemporaryDirectory() as tmpdir:
                # Stream audio continuously using ffmpeg
                # Use segment muxer to create chunks automatically
                chunk_file_pattern = os.path.join(tmpdir, 'chunk_%03d.wav')
                
                # Add timeout and reconnect options for live streams
                # Note: YouTube HLS streams switch between CDN hosts, causing keepalive warnings
                # These are harmless - FFmpeg automatically retries with new connections
                cmd = [
                    'ffmpeg',
                    '-loglevel', 'warning',  # Reduce verbosity (filters out info messages)
                    '-i', audio_url,
                    '-f', 'segment',
                    '-segment_time', str(chunk_duration),
                    '-segment_format', 'wav',
                    '-ar', '16000',
                    '-ac', '1',
                    '-reset_timestamps', '1',
                    '-reconnect', '1',  # Enable reconnection
                    '-reconnect_at_eof', '1',  # Reconnect at end of file
                    '-reconnect_streamed', '1',  # Reconnect for streamed content
                    '-reconnect_delay_max', '5',  # Max delay between reconnects
                    '-timeout', '10000000',  # 10 second timeout in microseconds
                    '-y',
                    chunk_file_pattern
                ]
                
                print(f"Starting ffmpeg stream (attempt {stream_restart_count + 1}/{max_restarts})...")
                ffmpeg_stderr_lines.clear()
                stderr_monitor_active.set()
                
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                
                # Start stderr monitoring thread
                stderr_thread = threading.Thread(
                    target=monitor_ffmpeg_stderr,
                    args=(process.stderr,),
                    daemon=True
                )
                stderr_thread.start()
                
                # Monitor for new chunk files
                chunk_num = 0
                processed_chunks = set()
                last_chunk_time = time.time()
                process_status = None
                
                while True:
                    # Check for new chunk files - scan more broadly
                    found_new_chunk = False
                    
                    # Check current and next chunks
                    for i in range(max(0, chunk_num - 2), chunk_num + 15):
                        chunk_file = os.path.join(tmpdir, f'chunk_{i:03d}.wav')
                        if os.path.exists(chunk_file) and chunk_file not in processed_chunks:
                            # Wait a bit to ensure file is fully written
                            time.sleep(0.5)
                            if os.path.getsize(chunk_file) > 0:
                                processed_chunks.add(chunk_file)
                                transcription_queue.put(chunk_file)
                                chunk_num = max(chunk_num, i + 1)
                                last_chunk_time = time.time()
                                found_new_chunk = True
                    
                    # Check if process is still running
                    process_status = process.poll()
                    if process_status is not None:
                        # Process ended
                        stderr_monitor_active.clear()
                        time.sleep(1)
                        
                        # Check for errors in stderr
                        error_found = False
                        for line in ffmpeg_stderr_lines:
                            if any(keyword in line.lower() for keyword in ['error', 'failed', 'connection refused', 'timeout']):
                                error_found = True
                                break
                        
                        if error_found or process_status != 0:
                            print(f"\n[Warning] FFmpeg process ended with status {process_status}")
                            if ffmpeg_stderr_lines:
                                print(f"[FFmpeg] Last error: {ffmpeg_stderr_lines[-1]}")
                        
                        # Process any remaining chunks
                        time.sleep(2)
                        for i in range(max(0, chunk_num - 2), chunk_num + 10):
                            chunk_file = os.path.join(tmpdir, f'chunk_{i:03d}.wav')
                            if os.path.exists(chunk_file) and chunk_file not in processed_chunks:
                                if os.path.getsize(chunk_file) > 0:
                                    processed_chunks.add(chunk_file)
                                    transcription_queue.put(chunk_file)
                        
                        # If process ended unexpectedly, try to restart
                        if process_status != 0:
                            print(f"\n[Info] Attempting to reconnect to stream...")
                            stream_restart_count += 1
                            # Refresh audio URL in case it expired
                            if stream_restart_count < max_restarts:
                                print("Refreshing stream URL...")
                                new_audio_url = get_audio_stream_url(video_url)
                                if new_audio_url:
                                    audio_url = new_audio_url
                                    print("Stream URL refreshed successfully.")
                                else:
                                    print("Warning: Could not refresh stream URL, using previous URL.")
                            time.sleep(2)  # Brief pause before restart
                            break
                        else:
                            # Normal exit
                            break
                    
                    # Check for inactivity timeout
                    time_since_last_chunk = time.time() - last_chunk_time
                    if time_since_last_chunk > max_inactivity_seconds:
                        print(f"\n[Warning] No new chunks for {int(time_since_last_chunk)} seconds. Stream may have stopped.")
                        print("Checking stream status...")
                        
                        # Check if ffmpeg is still running
                        if process.poll() is None:
                            # Process is running but not producing chunks - might be stuck
                            print("FFmpeg appears to be stuck. Restarting...")
                            process.terminate()
                            time.sleep(2)
                            if process.poll() is None:
                                process.kill()
                            stderr_monitor_active.clear()
                            stream_restart_count += 1
                            if stream_restart_count < max_restarts:
                                # Refresh audio URL
                                new_audio_url = get_audio_stream_url(video_url)
                                if new_audio_url:
                                    audio_url = new_audio_url
                                time.sleep(2)
                                break
                            else:
                                print("Max restart attempts reached.")
                                break
                        else:
                            # Process already ended
                            break
                    
                    time.sleep(1)  # Check every second
                
                # Clean up
                stderr_monitor_active.clear()
                if process.poll() is None:
                    process.terminate()
                    time.sleep(1)
                    if process.poll() is None:
                        process.kill()
                
                # If we broke out of the inner loop due to normal exit, break outer loop too
                if process_status is not None and process_status == 0 and not found_new_chunk and time.time() - last_chunk_time > 10:
                    break
            
            # If we've restarted, continue the outer loop
            if stream_restart_count >= max_restarts:
                print("\n[Error] Maximum restart attempts reached. Stream may be unavailable.")
                break
        
        # Wait for all transcriptions to complete
        print("\n[Info] Waiting for remaining transcriptions to complete...")
        transcription_queue.put(None)  # Signal worker to stop
        worker_thread.join(timeout=30)
        
    except KeyboardInterrupt:
        print("\n\nStopping...")
        stderr_monitor_active.clear()
        transcription_queue.put(None)
        if 'process' in locals() and process.poll() is None:
            process.terminate()
            time.sleep(1)
            if process.poll() is None:
                process.kill()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        stderr_monitor_active.clear()
        if 'process' in locals() and process.poll() is None:
            process.terminate()


def main():
    
    print(f"Connecting to live stream: {video_url}")
    print("Getting audio stream URL...")
    
    # Get audio stream URL
    audio_url = get_audio_stream_url(video_url)
    
    if not audio_url:
        print("Error: Could not get audio stream URL.")
        sys.exit(1)
    
    print(f"Audio stream URL obtained.")
    print("Loading Whisper model (this may take a moment on first run)...")
    
    # Load Whisper model (using base model for speed, can use 'small', 'medium', 'large' for better accuracy)
    try:
        model = whisper.load_model("base")
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading Whisper model: {e}")
        print("Make sure you have openai-whisper installed: pip install openai-whisper")
        sys.exit(1)
    
    # Process audio stream
    # Using simpler method for better compatibility
    try:
        process_audio_stream_simple(model, audio_url, video_url, chunk_duration=15)
    except KeyboardInterrupt:
        print("\n\nStopped by user.")
        sys.exit(0)


if __name__ == "__main__":
    main()
