
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { Input } from '@/components/Input';
import { colors } from '@/lib/theme';
import { signUp } from '@/lib/auth';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signup() {
    if (!username.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Check details', 'Use a username, valid email, and password of at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      const data = await signUp(username, email, password);
      if (!data.session) {
        Alert.alert('Account created', 'Check your email if email confirmation is enabled, then log in.');
        router.replace('/login');
      } else {
        router.replace('/home');
      }
    } catch (e: any) {
      Alert.alert('Signup failed', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Your username appears to friends inside rooms.</Text>
      <View style={styles.form}>
        <Input label="USERNAME" placeholder="Yash" value={username} onChangeText={setUsername} />
        <Input label="EMAIL" placeholder="you@example.com" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input label="PASSWORD" placeholder="At least 6 characters" secureTextEntry value={password} onChangeText={setPassword} />
        <AppButton title={loading ? 'Creating…' : 'Create account'} onPress={signup} disabled={loading} />
        <AppButton title="Back to login" secondary onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.background, justifyContent: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, marginTop: 8, lineHeight: 21 },
  form: { marginTop: 28 },
});
