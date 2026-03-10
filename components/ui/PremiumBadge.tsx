import { View, Text, StyleSheet } from 'react-native';

import { fontSizes, fontWeights, spacing, radii } from '@/constants/theme';

const premiumColors = {
  gold: '#b8860b',
  goldLight: '#d4a843',
  goldBg: '#fdf6e3',
  goldBorder: '#e6c85e',
} as const;

type PremiumBadgeProps = {
  isActive: boolean;
  variant?: 'label' | 'multiplier';
};

export function PremiumBadge({ isActive, variant = 'label' }: PremiumBadgeProps) {
  if (!isActive) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{variant === 'multiplier' ? '2x' : 'PRO'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: premiumColors.goldBg,
    borderWidth: 1,
    borderColor: premiumColors.goldBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: premiumColors.gold,
    letterSpacing: 0.5,
  },
});
