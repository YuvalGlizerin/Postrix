import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import secrets from 'secret-manager';
import redis from 'redis';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: secrets.SECRET_GOOGLE_CLIENT_ID || '',
      clientSecret: secrets.SECRET_GOOGLE_CLIENT_SECRET || ''
    }),
    CredentialsProvider({
      name: 'Email Verification Code',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Verification Code', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          return null;
        }

        try {
          // Normalize email
          const normalizedEmail = credentials.email.toLowerCase().trim();

          // Get code from Redis
          const redisKey = `auth:code:${normalizedEmail}`;
          const storedCode = await redis.get(redisKey);

          if (!storedCode) {
            return null; // Code not found or expired
          }

          // Verify code
          if (storedCode !== credentials.code) {
            return null; // Invalid code
          }

          // Delete code after successful verification (one-time use)
          await redis.del(redisKey);

          // Return user object (email is the identifier)
          // No database needed - we just use the email as the user ID
          return {
            id: normalizedEmail, // Use email as ID since we don't have a database
            email: normalizedEmail,
            name: null,
            image: null
          };
        } catch (error) {
          console.error('Error during code verification:', error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Handle OAuth providers (Google)
      if (account && user) {
        token.accessToken = account.access_token;
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      // Handle Credentials provider (email/code)
      // User object is only passed on first sign-in
      if (user && !account) {
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
    }
  },
  secret: secrets.SECRET_NEXTAUTH_SECRET
};
