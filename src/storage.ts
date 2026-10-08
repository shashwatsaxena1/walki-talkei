import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE = 'walkie.profile.v4';

export type Profile = {
  userId: string;
  email: string;
  displayName: string;
};

export async function saveProfile(profile: Profile) {
  await AsyncStorage.setItem(PROFILE, JSON.stringify(profile));
}

export async function loadProfile(): Promise<Profile | null> {
  const raw = await AsyncStorage.getItem(PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export async function clearProfile() {
  await AsyncStorage.removeItem(PROFILE);
}
