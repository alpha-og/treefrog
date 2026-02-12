# Clerk Authentication Setup Guide

## Problem: 401 Errors on App Load

When running the app locally, you may see 401 errors from Clerk. This indicates that the Clerk instance is not configured to accept requests from your development environment.

## Root Causes

The Clerk instance `https://quality-seagull-55.clerk.accounts.dev` needs proper configuration:

1. **Missing Allowed Origins**: Clerk API requires `http://localhost:5173` (dev server) to be added
2. **Missing Redirect URLs**: OAuth callback routes must be registered
3. **CORS Configuration**: May need adjustment for local development

## Solution Steps

### Step 1: Access Clerk Dashboard

1. Go to https://dashboard.clerk.com/apps/
2. Select the "quality-seagull-55" application
3. Navigate to **Settings** → **Application URLs** or **Domains**

### Step 2: Add Development Origin

Under **Allowed Origins** or **CORS**, add:
```
http://localhost:5173
```

Also add if using localhost port variations:
```
http://localhost:5173
http://127.0.0.1:5173
```

### Step 3: Configure Redirect URLs

Under **Redirect URLs** or **OAuth**, add the callback route:
```
http://localhost:5173/auth/callback
```

### Step 4: Enable Google OAuth (if not already)

1. Go to **Social Connections** in the dashboard
2. Enable **Google**
3. Add your Google OAuth credentials (get from Google Cloud Console if needed)
4. Ensure the redirect URL matches what Clerk generates

### Step 5: Update .env.local

Verify your `.env.local` has the correct publishable key:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_cXVhbGl0eS1zZWFndWxsLTU1LmNsZXJrLmFjY291bnRzLmRldiQ
VITE_API_URL=http://localhost:9000/api
```

### Step 6: Clear Browser Cache

After making Clerk configuration changes:
1. Close the dev server
2. Clear browser cache/cookies for localhost:5173
3. Restart `make dev`

## Testing the Fix

1. Run `make dev` to start the dev server
2. Open http://localhost:5173 in your browser
3. You should see the Auth page without 401 errors
4. Try signing in with Google
5. Check the browser console for any errors

## If Issues Persist

### Check Browser Console

1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for errors mentioning:
   - "CORS"
   - "401 Unauthorized"
   - "Invalid origin"
   - "Redirect URL mismatch"

### Check Network Tab

1. Go to **Network** tab
2. Look for requests to `clerk.accounts.dev`
3. Check the failed request details:
   - Status code (401, 403, CORS error)
   - Response body (may contain error message)

### Verify Clerk Configuration

Return to the Clerk Dashboard and double-check:
- [ ] `http://localhost:5173` is in Allowed Origins
- [ ] `/auth/callback` is registered as a Redirect URL
- [ ] Google OAuth is enabled and configured
- [ ] Publishable key is active (not expired/revoked)

## Environment Variables Used

- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key (loaded by ClerkProvider)
- `VITE_API_URL` - Backend API URL for authenticated requests

## Related Files

- `desktop/frontend/src/main.tsx` - ClerkProvider initialization
- `desktop/frontend/src/pages/Auth.tsx` - Sign-in page
- `desktop/frontend/src/pages/AuthCallback.tsx` - OAuth callback handler
- `desktop/frontend/src/stores/authStore.ts` - Auth state management
- `desktop/frontend/.env.local` - Environment configuration
