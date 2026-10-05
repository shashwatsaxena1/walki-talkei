import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AudioSession, RoomEvent } from '@livekit/react-native';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import { getLiveKitToken } from '../../lib/livekit';
import { colors } from '../../lib/theme';

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const roomRef = useRef<any>(null);

  const [connected, setConnected] = useState(false);
  const [talking, setTalking] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function connect() {
      try {
        setError('');
        await AudioSession.startAudioSession();
        try {
          ReactNativeForegroundService.start({
            id: 3001,
            title: 'Walkie Talkie',
            message: 'Voice room is active',
          });
        } catch {}

        const tokenServer = process.env.EXPO_PUBLIC_TOKEN_SERVER_URL || 'http://10.0.2.2:3000';
        const { token, url } = await getLiveKitToken(String(id), tokenServer);
        const livekit = await import('@livekit/react-native');
        if (!mounted) return;

        const room = new livekit.Room();
        roomRef.current = room;

        const updateParticipants = () => {
          if (!mounted) return;
          setParticipantCount(1 + room.remoteParticipants.size);
        };

        const updateSpeakers = (speakers: any[]) => {
          if (!mounted) return;
          setActiveSpeakers(
            speakers
              .map((participant) => participant.name || participant.identity)
              .filter(Boolean)
          );
        };

        room.on(RoomEvent.Connected, () => {
          if (!mounted) return;
          setConnected(true);
          updateParticipants();
        });
        room.on(RoomEvent.Disconnected, () => {
          if (!mounted) return;
          setConnected(false);
          setTalking(false);
          setMicEnabled(false);
          setParticipantCount(0);
          setActiveSpeakers([]);
        });
        room.on(RoomEvent.ParticipantConnected, updateParticipants);
        room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
        room.on(RoomEvent.ActiveSpeakersChanged, updateSpeakers);

        // LiveKit subscribes to remote audio tracks in the room, while AudioSession
        // routes the native audio to the phone speaker/earpiece.
        await room.connect(url, token);
        await room.localParticipant.setMicrophoneEnabled(false);

        if (mounted) {
          setConnected(true);
          updateParticipants();
        }
      } catch (e: any) {
        if (mounted) {
          const message = e?.message || 'Could not connect to room';
          setError(message);
          Alert.alert('Room error', message);
        }
      }
    }

    connect();

    return () => {
      mounted = false;
      const room = roomRef.current;
      if (room) {
        try {
          room.localParticipant.setMicrophoneEnabled(false);
          room.disconnect();
        } catch {}
      }
      roomRef.current = null;
      try { ReactNativeForegroundService.stop(); } catch {}
      AudioSession.stopAudioSession();
    };
  }, [id]);

  async function setMic(enabled: boolean) {
    const room = roomRef.current;
    if (!room || !connected) return;

    try {
      await room.localParticipant.setMicrophoneEnabled(enabled);
      setMicEnabled(enabled);
      setTalking(enabled);
    } catch (e: any) {
      Alert.alert('Microphone error', e?.message || 'Could not change microphone');
    }
  }

  function startTalking() {
    void setMic(true);
  }

  function stopTalking() {
    void setMic(false);
  }

  function leaveRoom() {
    try {
      roomRef.current?.localParticipant.setMicrophoneEnabled(false);
      roomRef.current?.disconnect();
    } catch {}
    try { ReactNativeForegroundService.stop(); } catch {}
    router.back();
  }

  const speakerText = activeSpeakers.length
    ? activeSpeakers.join(', ')
    : 'Nobody is speaking';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={leaveRoom} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>VOICE CHANNEL</Text>
          <Text style={styles.title}>{id}</Text>
        </View>
        <View style={[styles.dot, connected && styles.dotOn]} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{participantCount}</Text>
          <Text style={styles.statLabel}>PEOPLE</Text>
        </View>
        <View style={[styles.statCard, activeSpeakers.length > 0 && styles.speakingCard]}>
          <Text style={styles.statNumber}>{activeSpeakers.length}</Text>
          <Text style={styles.statLabel}>SPEAKING</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.status}>{connected ? 'Connected' : 'Connecting…'}</Text>
        <Text style={styles.info}>Multiple people can talk at the same time.</Text>
        <Text style={styles.subInfo}>Everyone in the room can hear active speakers.</Text>
        <Text numberOfLines={2} style={styles.speakers}>🎙 {speakerText}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.center}>
        <Pressable
          onPressIn={startTalking}
          onPressOut={stopTalking}
          disabled={!connected}
          style={({ pressed }) => [
            styles.talkButton,
            talking && styles.talkButtonActive,
            pressed && styles.pressed,
            !connected && styles.disabled,
          ]}
        >
          <Text style={styles.mic}>🎙️</Text>
          <Text style={styles.talkText}>{talking ? 'TALKING' : 'HOLD TO TALK'}</Text>
          <Text style={styles.hint}>{talking ? 'Release to mute' : 'Others can talk too'}</Text>
        </Pressable>

        <Pressable
          onPress={() => void setMic(!micEnabled)}
          disabled={!connected}
          style={[styles.muteButton, micEnabled && styles.muteButtonOn]}
        >
          <Text style={styles.muteText}>
            {micEnabled ? 'Mute microphone' : 'Turn microphone on'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Live audio • Simultaneous speakers enabled</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12 },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backText: { color: colors.text, fontSize: 34, lineHeight: 36 },
  headerText: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.muted },
  dotOn: { backgroundColor: '#22C55E' },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 18 },
  statCard: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  speakingCard: { borderColor: '#34D399' },
  statNumber: { color: colors.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  infoCard: { margin: 18, padding: 17, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  status: { color: colors.text, fontSize: 17, fontWeight: '800' },
  info: { color: colors.text, marginTop: 7, lineHeight: 20 },
  subInfo: { color: colors.muted, marginTop: 4, lineHeight: 19 },
  speakers: { color: '#B9E8D6', marginTop: 9, fontSize: 12, fontWeight: '700' },
  error: { color: '#FB7185', marginTop: 9 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  talkButton: { width: 220, height: 220, borderRadius: 110, backgroundColor: colors.surface2, borderWidth: 3, borderColor: '#2C5A83', alignItems: 'center', justifyContent: 'center' },
  talkButtonActive: { backgroundColor: '#1D6B54', borderColor: '#34D399' },
  pressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.45 },
  mic: { fontSize: 48 },
  talkText: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 10 },
  hint: { color: '#B8CCE0', fontSize: 12, marginTop: 5 },
  muteButton: { marginTop: 22, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 24, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  muteButtonOn: { backgroundColor: '#234B3F', borderColor: '#34D399' },
  muteText: { color: colors.text, fontWeight: '700' },
  footer: { padding: 18, alignItems: 'center' },
  footerText: { color: colors.muted, fontSize: 12 },
});
