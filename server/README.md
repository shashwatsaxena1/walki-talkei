# Walkie Talkie V4 Token Server

This directory is the only directory that should be deployed as the Vercel backend project.

## Vercel settings

- Root Directory: `server`
- Framework Preset: Other
- Build Command: blank
- Output Directory: blank
- Install Command: `npm install`

Required environment variables:

- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Endpoints:

- `GET /` service information
- `GET /health` liveness
- `GET /ready` configuration readiness
- `POST /rooms/create` authenticated room creation
- `POST /rooms/join` authenticated room membership
- `POST /token` authenticated LiveKit token issuance

Never expose `SUPABASE_SERVICE_ROLE_KEY` or LiveKit API secrets to the Android app.
