import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext
} from '@livekit/react-native';
import { ConnectionState, RoomEvent } from 'livekit-client';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import { getLiveKitToken, healthCheck, roomRequest } from './api';
import { clearProfile, loadProfile, Profile, saveProfile } from './storage';
import { supabase } from './supabase';

registerGlobals();

const Stack = createNativeStackNavigator<any>();

type AppSession = Profile;

function Button({
  title,
  onPress,
  disabled = false,
  secondary = false
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.disabled,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>
    </Pressable>
  );
}

function profileFromAuth(user: any): Profile {
  return {
    userId: user.id,
    email: user.email || '',
    displayName: String(user.user_metadata?.display_name || user.email?.split('@')[0] || 'User')
  };
}

async function currentAccessToken() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) throw new Error('Your login session expired. Please sign in again.');
  return data.session.access_token;
}

async function requestAndroidVoicePermissions() {
  if (Platform.OS !== 'android') return true;

  const microphone = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Microphone permission',
    message: 'Walkie Talkie needs your microphone to send and receive live voice.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny'
  });

  if (microphone !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Microphone permission is required for voice rooms.');
  }

  if (Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
      title: 'Voice connection notification',
      message: 'Android uses a notification while Walkie Talkie keeps an active voice room connected in the background.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now'
    });
  }

  return true;
}

function AuthScreen({ onSignedIn }: { onSignedIn: (p:Profile) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState(false);

  const submit = async () => {
    if (!supabase) {
      Alert.alert('Supabase not configured', 'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then rebuild.');
      return;
    }
    if (!email.trim() || password.length < 6) {
      Alert.alert('Account', 'Enter an email and a password of at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      const result = signup
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { display_name: name.trim() || email.split('@')[0] } }
          })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (result.error) throw result.error;
      if (!result.data.session || !result.data.user) {
        Alert.alert('Check your email', 'Supabase may require email confirmation before your first sign-in.');
        return;
      }

      const profile = profileFromAuth(result.data.user);
      await saveProfile(profile);
      onSignedIn(profile);
    } catch (e: any) {
      Alert.alert('Authentication error', e?.message || 'Could not authenticate');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.center}>
      <Text style={styles.logo}>WALKI TALKI</Text>
      <Text style={styles.subtitle}>Private internet walkie-talkie</Text>
      {signup && (
        <TextInput
          placeholder="Display name"
          placeholderTextColor="#777"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
      )}
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#777"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        secureTextEntry
        placeholder="Password"
        placeholderTextColor="#777"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <Button title={busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'} onPress={submit} disabled={busy} />
      <Button
        title={signup ? 'I already have an account' : 'Create a new account'}
        secondary
        onPress={() => setSignup(v => !v)}
        disabled={busy}
      />
      <Button
        title="Health check"
        secondary
        onPress={async () => {
          try {
            const h = await healthCheck();
            Alert.alert('Server OK', JSON.stringify(h));
          } catch (e: any) {
            Alert.alert('Server error', e?.message || 'Could not reach token server');
          }
        }}
      />
      <Text style={styles.note}>Supabase handles login. The trusted Vercel server verifies your session and room membership before issuing a LiveKit voice token.</Text>
    </ScrollView>
  );
}

function HomeScreen({ session, onSignOut }: { session: AppSession; onSignOut: () => void }) {
  const [roomCode, setRoomCode] = useState('');
  const [busy, setBusy] = useState(false);
  const navigation = useNavigation<any>();

  const join = async () => {
    const code = roomCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      Alert.alert('Room code', 'Use a 6-character room code.');
      return;
    }
    setBusy(true);
    try {
      const accessToken = await currentAccessToken();
      await roomRequest(accessToken, 'join', code, session.displayName);
      navigation.navigate('Room', { roomId: code, session });
    } catch (e: any) {
      Alert.alert('Join failed', e?.message || 'Could not join room');
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      const accessToken = await currentAccessToken();
      const r = await roomRequest(accessToken, 'create');
      navigation.navigate('Room', { roomId: r.roomId, session });
    } catch (e: any) {
      Alert.alert('Create failed', e?.message || 'Could not create room');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.center}>
      <Text style={styles.title}>Hi {session.displayName}</Text>
      <Text style={styles.subtitle}>Create a private room or enter a 6-character code.</Text>
      <Button title={busy ? 'Please wait…' : 'Create room'} onPress={create} disabled={busy} />
      <TextInput
        autoCapitalize="characters"
        maxLength={6}
        placeholder="ROOM CODE"
        placeholderTextColor="#777"
        value={roomCode}
        onChangeText={setRoomCode}
        style={[styles.input, styles.codeInput]}
      />
      <Button title="Join room" onPress={join} disabled={busy} />
      <Button title="Sign out" secondary onPress={onSignOut} disabled={busy} />
    </ScrollView>
  );
}

function RoomInner({ roomId }: { roomId: string }) {
  const room = useRoomContext();
  const navigation = useNavigation<any>();
  const connection = useConnectionState();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const [mic, setMic] = useState(isMicrophoneEnabled);
  const [ptt, setPtt] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMic(isMicrophoneEnabled);
  }, [isMicrophoneEnabled]);

  useEffect(() => {
    const onDisconnected = () => setError('Disconnected from voice server.');
    const onReconnecting = () => setError('Reconnecting…');
    const onReconnected = () => setError('');
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
    };
  }, [room]);

  const setMicrophone = async (enabled: boolean) => {
    try {
      await localParticipant.setMicrophoneEnabled(enabled);
      setMic(enabled);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Microphone failed');
    }
  };

  const leave = () => navigation.goBack();
  const share = async () => Share.share({ message: `Join my Walkie Talkie room: ${roomId}` });
  const copy = async () => {
    await Clipboard.setStringAsync(roomId);
    Alert.alert('Copied', 'Room code copied.');
  };

  const status = connection === ConnectionState.Connected ? 'Connected' : String(connection);

  return (
    <View style={styles.room}>
      <View style={styles.roomHeader}>
        <View>
          <Text style={styles.roomTitle}>{roomId}</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
        <Pressable onPress={share}><Text style={styles.share}>Share</Text></Pressable>
      </View>

      {!!error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry mic" onPress={() => setMicrophone(mic)} />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>People ({participants.length})</Text>
        {participants.length === 0 ? (
          <Text style={styles.dim}>Waiting for someone to join…</Text>
        ) : (
          participants.map(p => (
            <View key={p.identity} style={styles.person}>
              <View style={[styles.dot, { opacity: p.isSpeaking ? 1 : 0.35 }]} />
              <Text style={styles.personText}>
                {p.name || p.identity}{p.isSpeaking ? '  • speaking' : ''}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPressIn={() => { setPtt(true); setMicrophone(true); }}
          onPressOut={() => { setPtt(false); setMicrophone(false); }}
          style={[styles.ptt, ptt && styles.pttOn]}
        >
          <Text style={styles.pttText}>{ptt ? 'TALKING' : 'HOLD TO TALK'}</Text>
        </Pressable>
        <Button title={mic ? 'Mic ON' : 'Mic OFF'} secondary onPress={() => setMicrophone(!mic)} />
        <Button title="Copy code" secondary onPress={copy} />
        <Button title="Leave room" secondary onPress={leave} />
      </View>

      <Text style={styles.note}>Multiple people can speak at the same time. Android shows a foreground notification while an active voice room is kept alive in the background. Force-stop and some OEM battery policies can still terminate any app.</Text>
    </View>
  );
}

function RoomScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { roomId, session } = route.params as { roomId: string; session: AppSession };
  const [token, setToken] = useState<string>();
  const [ws, setWs] = useState<string>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const serviceStarted = useRef(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await requestAndroidVoicePermissions();
        await AudioSession.startAudioSession();
        const accessToken = await currentAccessToken();
        const r = await getLiveKitToken(accessToken, roomId, session.displayName || session.email);

        if (!alive) return;
        setToken(r.token);
        setWs(r.wsUrl);

        if (Platform.OS === 'android' && !serviceStarted.current) {
          ReactNativeForegroundService.start({
            id: 4001,
            title: 'Walkie Talkie is connected',
            message: `Voice room ${roomId} is active`,
            icon: 'ic_launcher',
            setOnlyAlertOnce: true,
            color: '#111111'
          });
          serviceStarted.current = true;
        }
      } catch (e: any) {
        if (alive) setError(e?.message || 'Could not join room');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      if (Platform.OS === 'android' && serviceStarted.current) {
        ReactNativeForegroundService.stop().catch(() => {});
        serviceStarted.current = false;
      }
      AudioSession.stopAudioSession().catch(() => {});
    };
  }, [roomId, session]);

  if (loading) {
    return <View style={styles.center}><Text style={styles.title}>Joining {roomId}…</Text></View>;
  }

  if (error || !token || !ws) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Could not join</Text>
        <Text style={styles.note}>{error || 'Missing LiveKit server configuration.'}</Text>
        <Button title="Try again" onPress={() => navigation.replace('Room', { roomId, session })} />
        <Button title="Back" secondary onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={ws}
      token={token}
      connect
      options={{ adaptiveStream: true, dynacast: true }}
      audio
      video={false}
    >
      <RoomInner roomId={roomId} />
    </LiveKitRoom>
  );
}

export default function App() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      if (!supabase) {
        if (mounted) setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (mounted && data.session?.user) {
        const profile = profileFromAuth(data.session.user);
        setSession(profile);
        await saveProfile(profile);
      } else if (mounted) {
        const saved = await loadProfile();
        if (saved) setSession(saved);
      }
      if (mounted) setReady(true);
    };

    bootstrap();

    const subscription = supabase?.auth.onAuthStateChange(async (_event, authSession) => {
      if (!mounted) return;
      if (authSession?.user) {
        const profile = profileFromAuth(authSession.user);
        await saveProfile(profile);
        setSession(profile);
      } else {
        setSession(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    await clearProfile();
    setSession(null);
  };

  if (!ready) return <View style={styles.center}><Text style={styles.title}>Starting…</Text></View>;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Home">
              {() => <HomeScreen session={session} onSignOut={signOut} />}
            </Stack.Screen>
            <Stack.Screen name="Room" component={RoomScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth">
            {() => <AuthScreen onSignedIn={setSession} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0b0d10' },
  logo: { fontSize: 36, fontWeight: '900', letterSpacing: 2, color: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#9aa4b2', marginBottom: 22, textAlign: 'center' },
  input: { width: '100%', backgroundColor: '#171b21', borderRadius: 14, padding: 15, color: '#fff', marginBottom: 12, borderWidth: 1, borderColor: '#252b34' },
  codeInput: { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 8 },
  button: { width: '100%', padding: 15, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', marginVertical: 6 },
  buttonSecondary: { backgroundColor: '#171b21', borderWidth: 1, borderColor: '#303743' },
  buttonText: { fontSize: 16, fontWeight: '800', color: '#0b0d10' },
  buttonSecondaryText: { color: '#fff' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  note: { color: '#77808d', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 18 },
  room: { flex: 1, backgroundColor: '#0b0d10', padding: 18, paddingTop: 55 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  roomTitle: { fontSize: 30, fontWeight: '900', letterSpacing: 4, color: '#fff' },
  status: { fontSize: 12, color: '#7f8a98', marginTop: 4 },
  share: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: '#151920', borderRadius: 18, padding: 16, marginBottom: 16 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 10 },
  dim: { color: '#707a88' },
  person: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', marginRight: 10 },
  personText: { color: '#fff', fontSize: 15 },
  controls: { marginTop: 'auto' },
  ptt: { height: 170, borderRadius: 85, backgroundColor: '#1a1f27', borderWidth: 2, borderColor: '#343c49', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  pttOn: { backgroundColor: '#fff' },
  pttText: { fontSize: 22, fontWeight: '900', color: '#0b0d10' },
  error: { backgroundColor: '#2a1717', padding: 12, borderRadius: 12, marginBottom: 12 },
  errorText: { color: '#ffb4b4', marginBottom: 6 }
});
