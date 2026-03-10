import { View, Text, StyleSheet } from 'react-native';

import { colors, fontSizes, fontWeights } from '@/constants/theme';

type ProgressRingProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  completed?: boolean;
};

export function ProgressRing({
  progress,
  size = 200,
  strokeWidth = 14,
  label,
  sublabel,
  completed = false,
}: ProgressRingProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filledLength = circumference * clampedProgress;

  const segmentCount = 60;
  const segmentAngle = 360 / segmentCount;
  const filledSegments = Math.round(clampedProgress * segmentCount);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.ringTrack, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth }]} />

      {Array.from({ length: segmentCount }, (_, i) => {
        const angle = (i * segmentAngle - 90) * (Math.PI / 180);
        const isFilled = i < filledSegments;
        const dotSize = strokeWidth * 0.6;
        const dotRadius = radius;
        const x = size / 2 + dotRadius * Math.cos(angle) - dotSize / 2;
        const y = size / 2 + dotRadius * Math.sin(angle) - dotSize / 2;

        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                left: x,
                top: y,
                backgroundColor: isFilled
                  ? completed
                    ? colors.success
                    : colors.primary
                  : colors.border,
              },
            ]}
          />
        );
      })}

      <View style={styles.labelContainer}>
        {label ? (
          <Text style={[styles.label, completed && styles.labelCompleted]}>{label}</Text>
        ) : null}
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    position: 'relative',
  },
  ringTrack: {
    position: 'absolute',
    borderColor: 'transparent',
  },
  dot: {
    position: 'absolute',
  },
  labelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSizes['5xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  },
  labelCompleted: {
    color: colors.success,
  },
  sublabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
