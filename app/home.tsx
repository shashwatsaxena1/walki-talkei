
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/AppButton';
import { colors } from '@/lib/theme';
import { signOut } from '@/lib/auth';

export default function HomeScreen() {
  async function logout() {
    try { await signOut(); router.replace('/login'); }
    catch (e:any) { Alert.alert('Logout failed', e?.message ?? 'Try again.'); }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>PRIVATE CHANNELS</Text>
          <Text style={styles.title}>Ready to talk?</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>Y</Text></View>
      </View>

      <AppButton title="+  Create room" onPress={() => router.push('/create-room')} />
      <AppButton title="↗  Join with code" secondary onPress={() => router.push('/join-room')} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Multi-speaker voice is live</Text>
        <Text style={styles.cardText}>
          Create a private room, share its 6-character code, and talk with multiple people at the same time. Voice is powered by LiveKit and access is checked by the token server.
        </Text>
      </View>

      <AppButton title="Log out" secondary onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.background},
  content:{padding:20,paddingBottom:40},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:24},
  eyebrow:{color:colors.primary,fontSize:11,fontWeight:'800',letterSpacing:1.5},
  title:{color:colors.text,fontSize:27,fontWeight:'800',marginTop:5},
  avatar:{width:46,height:46,borderRadius:23,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},
  avatarText:{color:colors.text,fontSize:18,fontWeight:'800'},
  card:{padding:16,borderRadius:16,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,marginTop:14,marginBottom:14},
  cardTitle:{color:colors.text,fontSize:16,fontWeight:'800'},
  cardText:{color:colors.muted,lineHeight:20,fontSize:13,marginTop:7}
});
