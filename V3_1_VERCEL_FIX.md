# V3.1 Vercel Runtime Fix

The previous deployment could build successfully but fail when the function was invoked.

## What was fixed

- The Express app is exported for Vercel instead of starting a persistent `app.listen()` server inside the function.
- Supabase admin client is created only when `/token` is called and the required environment variables exist. This prevents a missing Vercel environment variable from crashing the function during module startup.
- Added `GET /` and `GET /health` endpoints for an easy deployment test.
- Removed the legacy `builds` configuration that caused Vercel's project build settings to be ignored.

## Vercel environment variables

In Vercel → Project → Settings → Environment Variables, add these to **Production** (and Preview if you test preview deployments):

```text
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://...
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Use Secret for the API secret and Supabase service-role key.

After adding/changing environment variables, redeploy. Vercel applies environment variables to deployments at runtime; a new deployment is required after changes.

## Test after deployment

Open:

```text
https://YOUR-VERCEL-DOMAIN/
```

Expected:

```json
{"ok":true,"service":"walkie-talkie-token-server","status":"running"}
```

Then:

```text
https://YOUR-VERCEL-DOMAIN/health
```

Expected:

```json
{"ok":true,"service":"walkie-talkie-token-server"}
```

The mobile app should use the Vercel deployment URL as `EXPO_PUBLIC_TOKEN_SERVER_URL`.
