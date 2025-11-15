# OAuth Setup for Ephemeral Environments

## Problem

Google OAuth doesn't support wildcard redirect URIs. This means we can't pre-configure redirect URIs for ephemeral PR environments with dynamic domains like `pr-123-backoffice.postrix.io`.

## Solution

We use an **OAuth popup pattern** where ephemeral environments open production's OAuth flow in a popup window, then rely on shared session cookies to maintain authentication state.

### How It Works

1. **Environment Detection**
   - Persistent environments (prod, dev, localhost) have their own OAuth configuration
   - Ephemeral PR environments are detected by checking if hostname matches persistent domains

2. **Shared Cookies Across Subdomains**
   - Session cookies are configured with `domain: '.postrix.io'`
   - This allows sessions created on production to work on all `*.postrix.io` subdomains

3. **OAuth Popup for Ephemeral Environments**
   - Ephemeral environments open production's OAuth flow in a popup window
   - Production handles the entire OAuth flow with Google in the popup
   - After successful authentication, the popup shows a success message and auto-closes
   - The session cookie (set for `.postrix.io`) is now accessible on the ephemeral domain
   - The main window detects the popup closed and reloads to pick up the session

### Authentication Flow

For a user accessing `pr-123-backoffice.postrix.io`:

```
1. User visits pr-123-backoffice.postrix.io/login
2. Clicks "Sign in with Google"
3. A popup window opens: https://backoffice.postrix.io/api/auth/signin/google
4. Popup handles OAuth: redirects to Google with redirect_uri=https://backoffice.postrix.io/api/auth/callback/google
5. User authenticates with Google
6. Google redirects back to https://backoffice.postrix.io/api/auth/callback/google
7. Production creates session cookie with domain=.postrix.io
8. Popup redirects to success page, shows "Authentication Successful", and auto-closes
9. Main window detects popup closed and reloads
10. User is now authenticated on ephemeral domain (cookie is valid for all *.postrix.io domains)
```

For persistent environments (dev, prod), OAuth happens directly on that environment without a popup.

## Google OAuth Configuration

### Required Redirect URIs

In your Google Cloud Console, configure these redirect URIs:

- `http://localhost:3000/api/auth/callback/google` (for local development)
- `https://backoffice.postrix.io/api/auth/callback/google` (for production AND proxy for ephemeral environments)
- `https://dev-backoffice.postrix.io/api/auth/callback/google` (for dev environment)

**Note**: Each persistent environment needs its own redirect URI. Ephemeral PR environments all share the production redirect URI via the proxy pattern.

## Environment Configuration

### Persistent Environments
Each persistent environment needs its `NEXTAUTH_URL` set:
- **prod**: `NEXTAUTH_URL=https://backoffice.postrix.io`
- **dev**: `NEXTAUTH_URL=https://dev-backoffice.postrix.io`
- **local**: `NEXTAUTH_URL=http://localhost:3000`

### Ephemeral Environments
No special configuration needed! They automatically proxy through production.

## Files Modified

- **`lib/auth.ts`**
  - Configures cookie domain to `.postrix.io` for subdomain sharing
  - Implements custom redirect callback to support ephemeral domain redirects
  - Validates redirect targets end with `.postrix.io` or are localhost

- **`app/login/page.tsx`**
  - Detects ephemeral vs persistent environments
  - For ephemeral: opens production OAuth in a popup window
  - For persistent: uses standard NextAuth OAuth flow
  - Polls for popup closure and reloads to pick up the session

- **`app/api/auth/oauth-success/route.ts`** (new)
  - Success page shown in popup after OAuth completes
  - Displays success message and auto-closes the popup window

- **`envs/dev.env`**
  - Updated `NEXTAUTH_URL` to use dev-specific domain

## Security Notes

- Only `@postrix.io` email accounts are allowed (enforced in signIn callback)
- Cookies are httpOnly and secure in production
- Redirect callback validates domains end with `.postrix.io` or are localhost
- Session secrets are managed securely via K8s secrets
- OAuth state/CSRF tokens are properly validated for each environment

