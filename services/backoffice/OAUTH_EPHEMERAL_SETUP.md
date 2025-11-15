# OAuth Setup for Ephemeral Environments

## Problem

Google OAuth doesn't support wildcard redirect URIs. This means we can't pre-configure redirect URIs for ephemeral PR environments with dynamic domains like `pr-123-backoffice.postrix.io`.

## Solution

We use a **centralized OAuth callback approach** that allows all ephemeral environments to authenticate through the production domain while maintaining session across subdomains.

### How It Works

1. **Ephemeral environments use production OAuth endpoint**
   - All ephemeral namespaces (non-prod, non-local) set `NEXTAUTH_URL` to `https://backoffice.postrix.io`
   - Google OAuth callbacks always go to the production domain

2. **Shared cookies across subdomains**
   - Session cookies are configured with `domain: '.postrix.io'`
   - This allows sessions to work across all `*.postrix.io` subdomains

3. **Smart redirect handling**
   - When users click "Sign in with Google", the current domain is captured
   - After successful authentication on the production domain, users are redirected back to their original ephemeral environment
   - The session cookie (set for `.postrix.io`) is accessible on all subdomains

### Authentication Flow

For a user accessing `pr-123-backoffice.postrix.io`:

```
1. User visits pr-123-backoffice.postrix.io/login
2. Clicks "Sign in with Google"
3. NextAuth redirects to Google with redirect_uri=https://backoffice.postrix.io/api/auth/callback/google
4. User authenticates with Google
5. Google redirects back to https://backoffice.postrix.io/api/auth/callback/google
6. NextAuth creates session cookie with domain=.postrix.io
7. NextAuth redirects user back to pr-123-backoffice.postrix.io/
8. User is authenticated (cookie is valid for all *.postrix.io domains)
```

## Google OAuth Configuration

In your Google Cloud Console, you only need to configure these redirect URIs:

- `http://localhost:3000/api/auth/callback/google` (for local development)
- `https://backoffice.postrix.io/api/auth/callback/google` (for production AND all ephemeral environments)

No need to add individual URIs for each PR environment!

## Files Modified

- **`lib/auth.ts`**
  - Detects ephemeral environments and sets NEXTAUTH_URL to production
  - Configures cookie domain to `.postrix.io` for subdomain sharing
  - Implements custom redirect callback to support ephemeral domain redirects

- **`app/login/page.tsx`**
  - Captures current domain origin as callback URL
  - Ensures users return to their original domain after OAuth

## Security Notes

- Only `@postrix.io` email accounts are allowed (enforced in signIn callback)
- Cookies are httpOnly and secure in production
- Redirect callback validates domains end with `.postrix.io` or are localhost
- Session secrets are managed securely via K8s secrets

