import type { RequestInfo, RequestInit, Response } from 'node-fetch';

import creatomate from '../src/index.ts';

// Define the type for the mocked fetch
declare global {
  // Extend the existing fetch declaration
  interface Window {
    fetch: jest.Mock<Promise<Response>, [input: RequestInfo | URL, init?: RequestInit | undefined]>;
  }
}

// Store original fetch for restoration
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = jest.fn() as unknown as typeof global.fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('getCaptionsVideoUrlCreatomate', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  // Test successful case
  it('should return a video URL when the process completes successfully', async () => {
    // Mock successful API response
    const mockApiResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue([{ url: 'https://example.com/video-with-captions.mp4' }]),
      text: jest.fn()
    };

    // Mock successful HEAD request
    const mockHeadResponse = {
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('video/mp4')
      }
    };

    // Configure fetch mock to return different responses based on URL
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === 'https://api.creatomate.com/v1/renders') {
        return Promise.resolve(mockApiResponse);
      } else if (url === 'https://example.com/video-with-captions.mp4') {
        return Promise.resolve(mockHeadResponse);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    // Call the function and verify result
    const result = await creatomate.getCaptionsVideoUrlCreatomate(
      'https://example.com/original-video.mp4',
      'test-api-key'
    );

    expect(result).toBe('https://example.com/video-with-captions.mp4');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith('https://api.creatomate.com/v1/renders', expect.any(Object));
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/video-with-captions.mp4', { method: 'HEAD' });
  });

  // Test API error case
  it('should throw an error if the Creatomate API returns an error', async () => {
    // Mock failed API response
    const mockErrorResponse = {
      ok: false,
      text: jest.fn().mockResolvedValue('API Error: Something went wrong')
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockErrorResponse);

    // Call the function and expect rejection
    await expect(
      creatomate.getCaptionsVideoUrlCreatomate('https://example.com/original-video.mp4', 'test-api-key')
    ).rejects.toThrow('Failed to create captioned video: API Error: Something went wrong');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockErrorResponse.text).toHaveBeenCalled();
  });

  // Test invalid response format
  it('should throw an error if the API response has invalid format', async () => {
    // Mock successful API call with invalid response format
    const mockInvalidResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({}), // Empty object instead of array
      text: jest.fn()
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockInvalidResponse);

    await expect(
      creatomate.getCaptionsVideoUrlCreatomate('https://example.com/original-video.mp4', 'test-api-key')
    ).rejects.toThrow('Invalid response from Creatomate API');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // Test that fetch is called with correct parameters
  it('should call Creatomate API with correct parameters', async () => {
    // Mock responses for successful flow
    const mockApiResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue([{ url: 'https://example.com/video-with-captions.mp4' }]),
      text: jest.fn()
    };

    const mockHeadResponse = {
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('video/mp4')
      }
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === 'https://api.creatomate.com/v1/renders') {
        return Promise.resolve(mockApiResponse);
      } else if (url === 'https://example.com/video-with-captions.mp4') {
        return Promise.resolve(mockHeadResponse);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const videoUrl = 'https://example.com/original-video.mp4';
    const apiKey = 'test-api-key';

    await creatomate.getCaptionsVideoUrlCreatomate(videoUrl, apiKey);

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith('https://api.creatomate.com/v1/renders', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-api-key',
        'Content-Type': 'application/json'
      },
      body: expect.stringContaining(videoUrl)
    });

    // Verify request body contains expected structure
    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(requestBody).toHaveProperty('output_format', 'mp4');
    expect(requestBody.source.elements[0].source).toBe(videoUrl);
    expect(requestBody.source.elements[1].type).toBe('text');
  });
});
