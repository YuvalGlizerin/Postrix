import fs from 'fs';
import os from 'os';
import path from 'path';

import fileSystem from '../src/index.ts';

// Mock external dependencies
jest.mock('fs');
jest.mock('os');
jest.mock('path');

describe('fileSystem', () => {
  let mockFetch: jest.Mock;
  const originalFetch = global.fetch;

  beforeAll(() => {
    // Mock the global fetch API
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterAll(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful response
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer
    });

    // Mock os.tmpdir to return a fixed path
    (os.tmpdir as jest.Mock).mockReturnValue('/tmp');

    // Mock path.join to concatenate strings predictably
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

    // Mock Date.now() to return a fixed timestamp
    jest.spyOn(Date, 'now').mockReturnValue(12345);
  });

  describe('downloadMedia', () => {
    it('should download media and save it to the specified path', async () => {
      const savePath = '/custom/path/video.mp4';
      const result = await fileSystem.downloadMedia(
        'https://example.com/video.mp4',
        'mp4',
        undefined,
        undefined,
        savePath
      );

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/video.mp4', {
        headers: {}
      });
      expect(fs.writeFileSync).toHaveBeenCalledWith(savePath, expect.any(Buffer));
      expect(result).toBe(savePath);
    });

    it('should download media to the tmp directory when no path is specified', async () => {
      const expectedPath = '/tmp/download_media_12345.mp4';

      const result = await fileSystem.downloadMedia('https://example.com/video.mp4', 'mp4');

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/video.mp4', {
        headers: {}
      });
      expect(os.tmpdir).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expect.any(Buffer));
      expect(result).toBe(expectedPath);
    });

    it('should include authorization header when provided', async () => {
      const authToken = 'Bearer token123';

      await fileSystem.downloadMedia('https://example.com/video.mp4', 'mp4', authToken);

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/video.mp4', {
        headers: {
          Authorization: authToken
        }
      });
    });

    it('should include user-agent header when provided', async () => {
      const userAgent = 'Test User Agent';

      await fileSystem.downloadMedia('https://example.com/video.mp4', 'mp4', undefined, userAgent);

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/video.mp4', {
        headers: {
          'User-Agent': userAgent
        }
      });
    });

    it('should handle mov extension correctly', async () => {
      const result = await fileSystem.downloadMedia('https://example.com/video.mov', 'mov');

      expect(result).toContain('.mov');
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('.mov'), expect.any(Buffer));
    });

    it('should throw an error when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fileSystem.downloadMedia('https://example.com/video.mp4', 'mp4')).rejects.toThrow('Network error');
    });

    it('should throw an error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(fileSystem.downloadMedia('https://example.com/video.mp4', 'mp4')).rejects.toThrow(
        'Failed to download media: 404'
      );
    });

    it('should include both authorization and user-agent headers when provided', async () => {
      const authToken = 'Bearer token123';
      const userAgent = 'Test User Agent';

      await fileSystem.downloadMedia('https://example.com/video.mp4', 'mp4', authToken, userAgent);

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/video.mp4', {
        headers: {
          Authorization: authToken,
          'User-Agent': userAgent
        }
      });
    });
  });
});
