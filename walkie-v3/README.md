# Walkie Talkie V3

Android-first internet walkie-talkie app with Supabase authentication, room codes, LiveKit real-time voice, simultaneous speakers, and Android foreground-service support for active rooms in the background/lock screen.

## Stack
- Expo SDK 54 / React Native 0.81
- Expo Router
- LiveKit React Native 2.12.0
- LiveKit WebRTC 144.1.2
- Supabase Auth + Postgres
- Node/Express token server
- Android foreground service

## Core behavior
- 2+ people in one room
- Multiple people can speak simultaneously
- Everyone hears active speakers
- Hold-to-talk
- Optional continuous microphone mode
- Room membership checked server-side
- LiveKit secret remains server-side
- Background/lock-screen support while active, subject to Android OS rules

## Do not use Expo Go
LiveKit requires native modules. Use `npx expo run:android` or an EAS development/production build.
