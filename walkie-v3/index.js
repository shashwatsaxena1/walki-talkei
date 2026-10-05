import { registerGlobals } from '@livekit/react-native';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import 'react-native-url-polyfill/auto';

// LiveKit's React Native SDK requires WebRTC globals before any room is created.
registerGlobals();

// Registers the Android foreground service used to keep an active voice room alive in background.
try { ReactNativeForegroundService.register(); } catch {}

import 'expo-router/entry';
