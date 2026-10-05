# Walkie Talkie V3.1 Final

V3.1 fixes the dependency problems found in V3 and the Vercel token-server package name.

## Fixed
- Removed invalid `@livekit/server-sdk` package reference.
- Backend now uses the official `livekit-server-sdk` package.
- Removed the nonexistent `@livekit/react-native-expo-plugin@2.12.0` reference.
- Uses the published LiveKit Expo plugin `1.0.3`.
- Uses `@livekit/react-native` `3.0.0`.
- Uses `@livekit/react-native-webrtc` `144.2.0`.
- Uses `livekit-client` `2.22.3`.
- Keeps Expo SDK 54 + React Native 0.81.
- Added LiveKit `registerGlobals()` before the Expo app starts.
- Added Android microphone and notification runtime permission requests.
- Foreground microphone service declaration includes the LiveKit-recommended service and task entries.
- Version bumped to 3.1.0 / Android versionCode 31.

## Important
LiveKit native audio requires a development/native Android build. Expo Go is not sufficient.

## Server deployment
If deploying only the token server to Vercel, set the Vercel project Root Directory to `server`.
Required environment variables:
- LIVEKIT_API_KEY
- LIVEKIT_API_SECRET
- LIVEKIT_URL
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

The API secret and Supabase service-role key must never be put in the mobile `.env` or APK.

## Mobile environment
Create `.env` from `.env.example`:
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY
- EXPO_PUBLIC_TOKEN_SERVER_URL

For an Android emulator, the local server URL is `http://10.0.2.2:3000`.
For a physical phone, use the laptop's LAN IP during local testing.
