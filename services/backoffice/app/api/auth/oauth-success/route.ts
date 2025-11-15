import { NextResponse } from 'next/server';

/**
 * OAuth Success Page
 *
 * This page is shown in the popup after successful OAuth authentication.
 * It displays a simple message and auto-closes the popup.
 */
export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authentication Successful</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #18181b;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #10b981;
    }
    p {
      color: #a1a1aa;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>✓ Authentication Successful</h1>
    <p>This window will close automatically...</p>
  </div>
  <script>
    // Notify the parent window that OAuth succeeded
    if (window.opener) {
      window.opener.postMessage('oauth-success', '*');
    }
    
    // Close the popup window after a short delay
    setTimeout(() => {
      window.close();
    }, 1000);
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html'
    }
  });
}

