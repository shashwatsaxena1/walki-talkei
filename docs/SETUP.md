# Final setup

1. Create a Supabase project and run `supabase/schema-final.sql`.
2. Configure Email/Password auth.
3. Create a LiveKit Cloud project and copy its API key, secret and WebSocket URL.
4. Copy `.env.example` to `.env` for the mobile app.
5. Copy `server/.env.example` to `server/.env` for the token server.
6. Start the token server with `cd server && npm install && npm start`.
7. Build the Android app with `npm install && npx expo prebuild && npx expo run:android`.

Do not use Expo Go: LiveKit requires native WebRTC code.
