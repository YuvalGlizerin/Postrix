# OAuth Setup for Ephemeral Environments

## 🎉 Two Solutions: Popup OAuth & Dev Bypass

For ephemeral environments, we provide TWO solutions that eliminate the need to register OAuth redirect URIs:

### Solution 1: Popup OAuth (Recommended for Production-like Testing)
Use real Google OAuth through a popup window that redirects to a single registered domain.

### Solution 2: Dev Bypass (Recommended for Quick Testing)
Simple email-based authentication for @postrix.io addresses.

## Solution 1: Popup OAuth Authentication

### How It Works

1. **User clicks "Sign in with Google"** on any ephemeral environment
2. **Popup window opens** to `https://dev-backoffice.postrix.io` (registered domain)
3. **Google OAuth** completes in the popup
4. **Popup sends result** back to parent window via postMessage
5. **Parent window** creates session and reloads

### Setup

#### 1. Register ONE Redirect URI in Google Cloud Console
```
https://dev-backoffice.postrix.io/api/auth/popup-callback
```

That's it! This single URL works for ALL ephemeral environments.

#### 2. Configure Ephemeral Environments
```yaml
env:
  - name: NEXTAUTH_URL
    value: "https://your-branch-adhoc-backoffice.postrix.io"
  - name: NEXT_PUBLIC_OAUTH_POPUP_URL
    value: "https://dev-backoffice.postrix.io"
  - name: NEXT_PUBLIC_USE_POPUP_AUTH
    value: "true"
```

### Benefits of Popup OAuth

✅ **Real Google OAuth** - Actual production-like authentication  
✅ **One URL for all environments** - Never register another redirect URI  
✅ **Seamless UX** - Popup closes automatically after auth  
✅ **Cross-domain support** - Works across different subdomains  

## Solution 2: Dev Bypass Authentication

### How It Works

Simple email-based authentication that bypasses OAuth entirely:

1. **User enters email** ending with @postrix.io
2. **Session created** immediately
3. **No external OAuth** required

### Setup

Enable dev bypass in ephemeral environments:
```yaml
env:
  - name: ENABLE_DEV_AUTH_BYPASS
    value: "true"
```

## Combined Setup: Use Both Solutions

For maximum flexibility, enable both popup OAuth and dev bypass:

```yaml
env:
  - name: NEXTAUTH_URL
    value: "https://your-branch-adhoc-backoffice.postrix.io"
  # Popup OAuth
  - name: NEXT_PUBLIC_OAUTH_POPUP_URL
    value: "https://dev-backoffice.postrix.io"
  - name: NEXT_PUBLIC_USE_POPUP_AUTH
    value: "true"
  # Dev Bypass
  - name: ENABLE_DEV_AUTH_BYPASS
    value: "true"
```

This gives users two options:
- **"Sign in with Google"** - Uses popup OAuth (real authentication)
- **"Sign in (Dev Mode)"** - Uses email bypass (quick testing)

## Security Notes

### Popup OAuth
- ✅ Full OAuth security
- ✅ Same as production authentication
- ✅ Cross-origin communication is secured via postMessage

### Dev Bypass
- ⚠️ Only for development/testing
- ⚠️ No actual authentication verification
- ⚠️ Restricted to @postrix.io emails only

## Environment Variables

### Required Secrets
These should be available at runtime (via secret-manager):
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret  
- `NEXTAUTH_SECRET`: Random string for JWT encryption

### Required Environment Variable
- `NEXTAUTH_URL`: The full URL of your application (e.g., `https://try-ephemeral-adhoc-backoffice.postrix.io`)

### Setting NEXTAUTH_URL for Ephemeral Environments

For Kubernetes deployments, set this dynamically in your deployment:

```yaml
env:
  - name: NEXTAUTH_URL
    value: "https://$(BRANCH_NAME)-adhoc-backoffice.postrix.io"
```

Or in your CI/CD pipeline:
```bash
export NEXTAUTH_URL="https://${BRANCH_NAME}-adhoc-backoffice.postrix.io"
```

## Troubleshooting

### "Redirect URI Mismatch" Error
This means the callback URL isn't registered in Google Cloud Console.
1. Check the error details for the exact URL Google is expecting
2. Add that URL pattern to your OAuth app's authorized redirect URIs
3. Wait a few minutes for changes to propagate

### Authentication Loop
If you're stuck in a login loop:
1. Clear cookies for the domain
2. Check browser console for errors
3. Verify NEXTAUTH_SECRET is set correctly
4. Ensure the domain is using HTTPS (required for production)

## Local Development
For local development:
```bash
NEXTAUTH_URL=http://localhost:3000 npm run dev
```

## Security Notes
- Always use HTTPS in production
- Keep NEXTAUTH_SECRET secure and random
- Restrict OAuth app to your organization's domain if possible
- Consider implementing additional authorization checks after authentication
