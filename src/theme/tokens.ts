// Design token system for The Block
// Drives Tamagui config. All values referenced by name, never hardcoded in components.

export const palette = {
  // Core neutrals — warm black base (feels cozy, not harsh)
  void: '#08080F',
  ink: '#0D0D14',
  night: '#12121C',
  dusk: '#1A1A28',
  twilight: '#222235',
  slate: '#2E2E48',
  mist: '#3D3D5E',
  fog: '#5A5A7A',
  ash: '#7A7A9A',
  silver: '#A0A0C0',
  cloud: '#C8C8E0',
  snow: '#EEEEF8',
  white: '#F8F8FF',

  // Accent — soft purple-lavender (The Block's signature)
  lavender900: '#1A1240',
  lavender800: '#241860',
  lavender700: '#321F8A',
  lavender600: '#4C32C0',
  lavender500: '#6B52E0',
  lavender400: '#8B76F0',
  lavender300: '#A99BFF',
  lavender200: '#C8C0FF',
  lavender100: '#E4E0FF',

  // Warm gold — golden hour lighting
  gold900: '#2A1800',
  gold800: '#4A2E00',
  gold700: '#7A4E00',
  gold600: '#B07200',
  gold500: '#E09600',
  gold400: '#FFB830',
  gold300: '#FFCE70',
  gold200: '#FFE0A0',
  gold100: '#FFF3D0',

  // Warm amber — cozy lamp glow
  amber500: '#FF8C42',
  amber400: '#FFB07A',
  amber300: '#FFD0A8',

  // Seasonal tints
  spring: '#A8E6CF',
  summer: '#FFD93D',
  fall: '#FF8C42',
  winter: '#9BB8D4',

  // Mood colors
  moodCozy: '#FF8C42',
  moodHappy: '#FFD93D',
  moodReflective: '#9BB8D4',
  moodAdventurous: '#6BCB77',
  moodMelancholic: '#7C6FAB',
  moodExcited: '#FF6B6B',
  moodPeaceful: '#A8E6CF',
  moodAnxious: '#C9A227',
  moodGrateful: '#F7B2BD',
  moodNostalgic: '#C5A3A3',

  // Polaroid surface — cream card background, warm paper feel
  polaroidBase: '#F5F0E8',
  polaroidBorder: '#E8E0D0',
  polaroidStrip: '#F0EAE0',
  polaroidText: '#2A1F0F',
  polaroidSubtext: '#6B5A48',
  polaroidShadow: '#B8A898',

  // Film grain / developing state
  filmSepia: '#C9A96E',
  filmFog: '#D4C9B4',
  filmDark: '#1A1208',

  // Utility
  success: '#4ADE80',
  error: '#FF6B6B',
  warning: '#FFC700',
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const radius = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const shadows = {
  glow: {
    shadowColor: palette.lavender400,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: palette.gold400,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

// Time-of-day ambient lighting multipliers
export const ambientLight = {
  morning: { tint: palette.amber300, opacity: 0.08 },
  afternoon: { tint: palette.white, opacity: 0.0 },
  golden: { tint: palette.gold300, opacity: 0.15 },
  night: { tint: palette.lavender900, opacity: 0.3 },
} as const;
