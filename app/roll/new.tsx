import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@hooks/useTheme';

type BgOption = { color: string; label: string };

const BG_BY_TIME: Record<'day' | 'dawnDusk' | 'night', BgOption[]> = {
  day: [
    { color: '#FFF4B0', label: 'lemon' },
    { color: '#C8EEC0', label: 'sage'  },
    { color: '#FFD0E4', label: 'blush' },
    { color: '#FFFDF5', label: 'cream' },
  ],
  dawnDusk: [
    { color: '#C8785A', label: 'terracotta' },
    { color: '#9078B8', label: 'lavender'   },
    { color: '#C87890', label: 'rose'       },
    { color: '#C8A060', label: 'amber'      },
  ],
  night: [
    { color: '#1E2A4A', label: 'navy'   },
    { color: '#2A1A3A', label: 'violet' },
    { color: '#1A3028', label: 'forest' },
    { color: '#3A1A28', label: 'wine'   },
  ],
};

function isLightColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export default function PhotoBoothSetupScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const tod = theme.timeOfDay;
  const options = tod === 'day' ? BG_BY_TIME.day
    : (tod === 'dawn' || tod === 'dusk') ? BG_BY_TIME.dawnDusk
    : BG_BY_TIME.night;
  const [selected, setSelected] = useState(options[0].color);
  const light = isLightColor(selected);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/roll/booth?bg=${selected.replace('#', '')}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#08080F', paddingTop: insets.top }}>
      <LinearGradient
        colors={['#08080F', '#0D0D14', '#1A1240']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Back */}
      <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 15, color: '#7A7A9A', fontFamily: 'Inter_400Regular' }}>cancel</Text>
      </Pressable>

      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 40 }}>
        {/* Title */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 180 }}
          style={{ alignItems: 'center', gap: 8 }}
        >
          <Text style={{ fontSize: 32, fontFamily: 'Inter_700Bold', color: '#EEEEF8', letterSpacing: -1 }}>
            photo booth
          </Text>
          <Text style={{ fontSize: 14, color: '#7A7A9A', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
            pick a background for your strip
          </Text>
        </MotiView>

        {/* Preview strip */}
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 160, delay: 100 }}
          style={{ alignItems: 'center' }}
        >
          <View style={{
            width: 120, height: 160,
            backgroundColor: selected,
            borderRadius: 8,
            padding: 10,
            gap: 6,
            shadowColor: '#000', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20,
            elevation: 10,
            borderWidth: 1,
            borderColor: light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
          }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{
                flex: 1,
                backgroundColor: light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)',
                borderRadius: 4,
              }} />
            ))}
          </View>
        </MotiView>

        {/* Colour swatches */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 400, delay: 200 }}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}
        >
          {options.map((opt) => (
            <Pressable
              key={opt.color}
              onPress={() => { setSelected(opt.color); Haptics.selectionAsync(); }}
              style={{ alignItems: 'center', gap: 5 }}
            >
              <View style={{
                width: 48, height: 48, borderRadius: 14,
                backgroundColor: opt.color,
                borderWidth: selected === opt.color ? 2.5 : 1.5,
                borderColor: selected === opt.color ? '#8B76F0' : 'rgba(255,255,255,0.12)',
                shadowColor: selected === opt.color ? '#6B52E0' : 'transparent',
                shadowOpacity: 0.6, shadowRadius: 8, elevation: selected === opt.color ? 4 : 0,
              }} />
              <Text style={{
                fontSize: 9, fontFamily: selected === opt.color ? 'Inter_600SemiBold' : 'Inter_400Regular',
                color: selected === opt.color ? '#A99BFF' : '#5A5A7A',
              }}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </MotiView>
      </View>

      {/* Start button */}
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
        <Pressable onPress={handleStart} style={{ borderRadius: 20, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#8B76F0', '#4C32C0']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 18, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#EEEEF8' }}>
              open the booth
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
