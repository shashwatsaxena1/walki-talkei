# Walkie Talkie V4 Final

Android-first private internet walkie-talkie built with Expo SDK 54, LiveKit, Supabase Auth and a small Express token server for Vercel.

## What is fixed in this V4.1 package

- LiveKit Expo native plugin configured correctly.
- `@config-plugins/react-native-webrtc` is pinned to the Expo 54-compatible `13.0.0` line.
- Android microphone foreground service is actually registered and started while a room is active; permissions and Android 14 microphone service type are configured by a local Expo config plugin.
- LiveKit API secrets stay on the server.
- Supabase sessions are refreshed by Supabase instead of permanently storing an old access token.
- Room create/join/token calls use the current Supabase access token.
- Room membership is checked on the trusted server before a LiveKit token is issued.
- Reconnecting/reconnected/disconnected states are shown.
- A real Leave Room action is included.
- Vercel backend uses the `server` directory as the project Root Directory and does not use the old `builds` configuration.

## Features

- 2+ participants in one LiveKit room.
- Multiple simultaneous speakers.
- Hold-to-talk.
- Continuous microphone ON/OFF.
- Participant roster and active-speaker indicator.
- Automatic LiveKit reconnect.
- Private six-character room codes.
- Supabase email/password authentication.
- Share/copy room code.
- Android foreground-service notification while an active room is connected.
- Health and readiness endpoints.

## Project layout

```text
walkie-talkie-v4-final/
  index.js
  app.json
  package.json
  tsconfig.json
  .env.example
  plugins/withWalkieForegroundService.js
  src/
    App.tsx
    api.ts
    config.ts
    storage.ts
    supabase.ts
  server/
    index.js
    package.json
    schema.sql
    .env.example
    README.md
```

## 1. Supabase setup

Create a Supabase project and enable Email/Password authentication.

Run `server/schema.sql` in the Supabase SQL editor.

The mobile app only uses the Supabase anon key. Never put the Supabase service-role key in the mobile `.env`.

Create the project-root `.env`:

```text
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
EXPO_PUBLIC_TOKEN_SERVER_URL=http://10.0.2.2:3000
```

For a physical Android phone on the same Wi-Fi, replace `10.0.2.2` with your Windows PC LAN IP, for example `http://192.168.1.20:3000`.

## 2. LiveKit setup

Create a LiveKit Cloud project or use your own LiveKit server.

You need:

- API key
- API secret
- WebSocket URL, for example `wss://your-project.livekit.cloud`

Do not put the API key/secret in the mobile `.env`.

## 3. Local token server

Open PowerShell:

```powershell
cd server
npm install
$env:LIVEKIT_API_KEY="YOUR_KEY"
$env:LIVEKIT_API_SECRET="YOUR_SECRET"
$env:LIVEKIT_URL="wss://YOUR-LIVEKIT-URL"
$env:SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
npm start
```

Check:

```text
http://localhost:3000/health
http://localhost:3000/ready
```

For the Android emulator, the mobile app uses `http://10.0.2.2:3000` to reach your Windows PC.

## 4. Vercel deployment

Create a **separate Vercel project for this repository** and set:

- Root Directory: `server`
- Framework Preset: Other
- Build Command: blank
- Output Directory: blank
- Install Command: `npm install`

Add these Vercel environment variables:

```text
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
LIVEKIT_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Do not add the old Vercel `builds` configuration.

After deployment, test:

```text
https://YOUR-VERCEL-DOMAIN/health
https://YOUR-VERCEL-DOMAIN/ready
```

Expected `/health`:

```json
{"ok":true,"service":"walkie-talkie-token-server","status":"healthy"}
```

Then change the mobile `.env` to:

```text
EXPO_PUBLIC_TOKEN_SERVER_URL=https://YOUR-VERCEL-DOMAIN
```

Rebuild the Android app after changing this value.

## 5. Android build

LiveKit uses native WebRTC code, so **Expo Go is not the target runtime**. LiveKit's Expo setup requires a native development/release build.

On Windows PowerShell:

```powershell
cd walkie-talkie-v4-final
npm install
npx expo-doctor
npx expo prebuild --clean
npx expo run:android
```

For a local release APK:

```powershell
npx expo run:android --variant release
```

The first native build can take several minutes.

## 6. Important Android background behavior

The app starts an Android foreground service when an active voice room is connected. This is what keeps the process much more reliably alive when the screen is locked/backgrounded.

Android 14+ requires foreground-service types/permissions for microphone use; this project adds `FOREGROUND_SERVICE_MICROPHONE` and declares the microphone service type during Expo prebuild.

The app still cannot guarantee operation after the user explicitly force-stops the app, or on OEM devices that aggressively kill background apps.

## 7. Security model

1. User signs in with Supabase.
2. The mobile app gets a short-lived Supabase access token.
3. The mobile app asks the Vercel server to create/join a room.
4. The Vercel server verifies the Supabase token.
5. The server checks `room_members`.
6. Only then does the server issue a one-hour LiveKit token.
7. LiveKit API secrets never leave the server.

## 8. Final test

Use two Android devices/emulators:

1. Install the same V4 APK on both.
2. Create an account on each.
3. Device A: Create room.
4. Device B: enter the six-character room code and Join.
5. Hold **HOLD TO TALK** on either device.
6. Turn **Mic ON** to test continuous voice.
7. Lock the screen while the room is active and verify the foreground notification remains visible.
8. Test reconnect by temporarily disabling/re-enabling Wi-Fi or mobile data.

Internet is required. The distance between devices does not matter as long as both have internet access.
