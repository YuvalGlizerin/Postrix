import { NextRequest, NextResponse } from 'next/server';

/**
 * Popup OAuth Callback Handler
 * 
 * This endpoint receives the OAuth callback in a popup window and
 * sends the authentication result back to the parent window via postMessage
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // Generate HTML that sends the OAuth result back to parent window
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authenticating...</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            backdrop-filter: blur(10px);
          }
          .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 3px solid white;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .error {
            background: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
          }
        </style>
      </head>
      <body>
        <div class="container ${error ? 'error' : ''}">
          ${error ? `
            <h2>Authentication Failed</h2>
            <p>${error === 'access_denied' ? 'Access was denied' : 'An error occurred'}</p>
            <p style="opacity: 0.7; font-size: 0.9rem;">This window will close automatically...</p>
          ` : `
            <div class="spinner"></div>
            <h2>Authenticating...</h2>
            <p>Please wait while we complete your sign in</p>
          `}
        </div>
        <script>
          // Send the OAuth result back to the parent window
          const result = {
            success: ${!error},
            code: '${code || ''}',
            state: '${state || ''}',
            error: '${error || ''}'
          };
          
          // Try to send to parent window
          if (window.opener) {
            // Send to any origin (the parent will verify the message)
            window.opener.postMessage({
              type: 'oauth-callback',
              ...result
            }, '*');
            
            // Close the popup after a short delay
            setTimeout(() => {
              window.close();
            }, ${error ? '2000' : '500'});
          } else {
            // If no parent window, redirect to login
            setTimeout(() => {
              window.location.href = '/login${error ? '?error=' + error : ''}';
            }, 2000);
          }
        </script>
      </body>
    </html>
  `;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
