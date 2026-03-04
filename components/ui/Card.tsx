import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

type CardVariant = 'default' | 'highlighted';

type CardProps = ViewProps & {
  variant?: CardVariant;
};

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {
    backgroundColor: colors.backgroundLight,
  },
  highlighted: {
    backgroundColor: colors.backgroundCard,
  },
};

export function Card({ variant = 'default', style, children, ...props }: CardProps) {
  return (
    <View style={[styles.base, variantStyles[variant], style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
