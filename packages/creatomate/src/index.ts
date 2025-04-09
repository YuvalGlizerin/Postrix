/**
 * Downloads a video from the given URL returns a new URL of the edited video with captions on Creatomate.
 *
 * @param {string} videoUrl - The URL of the video to download.
 * @param {string} apiCreatomateKey The Facebook access token
 * @returns {Promise<string>} The URL of the video with captions.
 * @throws {Error} If the video download or upload fails.
 */
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
      const errorText = await response.text();
      throw new Error(`Failed to create captioned video: ${errorText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || !data.length || !data[0]?.url) {
      throw new Error('Invalid response from Creatomate API');
    }

    // The Creatomate API returns an array of renders
    // We're interested in the URL of the first render
    const captionsUrl = data[0].url;

    // Poll until video is ready (max 2 minutes)
    let attempts = 0;
    const maxAttempts = 24; // 24 attempts * 5 seconds = 2 minutes

    while (attempts < maxAttempts) {
      const response = await fetch(captionsUrl, { method: 'HEAD' });
      if (response.ok && response.headers.get('content-type')?.startsWith('video/')) {
        return captionsUrl;
      }
      console.log(`Video not ready, attempt ${attempts + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;
    }

    throw new Error('Could not generate captions video URL within the time limit');
  } catch (error) {
    console.error('Error in getCaptionsVideoUrlCreatomate:', error);
    throw error;
  }
}

export default {
  getCaptionsVideoUrlCreatomate
};
