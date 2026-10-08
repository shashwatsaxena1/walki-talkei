import Constants from 'expo-constants';

const fromEnv = process.env.EXPO_PUBLIC_TOKEN_SERVER_URL;
const fromExtra = Constants.expoConfig?.extra?.tokenServerUrl;

export const TOKEN_SERVER_URL = String(fromEnv || fromExtra || 'http://10.0.2.2:3000').replace(/\/$/, '');
