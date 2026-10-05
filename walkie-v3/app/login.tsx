
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { Input } from '@/components/Input';
import { colors } from '@/lib/theme';
import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email || !password) {
      Alert.alert('Missing details', 'Enter email and password.');
      return;
    }
    try {
      setLoading(true);
      await signIn(email, password);
      router.replace('/home');
    } catch (e: any) {
      Alert.alert('Login failed', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.logo}>◉</Text>
        <Text style={styles.title}>Walkie Talkie</Text>
        <Text style={styles.subtitle}>Private voice channels for your crew.</Text>
      </View>
      <View style={styles.form}>
        <Input label="EMAIL" placeholder="you@example.com" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input label="PASSWORD" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        <AppButton title={loading ? 'Logging in…' : 'Log in'} onPress={login} disabled={loading} />
        <AppButton title="Create account" secondary onPress={() => router.push('/signup')} />
      </View>
      <Text style={styles.note}>Day 3 • Real Supabase authentication</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between', backgroundColor: colors.background },
  logo: { color: colors.primary, fontSize: 48, marginTop: 40 },
  title: { color: colors.text, fontSize: 34, fontWeight: '800', marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 8, lineHeight: 22 },
  form: { marginTop: 30 },
  note: { color: colors.muted, textAlign: 'center', fontSize: 12, marginBottom: 8 },
});
