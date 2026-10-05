
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { Input } from '@/components/Input';
import { colors } from '@/lib/theme';
import { joinRoom } from '@/lib/rooms';
import { getCurrentUser } from '@/lib/auth';

export default function JoinRoomScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function onJoin() {
    if (code.trim().length < 6) return Alert.alert('Invalid code', 'Enter the 6-character room code.');
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) throw new Error('Please log in again.');
      const room = await joinRoom(code);
      router.replace(`/room/${room.id}`);
    } catch (e: any) {
      Alert.alert('Could not join', e?.message ?? 'Check the code.');
    } finally { setLoading(false); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join a room</Text>
      <Text style={styles.subtitle}>Enter the code your friend shared with you.</Text>
      <View style={styles.form}>
        <Input label="ROOM CODE" placeholder="FRIENDS" autoCapitalize="characters" value={code} onChangeText={setCode} />
        <AppButton title={loading ? 'Joining…' : 'Join room'} onPress={onJoin} disabled={loading} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container:{flex:1,padding:24,backgroundColor:colors.background},
  title:{color:colors.text,fontSize:29,fontWeight:'800',marginTop:30},
  subtitle:{color:colors.muted,lineHeight:21,marginTop:8},
  form:{marginTop:28}
});
