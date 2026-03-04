import { Pressable, StyleSheet, Text, type ViewStyle, type TextStyle } from 'react-native';
import { colors, fontSizes, fontWeights, heights, radii } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'social';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
};

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: {
      backgroundColor: colors.primary,
      height: heights.button,
      borderRadius: radii.pill,
    },
    text: {
      color: colors.textOnPrimary,
      fontSize: fontSizes['4xl'],
      fontWeight: fontWeights.bold,
    },
  },
  secondary: {
    container: {
      backgroundColor: colors.primaryDark,
      height: heights.buttonSmall,
      borderRadius: radii.pill,
    },
    text: {
      color: colors.textOnPrimary,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      height: heights.buttonSmall,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    text: {
      color: colors.primary,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
    },
  },
  social: {
    container: {
      backgroundColor: colors.socialBackground,
      height: heights.socialButton,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.socialBorder,
    },
    text: {
      color: colors.socialText,
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.semibold,
    },
  },
};

export function Button({ title, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const vs = variantStyles[variant];
  return (
    <Pressable
      disabled={disabled}
      style={[styles.base, vs.container, disabled ? styles.disabled : undefined, style]}
      onPress={onPress}>
      <Text style={vs.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.75,
  },
});
