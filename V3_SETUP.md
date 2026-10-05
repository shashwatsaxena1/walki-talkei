# V3 Setup

## 1. Clean install (PowerShell)
If this folder previously had V2 installed:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache verify
npm install
```

The final `npm install` should finish without ERESOLVE.

## 2. Verify versions

```powershell
npm ls expo @config-plugins/react-native-webrtc @livekit/react-native @livekit/react-native-webrtc livekit-client
```

Expected core versions:
- Expo 54.x
- config plugin 13.1.0
- LiveKit RN 2.12.0
- LiveKit WebRTC 144.1.2
- livekit-client 2.20.1

## 3. Generate Android project

```powershell
npx expo prebuild --clean
```

## 4. Run Android

```powershell
npx expo run:android
```

## 5. Token server

```powershell
cd server
npm install
npm start
```

Use `.env` values from `server/.env.example`.

## 6. Mobile environment
Copy `.env.example` to `.env` and set:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_TOKEN_SERVER_URL=http://10.0.2.2:3000
```

For a physical phone on the same Wi-Fi, replace `10.0.2.2` with your PC's LAN IP.

## 7. Final production APK
After testing locally, use an EAS/native production build. The direct APK distribution website remains supported; Play Store is not required.
