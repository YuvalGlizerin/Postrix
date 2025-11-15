'use client';

/**
 * Popup-based OAuth Authentication Component
 * 
 * This allows ANY environment to use OAuth without being registered in Google Cloud Console.
 * The popup opens to a stable, registered domain that handles the OAuth flow.
 */

// The stable OAuth endpoint that's registered in Google Cloud Console
const OAUTH_POPUP_URL = process.env.NEXT_PUBLIC_OAUTH_POPUP_URL || 'https://dev-backoffice.postrix.io';

interface OAuthResult {
  success: boolean;
  code?: string;
  state?: string;
  error?: string;
}

/**
 * Initiates OAuth sign-in via popup window
 * @param provider The OAuth provider (e.g., 'google')
 * @returns Promise that resolves when authentication completes
 */
export async function signInWithPopup(provider: string = 'google'): Promise<void> {
  return new Promise((resolve, reject) => {
    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store the current URL for redirect after auth
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth-return-url', window.location.href);
    }
    
    // Build the OAuth URL
    // Note: We need to pass the client ID from the server or make it available client-side
    const params = new URLSearchParams({
      client_id: (window as any).GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      redirect_uri: `${OAUTH_POPUP_URL}/api/auth/popup-callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      access_type: 'offline',
      prompt: 'select_account'
    });
    
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    
    // Open popup window
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      oauthUrl,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );
    
    if (!popup) {
      reject(new Error('Failed to open popup window. Please allow popups for this site.'));
      return;
    }
    
    // Listen for the OAuth result from the popup
    const handleMessage = async (event: MessageEvent) => {
      // Verify the message is from our OAuth popup
      if (event.origin !== OAUTH_POPUP_URL) {
        return;
      }
      
      if (event.data?.type !== 'oauth-callback') {
        return;
      }
      
      // Clean up
      window.removeEventListener('message', handleMessage);
      
      const result = event.data as OAuthResult & { type: string };
      
      if (result.success && result.code) {
        try {
          // Exchange the OAuth code for a session using our API
          const response = await fetch('/api/auth/popup-exchange', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: result.code,
              state: result.state,
              provider: provider
            }),
          });
          
          if (response.ok) {
            // Authentication successful, reload to get the new session
            window.location.reload();
            resolve();
          } else {
            const error = await response.text();
            reject(new Error(`Authentication failed: ${error}`));
          }
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(result.error || 'Authentication cancelled'));
      }
    };
    
    // Listen for messages from the popup
    window.addEventListener('message', handleMessage);
    
    // Also handle popup being closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        reject(new Error('Authentication cancelled'));
      }
    }, 1000);
  });
}

/**
 * Check if popup auth should be used for this environment
 */
export function shouldUsePopupAuth(): boolean {
  // Use popup auth for ephemeral environments
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  return (
    hostname.includes('-adhoc-') ||
    hostname.includes('-ephemeral-') ||
    hostname.includes('preview-') ||
    // Or if explicitly enabled
    process.env.NEXT_PUBLIC_USE_POPUP_AUTH === 'true'
  );
}
