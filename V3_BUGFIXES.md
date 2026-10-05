# Walkie Talkie V3 — Bug Fixes

## Fixed dependency tree
- Expo SDK 54 retained consistently.
- `@config-plugins/react-native-webrtc` updated from 12.x (Expo 53) to 13.0.0 (Expo 54).
- LiveKit React Native pinned to 2.12.0.
- LiveKit WebRTC pinned to 144.1.2, matching LiveKit React Native 2.12.0.
- `livekit-client` pinned to 2.20.1 instead of a floating range.
- Foreground service package pinned to 2.2.5.

## Background voice
- LiveKit `registerGlobals()` is initialized at the app entry point.
- Android microphone foreground-service permissions are declared.
- A foreground service is started when a room is active and stopped when leaving.
- The room screen does not disconnect merely because the React screen loses focus.

## Multi-speaker behavior
- No speaker lock.
- Multiple participants can publish microphone audio simultaneously.
- Hold-to-talk remains available.
- Optional microphone-on mode remains available.

## Important Android limitation
Foreground service support is for background/home/lock-screen operation while the voice room is active. Android can still terminate or force-stop an app; V3 does not claim to bypass Android's force-stop behavior.

## Installation
Run in the project root:

```powershell
npm install
npx expo prebuild --clean
npx expo run:android
```

Do not use `--force` or `--legacy-peer-deps`.

LiveKit requires a development/native build, not Expo Go.
