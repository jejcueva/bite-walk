import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fontSizes, fontWeights, spacing } from '@/constants/theme';

type BadgeVariant = 'default' | 'success' | 'premium';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
};

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: colors.backgroundCard, text: colors.primaryDark },
  success: { bg: colors.success, text: colors.textOnPrimary },
  premium: { bg: colors.accent, text: colors.textOnPrimary },
};

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const vs = variantStyles[variant];
  return (
    <View style={[styles.container, { backgroundColor: vs.bg }, style]}>
      <Text style={[styles.label, { color: vs.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
});
