
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { Input } from '@/components/Input';
import { colors } from '@/lib/theme';
import { createRoom } from '@/lib/rooms';
import { getCurrentUser } from '@/lib/auth';

export default function CreateRoomScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function onCreate() {
    if (!name.trim()) return Alert.alert('Room name required', 'Enter a name.');
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) throw new Error('Please log in again.');
      const room = await createRoom(name, user.id);
      router.replace(`/room/${room.id}`);
    } catch (e: any) {
      Alert.alert('Could not create room', e?.message ?? 'Try again.');
    } finally { setLoading(false); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a room</Text>
      <Text style={styles.subtitle}>The app will generate a private code for your friends.</Text>
      <View style={styles.form}>
        <Input label="ROOM NAME" placeholder="Friends" value={name} onChangeText={setName} />
        <AppButton title={loading ? 'Creating…' : 'Create room'} onPress={onCreate} disabled={loading} />
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
