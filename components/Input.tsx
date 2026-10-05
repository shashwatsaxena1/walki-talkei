import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '@/lib/theme';

type Props = TextInputProps & {
  label: string;
};

export function Input({ label, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    color: colors.muted,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 15,
    fontSize: 16,
  },
});