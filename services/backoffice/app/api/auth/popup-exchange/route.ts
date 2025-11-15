import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import secrets from 'secret-manager';

// Simple JWT implementation for session token
function createSessionToken(user: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    name: user.name,
    email: user.email,
    picture: user.picture,
    sub: user.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
  })).toString('base64url');
  
  // For simplicity, using a basic signature (in production, use proper JWT library)
  const signature = Buffer.from(
    `${header}.${payload}.${secrets.NEXTAUTH_SECRET || 'dev-secret'}`
  ).toString('base64url');
  
  return `${header}.${payload}.${signature}`;
}

/**
 * Exchange OAuth code for NextAuth session
 * 
 * This endpoint is called by the popup auth flow to exchange
 * the OAuth authorization code for a NextAuth session.
 */
export async function POST(request: NextRequest) {
  try {
    const { code, state, provider } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }
    
    // Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: secrets.GOOGLE_CLIENT_ID || '',
        client_secret: secrets.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXT_PUBLIC_OAUTH_POPUP_URL || 'https://dev-backoffice.postrix.io'}/api/auth/popup-callback`,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return NextResponse.json({ error: 'Failed to exchange code for tokens' }, { status: 400 });
    }
    
    const tokens = await tokenResponse.json();
    
    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch user info' }, { status: 400 });
    }
    
    const user = await userResponse.json();
    
    // Create a simple session token
    const sessionToken = createSessionToken(user);
    
    // Set the session cookie
    const cookieStore = cookies();
    cookieStore.set('next-auth.session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Popup auth exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
