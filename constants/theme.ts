// BiteWalk Design System
// Extracted from prototype mockups in MVPS-PROTOTYPES/

export const colors = {
  // Primary greens (from prototypes)
  primary: '#2f7f65',
  primaryDark: '#1d4c3e',
  primaryLight: '#4f9f84',

  // Backgrounds
  background: '#d9ece5',
  backgroundLight: '#eef7f2',
  backgroundCard: '#c7e3d9',
  surface: '#f7f9f8',

  // Inputs
  inputBackground: '#79c7ae',
  inputBorder: '#95bdad',
  inputPlaceholder: '#366b58',

  // Text
  textPrimary: '#1d4c3e',
  textSecondary: '#366b58',
  textMuted: '#4b6f62',
  textOnPrimary: '#ffffff',
  textBrand: '#2f7f65',

  // Accent
  accent: '#0f4a38',

  // Borders / dividers
  border: '#b4d8ca',
  borderTab: '#cce0d7',

  // Status
  error: '#9d2f2f',
  success: '#1f7a4f',

  // Social button
  socialBackground: '#eef7f2',
  socialBorder: '#2f7f65',
  socialText: '#1f4f3f',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 36,
  '5xl': 42,
  '6xl': 56,
} as const;

export const radii = {
  sm: 12,
  md: 14,
  lg: 18,
  pill: 29,
} as const;

export const fontSizes = {
  xs: 13,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 19,
  '2xl': 20,
  '3xl': 22,
  '4xl': 24,
  '5xl': 30,
  '6xl': 42,
  '7xl': 44,
  '8xl': 52,
} as const;

export const fontWeights = {
  normal: '400' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const heights = {
  input: 58,
  inputSmall: 50,
  button: 58,
  buttonSmall: 52,
  socialButton: 54,
} as const;
