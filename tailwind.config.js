/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        block: {
          // Background layers (darkest → lightest)
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

          // Brand purple
          lavender: '#6B52E0',
          'lavender-light': '#A99BFF',
          'lavender-pale': '#C8C0FF',
          'lavender-dark': '#321F8A',
          'lavender-900': '#1A1240',
          'lavender-800': '#241860',
          'lavender-600': '#4C32C0',
          'lavender-400': '#8B76F0',
          'lavender-300': '#A99BFF',

          // Warm gold
          gold: '#E09600',
          'gold-light': '#FFCE70',
          'gold-warm': '#FFB830',
          'gold-pale': '#FFF3D0',

          // Moods
          cozy: '#FF8C42',
          happy: '#FFD93D',
          reflective: '#9BB8D4',
          adventurous: '#6BCB77',
          melancholic: '#7C6FAB',
          excited: '#FF6B6B',
          peaceful: '#A8E6CF',
          nostalgic: '#C5A3A3',

          // Status
          success: '#4ADE80',
          error: '#FF6B6B',

          // Polaroid surface — the warm cream paper feel
          'polaroid': '#F5F0E8',
          'polaroid-border': '#E8E0D0',
          'polaroid-strip': '#F0EAE0',
          'polaroid-text': '#2A1F0F',
          'polaroid-sub': '#6B5A48',

          // Film / developing state
          'film-sepia': '#C9A96E',
          'film-fog': '#D4C9B4',
        },
      },
      fontFamily: {
        sans: ['Inter_400Regular', 'sans-serif'],
        medium: ['Inter_500Medium', 'sans-serif'],
        semibold: ['Inter_600SemiBold', 'sans-serif'],
        bold: ['Inter_700Bold', 'sans-serif'],
      },
      fontSize: {
        'xs': [11, { lineHeight: 16 }],
        'sm': [13, { lineHeight: 18 }],
        'base': [15, { lineHeight: 22 }],
        'md': [15, { lineHeight: 22 }],
        'lg': [17, { lineHeight: 24 }],
        'xl': [20, { lineHeight: 28 }],
        '2xl': [24, { lineHeight: 32 }],
        '3xl': [30, { lineHeight: 38 }],
        '4xl': [36, { lineHeight: 44 }],
        '5xl': [48, { lineHeight: 56 }],
      },
      borderRadius: {
        'xl': 16,
        '2xl': 20,
        '3xl': 24,
      },
    },
  },
  plugins: [],
};
