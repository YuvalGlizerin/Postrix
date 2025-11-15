import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import secrets from 'secret-manager';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: secrets.GOOGLE_CLIENT_ID!,
      clientSecret: secrets.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Hint Google to use the postrix.io hosted domain.
          hd: 'postrix.io'
        }
      }
    })
  ],
  cookies: {
    // Set cookies to work across all postrix.io subdomains
    // This allows sessions to work on ephemeral environments
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Share cookies across all postrix.io subdomains
        domain: process.env.NODE_ENV === 'production' ? '.postrix.io' : undefined
      }
    }
  },
  callbacks: {
    async signIn({ user, profile }) {
      const email = user?.email ?? profile?.email;

      if (!email) {
        return false;
      }

      // Only allow @postrix.io accounts.
      if (!email.toLowerCase().endsWith('@postrix.io')) {
        return false;
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      // If there's a callbackUrl with an ephemeral domain, redirect there
      const urlObj = new URL(url, baseUrl);
      const callbackUrl = urlObj.searchParams.get('callbackUrl');

      if (callbackUrl) {
        try {
          const callback = new URL(callbackUrl);
          // Allow redirects to any postrix.io subdomain
          if (callback.hostname.endsWith('.postrix.io') || callback.hostname === 'localhost') {
            return callbackUrl;
          }
        } catch {
          // Invalid URL, fall through to default behavior
        }
      }

      // Default NextAuth behavior
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    }
  },
  secret: secrets.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login'
  }
};
