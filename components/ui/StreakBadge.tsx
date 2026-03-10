import { View, Text, StyleSheet } from 'react-native';

import { colors, fontSizes, fontWeights, spacing, radii } from '@/constants/theme';
import type { StreakStatus } from '@bitewalk/shared';

type StreakBadgeProps = {
  currentStreak: number;
  longestStreak: number;
  status: StreakStatus;
};

const STATUS_CONFIG: Record<StreakStatus, { icon: string; color: string; statusText: string }> = {
  active: { icon: '\u{1F525}', color: colors.success, statusText: 'Active' },
  at_risk: { icon: '\u{26A0}\u{FE0F}', color: '#c27a00', statusText: 'Complete today!' },
  broken: { icon: '\u{1F494}', color: colors.error, statusText: 'Start a new streak' },
  inactive: { icon: '\u{1F3AF}', color: colors.textMuted, statusText: 'No streak yet' },
};

export function StreakBadge({ currentStreak, longestStreak, status }: StreakBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.icon}>{config.icon}</Text>
        <View style={styles.textBlock}>
          <Text style={styles.streakCount}>
            {currentStreak} day{currentStreak !== 1 ? 's' : ''}
          </Text>
          <Text style={[styles.statusText, { color: config.color }]}>{config.statusText}</Text>
        </View>
        <View style={styles.bestBlock}>
          <Text style={styles.bestLabel}>Best</Text>
          <Text style={styles.bestValue}>{longestStreak}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    fontSize: 32,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  streakCount: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  statusText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  bestBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
  },
  bestLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: fontWeights.semibold,
  },
  bestValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
});
