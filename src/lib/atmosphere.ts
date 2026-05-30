// Atmosphere system: controls visual mood, colors, and lighting based on time of day
// This drives the entire emotional experience

import React from 'react';

export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'golden' | 'dusk' | 'night' | 'midnight';
export type WeatherCondition = 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'foggy';

export interface Atmosphere {
  timeOfDay: TimeOfDay;
  weather: WeatherCondition;
  ambientLight: number; // 0-1
  skyGradient: [string, string];
  buildingGlow: number; // 0-1, intensity of window glows
  starOpacity: number; // 0-1
  streetLampGlow: number; // 0-1
  rainIntensity: number; // 0-1
  emotionalTone: string; // poetic description
  primaryColor: string; // dominant mood color
  secondaryColor: string;
  accentColor: string;
  animationSpeed: number; // multiplier for all animations
}

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 18) return 'golden';
  if (hour >= 18 && hour < 21) return 'dusk';
  if (hour >= 21 && hour < 23) return 'night';
  return 'midnight';
}

function getWeatherCondition(): WeatherCondition {
  // For MVP, randomize. Later connect to actual weather
  const conditions: WeatherCondition[] = ['clear', 'cloudy', 'rainy', 'foggy'];
  return conditions[Math.floor(Math.random() * conditions.length)];
}

export function getAtmosphere(overrideTime?: TimeOfDay, overrideWeather?: WeatherCondition): Atmosphere {
  const timeOfDay = overrideTime || getTimeOfDay();
  const weather = overrideWeather || getWeatherCondition();

  const baseAtmospheres: Record<TimeOfDay, Omit<Atmosphere, 'weather' | 'rainIntensity'>> = {
    dawn: {
      timeOfDay: 'dawn',
      ambientLight: 0.15,
      skyGradient: ['#0A0E27', '#1a0a3e'] as [string, string],
      buildingGlow: 0.8,
      starOpacity: 0.4,
      streetLampGlow: 0.6,
      emotionalTone: 'quiet awakening, hopes stirring',
      primaryColor: '#4A3A8A',
      secondaryColor: '#2D1B4E',
      accentColor: '#8B7FD9',
      animationSpeed: 0.5,
    },
    morning: {
      timeOfDay: 'morning',
      ambientLight: 0.4,
      skyGradient: ['#1a2a5e', '#3a5a9e'] as [string, string],
      buildingGlow: 0.5,
      starOpacity: 0.1,
      streetLampGlow: 0.3,
      emotionalTone: 'fresh beginnings, soft light',
      primaryColor: '#5A7ACE',
      secondaryColor: '#3A4A8E',
      accentColor: '#9ABAEE',
      animationSpeed: 0.7,
    },
    noon: {
      timeOfDay: 'noon',
      ambientLight: 0.85,
      skyGradient: ['#4a7ace', '#7aaaee'] as [string, string],
      buildingGlow: 0.2,
      starOpacity: 0,
      streetLampGlow: 0,
      emotionalTone: 'clarity, presence, daytime energy',
      primaryColor: '#7ABAEE',
      secondaryColor: '#5A8ACE',
      accentColor: '#AADAFF',
      animationSpeed: 1,
    },
    afternoon: {
      timeOfDay: 'afternoon',
      ambientLight: 0.75,
      skyGradient: ['#5a7acf', '#8aaadf'] as [string, string],
      buildingGlow: 0.3,
      starOpacity: 0,
      streetLampGlow: 0.1,
      emotionalTone: 'productive, warm light shifting',
      primaryColor: '#8ABADF',
      secondaryColor: '#6A9ACF',
      accentColor: '#BADAFF',
      animationSpeed: 0.9,
    },
    golden: {
      timeOfDay: 'golden',
      ambientLight: 0.5,
      skyGradient: ['#5a4a3e', '#9a6a4e'] as [string, string],
      buildingGlow: 0.65,
      starOpacity: 0.1,
      streetLampGlow: 0.4,
      emotionalTone: 'magic hour, wistful, nostalgic',
      primaryColor: '#CA8A5A',
      secondaryColor: '#9A6A4A',
      accentColor: '#E0B080',
      animationSpeed: 0.8,
    },
    dusk: {
      timeOfDay: 'dusk',
      ambientLight: 0.25,
      skyGradient: ['#2a1a4e', '#5a2a6e'] as [string, string],
      buildingGlow: 0.85,
      starOpacity: 0.3,
      streetLampGlow: 0.7,
      emotionalTone: 'twilight magic, day transitioning',
      primaryColor: '#7A4A9E',
      secondaryColor: '#4A2A7E',
      accentColor: '#B07ADE',
      animationSpeed: 0.6,
    },
    night: {
      timeOfDay: 'night',
      ambientLight: 0.1,
      skyGradient: ['#08080F', '#0D0D14'] as [string, string],
      buildingGlow: 1.0,
      starOpacity: 0.8,
      streetLampGlow: 0.9,
      emotionalTone: 'late night comfort, intimacy',
      primaryColor: '#6B52E0',
      secondaryColor: '#1A1240',
      accentColor: '#A99BFF',
      animationSpeed: 0.7,
    },
    midnight: {
      timeOfDay: 'midnight',
      ambientLight: 0.05,
      skyGradient: ['#050508', '#0A0A10'] as [string, string],
      buildingGlow: 1.0,
      starOpacity: 1.0,
      streetLampGlow: 0.8,
      emotionalTone: 'deep night, solitude, stillness',
      primaryColor: '#3D2A6B',
      secondaryColor: '#0D0D14',
      accentColor: '#8B76F0',
      animationSpeed: 0.5,
    },
  };

  const base = baseAtmospheres[timeOfDay];

  // Weather modifiers
  let rainIntensity = 0;
  let skyGradient = base.skyGradient;
  let buildingGlow = base.buildingGlow;
  let ambientLight = base.ambientLight;

  if (weather === 'rainy') {
    rainIntensity = 0.6;
    ambientLight *= 0.7;
    buildingGlow *= 1.1;
    skyGradient = [
      base.skyGradient[0].replace(/#(.{2})(.{2})(.{2})/, (match, r, g, b) => {
        const r1 = Math.max(0, parseInt(r, 16) - 20).toString(16).padStart(2, '0');
        const g1 = Math.max(0, parseInt(g, 16) - 20).toString(16).padStart(2, '0');
        const b1 = Math.max(0, parseInt(b, 16) - 10).toString(16).padStart(2, '0');
        return `#${r1}${g1}${b1}`;
      }),
      base.skyGradient[1].replace(/#(.{2})(.{2})(.{2})/, (match, r, g, b) => {
        const r1 = Math.max(0, parseInt(r, 16) - 20).toString(16).padStart(2, '0');
        const g1 = Math.max(0, parseInt(g, 16) - 20).toString(16).padStart(2, '0');
        const b1 = Math.max(0, parseInt(b, 16) - 10).toString(16).padStart(2, '0');
        return `#${r1}${g1}${b1}`;
      }),
    ] as [string, string];
  } else if (weather === 'foggy') {
    rainIntensity = 0.3;
    ambientLight *= 0.85;
    buildingGlow *= 0.9;
  } else if (weather === 'stormy') {
    rainIntensity = 0.9;
    ambientLight *= 0.6;
    buildingGlow *= 1.15;
  }

  return {
    ...base,
    weather,
    rainIntensity,
    skyGradient,
    buildingGlow,
    ambientLight,
  };
}

// Hook for components to reactively get atmosphere
export function useAtmosphere() {
  const [atmosphere, setAtmosphere] = React.useState(() => getAtmosphere());

  React.useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setAtmosphere(getAtmosphere());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return atmosphere;
}
