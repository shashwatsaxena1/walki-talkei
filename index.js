import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import { registerRootComponent } from 'expo';
import App from './src/App';

// LiveKit recommends a native foreground service for Android background voice.
// Register it before Expo mounts the React tree.
ReactNativeForegroundService.register();

registerRootComponent(App);
