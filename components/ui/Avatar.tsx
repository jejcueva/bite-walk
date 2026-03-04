import { Image, type ImageStyle, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fontWeights } from '@/constants/theme';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
  uri?: string | null;
  initials?: string;
  size?: AvatarSize;
  style?: ViewStyle;
};

const sizeMap: Record<AvatarSize, number> = {
  sm: 36,
  md: 56,
  lg: 86,
};

const fontSizeMap: Record<AvatarSize, number> = {
  sm: 14,
  md: 20,
  lg: 30,
};

export function Avatar({ uri, initials, size = 'md', style }: AvatarProps) {
  const dim = sizeMap[size];
  const radius = dim / 2;
  const fontSize = fontSizeMap[size];

  const containerStyle: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: radius,
  };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, containerStyle as ImageStyle]}
      />
    );
  }

  return (
    <View style={[styles.base, styles.placeholder, containerStyle, style]}>
      <Text style={[styles.initials, { fontSize }]}>{initials ?? '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    overflow: 'hidden' as const,
  },
  base: {
    overflow: 'hidden' as const,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    backgroundColor: colors.backgroundLight,
  },
  initials: {
    color: colors.primaryLight,
    fontWeight: fontWeights.bold,
  },
});
