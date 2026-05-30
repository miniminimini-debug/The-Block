import { createTamagui, createTokens, createTheme } from '@tamagui/core';
import { createAnimations } from '@tamagui/animations-reanimated';
import { shorthands } from '@tamagui/shorthands';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { palette, spacing, radius, fontSize } from './tokens';

const animations = createAnimations({
  fast: {
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
  medium: {
    damping: 18,
    mass: 1,
    stiffness: 180,
  },
  slow: {
    damping: 15,
    mass: 1,
    stiffness: 100,
  },
  bouncy: {
    damping: 12,
    mass: 0.8,
    stiffness: 200,
  },
  lazy: {
    damping: 25,
    mass: 1.5,
    stiffness: 80,
  },
});

const tokens = createTokens({
  color: {
    // Background hierarchy
    bg0: palette.void,
    bg1: palette.ink,
    bg2: palette.night,
    bg3: palette.dusk,
    bg4: palette.twilight,
    bg5: palette.slate,

    // Surface
    surface1: palette.slate,
    surface2: palette.mist,
    surface3: palette.fog,

    // Brand
    brand: palette.lavender500,
    brandLight: palette.lavender300,
    brandDark: palette.lavender700,

    // Gold
    gold: palette.gold500,
    goldLight: palette.gold300,

    // Text
    textPrimary: palette.snow,
    textSecondary: palette.silver,
    textTertiary: palette.ash,
    textInverse: palette.ink,

    // Status
    success: palette.success,
    error: palette.error,
    warning: palette.warning,

    // Moods
    moodCozy: palette.moodCozy,
    moodHappy: palette.moodHappy,
    moodReflective: palette.moodReflective,
    moodAdventurous: palette.moodAdventurous,
    moodMelancholic: palette.moodMelancholic,
    moodExcited: palette.moodExcited,
    moodPeaceful: palette.moodPeaceful,
    moodNostalgic: palette.moodNostalgic,

    // Transparent shades
    overlay: 'rgba(8, 8, 15, 0.7)',
    overlayLight: 'rgba(8, 8, 15, 0.4)',
  },
  space: {
    ...spacing,
    true: spacing[4],
  },
  size: {
    ...spacing,
    true: spacing[4],
  },
  radius: {
    ...radius,
    true: radius[3],
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
});

const darkTheme = createTheme({
  background: palette.ink,
  backgroundStrong: palette.void,
  backgroundHover: palette.dusk,
  backgroundPress: palette.twilight,
  backgroundFocus: palette.slate,
  backgroundTransparent: 'transparent',
  color: palette.snow,
  colorHover: palette.white,
  colorPress: palette.silver,
  colorFocus: palette.white,
  colorTransparent: 'transparent',
  borderColor: palette.slate,
  borderColorHover: palette.mist,
  borderColorFocus: palette.lavender500,
  borderColorPress: palette.slate,
  placeholderColor: palette.ash,
  shadowColor: palette.void,
  shadowColorHover: palette.void,
});

// Night/late-night theme — deeper, more purple
const nightTheme = createTheme({
  ...darkTheme,
  background: palette.void,
  backgroundStrong: '#060609',
  backgroundHover: palette.ink,
  borderColor: palette.lavender900,
  borderColorHover: palette.lavender800,
});

// Golden hour theme — warm amber overlay
const goldenTheme = createTheme({
  ...darkTheme,
  background: '#130E04',
  backgroundStrong: '#0A0702',
  backgroundHover: '#1E1508',
  borderColor: palette.gold900,
  borderColorHover: palette.gold800,
  borderColorFocus: palette.gold500,
});

// Spring theme — slightly greenish tint
const springTheme = createTheme({
  ...darkTheme,
  background: '#0D140D',
  backgroundStrong: '#090F09',
  borderColor: '#1A2E1A',
});

const tamaguiConfig = createTamagui({
  animations,
  defaultTheme: 'dark',
  shouldAddPrefersColorTheme: false,
  themeClassNameOnRoot: false,
  shorthands,
  fonts: {
    heading: {
      family: 'Inter',
      size: {
        1: fontSize.sm,
        2: fontSize.md,
        3: fontSize.lg,
        4: fontSize.xl,
        5: fontSize['2xl'],
        6: fontSize['3xl'],
        7: fontSize['4xl'],
        8: fontSize['5xl'],
        true: fontSize.lg,
      },
      lineHeight: {
        1: 16,
        2: 20,
        3: 24,
        4: 28,
        5: 32,
        6: 40,
        7: 48,
        8: 60,
        true: 24,
      },
      weight: {
        1: '400',
        2: '400',
        3: '500',
        4: '600',
        5: '700',
        6: '700',
        7: '700',
        8: '700',
        true: '600',
      },
      letterSpacing: {
        1: 0,
        2: 0,
        3: -0.3,
        4: -0.5,
        5: -0.8,
        6: -1,
        7: -1.5,
        8: -2,
        true: -0.3,
      },
      face: {
        400: { normal: 'Inter_400Regular' },
        500: { normal: 'Inter_500Medium' },
        600: { normal: 'Inter_600SemiBold' },
        700: { normal: 'Inter_700Bold' },
      },
    },
    body: {
      family: 'Inter',
      size: {
        1: fontSize.xs,
        2: fontSize.sm,
        3: fontSize.md,
        4: fontSize.lg,
        5: fontSize.xl,
        true: fontSize.md,
      },
      lineHeight: {
        1: 16,
        2: 18,
        3: 22,
        4: 26,
        5: 30,
        true: 22,
      },
      weight: {
        1: '400',
        2: '400',
        3: '400',
        4: '500',
        5: '500',
        true: '400',
      },
      face: {
        400: { normal: 'Inter_400Regular' },
        500: { normal: 'Inter_500Medium' },
        600: { normal: 'Inter_600SemiBold' },
        700: { normal: 'Inter_700Bold' },
      },
    },
  },
  tokens,
  themes: {
    dark: darkTheme,
    night: nightTheme,
    golden: goldenTheme,
    spring: springTheme,
  },
  media: {
    xs: { maxWidth: 375 },
    sm: { maxWidth: 430 },
    md: { maxWidth: 768 },
    lg: { maxWidth: 1024 },
    short: { maxHeight: 700 },
    tall: { minHeight: 800 },
  },
});

export type AppConfig = typeof tamaguiConfig;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
