import { StyleSheet, TextInput, type TextInputProps, View, Text } from 'react-native';
import { colors, fontSizes, heights, radii } from '@/constants/theme';

type InputVariant = 'pill' | 'box';

type InputProps = TextInputProps & {
  variant?: InputVariant;
  error?: string;
};

export function Input({ variant = 'pill', error, style, ...props }: InputProps) {
  const variantStyle = variant === 'pill' ? styles.pill : styles.box;
  return (
    <View>
      <TextInput
        placeholderTextColor={colors.inputPlaceholder}
        {...props}
        style={[styles.base, variantStyle, error ? styles.errorBorder : undefined, style]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: fontSizes['2xl'],
    color: colors.primaryDark,
    paddingHorizontal: 24,
  },
  pill: {
    height: heights.input,
    borderRadius: radii.pill,
    backgroundColor: colors.inputBackground,
  },
  box: {
    height: heights.inputSmall,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: '#ffffff',
    fontSize: fontSizes.lg,
    paddingHorizontal: 14,
  },
  errorBorder: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    marginTop: 4,
    marginLeft: 12,
  },
});
