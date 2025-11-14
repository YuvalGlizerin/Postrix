import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import secrets from 'secret-manager';
// import utils from 'utils';

// // Set the NEXTAUTH_URL based on the environment, which is needed for the Google provider to work.
// if (utils.isRunningInCluster()) {
//   const prefix = process.env.NAMESPACE === 'prod' ? '' : `${process.env.NAMESPACE}-`;
//   process.env.NEXTAUTH_URL = `https://${prefix}backoffice.postrix.io`;
// }

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
    }
  },
  secret: secrets.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login'
  }
};
