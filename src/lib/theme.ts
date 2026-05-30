export type TimeOfDay = 'night' | 'dawn' | 'day' | 'dusk';

export interface AppTheme {
  timeOfDay: TimeOfDay;
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderActive: string;
  accent: string;
  accentLight: string;
  accentDim: string;
  text: string;
  textSub: string;
  textDim: string;
  textDimmer: string;
  success: string;
  skyEmoji: string;
  greeting: string;
}

export function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'dusk';
  return 'night';
}

export const THEMES: Record<TimeOfDay, AppTheme> = {
  night: {
    timeOfDay: 'night',
    bg: '#08080F',
    surface: '#12121C',
    surfaceElevated: '#1A1A28',
    border: '#2E2E48',
    borderActive: '#6B52E0',
    accent: '#6B52E0',
    accentLight: '#A99BFF',
    accentDim: '#1A1240',
    text: '#EEEEF8',
    textSub: '#7A7A9A',
    textDim: '#5A5A7A',
    textDimmer: '#3D3D5E',
    success: '#6BCB77',
    skyEmoji: '✦',
    greeting: 'good night',
  },
  dawn: {
    timeOfDay: 'dawn',
    bg: '#2A1A0A',
    surface: '#3A2410',
    surfaceElevated: '#4A2E14',
    border: '#6A4020',
    borderActive: '#D08040',
    accent: '#D08040',
    accentLight: '#F5C070',
    accentDim: '#2E1808',
    text: '#FFF8F0',        // warm white — excellent contrast
    textSub: '#D4B090',     // light warm tan — readable
    textDim: '#B08860',     // medium warm — still clear
    textDimmer: '#8A6840',  // darker warm — minimum readable
    success: '#6BAA77',
    skyEmoji: '🌅',
    greeting: 'good morning',
  },
  day: {
    timeOfDay: 'day',
    bg: '#1A3A5C',
    surface: '#1E4870',
    surfaceElevated: '#245880',
    border: '#2E6890',
    borderActive: '#F5C842',
    accent: '#F5C842',
    accentLight: '#FFE080',
    accentDim: '#1E3A58',
    text: '#FFFFFF',        // pure white — max contrast on blue
    textSub: '#D8EEFF',     // very light sky blue — clear
    textDim: '#A8C8E8',     // light blue — readable
    textDimmer: '#78A8CC',  // medium blue — just readable
    success: '#6BCB77',
    skyEmoji: '☀️',
    greeting: 'good afternoon',
  },
  dusk: {
    timeOfDay: 'dusk',
    bg: '#180820',
    surface: '#281030',
    surfaceElevated: '#34163C',
    border: '#4A2058',
    borderActive: '#C050C0',
    accent: '#C050C0',
    accentLight: '#E890E8',
    accentDim: '#240C30',
    text: '#FFF0FF',        // warm lavender white — clear
    textSub: '#D8A0D8',     // light violet — readable
    textDim: '#B078B0',     // medium violet — still clear
    textDimmer: '#885888',  // darker violet — minimum readable
    success: '#6BAA77',
    skyEmoji: '🌇',
    greeting: 'golden hour',
  },
};
