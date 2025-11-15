import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import secrets from 'secret-manager';

/**
 * NextAuth Configuration
 *
 * Production: Uses Google OAuth
 * Ephemeral: Can use either Google OAuth (if URL is registered) or Dev Bypass
 */

// Check if we're in an ephemeral environment
function isEphemeralEnvironment(): boolean {
  const url = process.env.NEXTAUTH_URL || '';
  return url.includes('-adhoc-') || url.includes('-ephemeral-') || url.includes('preview-');
}

// Check if dev bypass is enabled
function isDevBypassEnabled(): boolean {
  return process.env.ENABLE_DEV_AUTH_BYPASS === 'true' && isEphemeralEnvironment();
}

// Build providers based on environment
function getProviders() {
  const providers: NextAuthOptions['providers'] = [];

  // Always include Google OAuth
  providers.push(
    GoogleProvider({
      clientId: secrets.GOOGLE_CLIENT_ID || '',
      clientSecret: secrets.GOOGLE_CLIENT_SECRET || ''
    })
  );

  // Add dev bypass for ephemeral environments if enabled
  if (isDevBypassEnabled()) {
    providers.push(
      CredentialsProvider({
        name: 'Development Bypass',
        credentials: {
          email: { label: 'Email', type: 'email', placeholder: 'dev@postrix.io' }
        },
        async authorize(credentials) {
          // Only allow @postrix.io emails in dev mode
          if (credentials?.email?.endsWith('@postrix.io')) {
            return {
              id: credentials.email,
              email: credentials.email,
              name: credentials.email.split('@')[0],
              image: `https://ui-avatars.com/api/?name=${credentials.email.split('@')[0]}`
            };
          }
          return null;
        }
      })
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  providers: getProviders(),
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Ensure redirects stay on the same domain
      if (url.startsWith('/')) {
        return baseUrl + url;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    }
  },
  secret: secrets.NEXTAUTH_SECRET,
  // Show debug info in development
  debug: isEphemeralEnvironment()
};

// Export for backward compatibility
export function getAuthOptions(): NextAuthOptions {
  return authOptions;
}
