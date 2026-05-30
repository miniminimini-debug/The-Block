import { useState } from 'react';
import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MotiView, AnimatePresence } from 'moti';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withSpring, withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { SeasonalRecap } from '@types/models';

interface RecapCeremonyProps {
  recap: SeasonalRecap;
  onClose: () => void;
}

type Phase = 'sealed' | 'opening' | 'revealed';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const SEASON_STYLES: Record<string, { bg: string; accent: string; emoji: string }> = {
  spring: { bg: '#0A1A0A', accent: '#6BCB77', emoji: '🌸' },
  summer: { bg: '#1A1200', accent: '#E0C060', emoji: '☀️' },
  fall:   { bg: '#1A0800', accent: '#C87941', emoji: '🍂' },
  winter: { bg: '#0A0A1A', accent: '#A99BFF', emoji: '❄️' },
};

export function RecapCeremony({ recap, onClose }: RecapCeremonyProps) {
  const [phase, setPhase] = useState<Phase>('sealed');
  const [slideIndex, setSlideIndex] = useState(0);

  const envelopeScale = useSharedValue(0.8);
  const envelopeOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  const envelopeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: envelopeScale.value }],
    opacity: envelopeOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const style = SEASON_STYLES[recap.season] ?? SEASON_STYLES.winter;
  const photos = recap.photoUrls ?? [];

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase('opening');

    envelopeScale.value = withSequence(
      withSpring(1.05, { damping: 10 }),
      withTiming(3, { duration: 600 }),
    );
    envelopeOpacity.value = withDelay(400, withTiming(0, { duration: 400 }));

    setTimeout(() => {
      setPhase('revealed');
      contentOpacity.value = withTiming(1, { duration: 600 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 900);
  };

  const nextSlide = () => {
    if (slideIndex < photos.length - 1) {
      setSlideIndex((i) => i + 1);
      Haptics.selectionAsync();
    }
  };

  const prevSlide = () => {
    if (slideIndex > 0) {
      setSlideIndex((i) => i - 1);
      Haptics.selectionAsync();
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: style.bg, zIndex: 100 }]}>
      {/* Close button */}
      <Pressable
        onPress={onClose}
        style={{ position: 'absolute', top: 56, right: 20, zIndex: 20, padding: 8 }}
      >
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter_400Regular' }}>close</Text>
      </Pressable>

      {/* Sealed phase */}
      <AnimatePresence>
        {phase === 'sealed' && (
          <MotiView
            key="sealed"
            from={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', damping: 16, stiffness: 200 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}
          >
            <Text style={{ fontSize: 72 }}>💌</Text>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>
                {recap.label}
              </Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular' }}>
                {photos.length} memories sealed inside
              </Text>
            </View>

            <MotiView
              from={{ opacity: 0.5 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ type: 'timing', duration: 1600, loop: true }}
            >
              <Pressable
                onPress={handleOpen}
                style={{
                  backgroundColor: style.accent,
                  borderRadius: 20, paddingHorizontal: 36, paddingVertical: 18,
                  alignItems: 'center', gap: 4,
                }}
              >
                <Text style={{ fontSize: 24 }}>{style.emoji}</Text>
                <Text style={{ fontSize: 16, color: '#08080F', fontFamily: 'Inter_700Bold' }}>
                  open the letter
                </Text>
              </Pressable>
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Opening animation */}
      <AnimatePresence>
        {phase === 'opening' && (
          <MotiView
            key="opening"
            from={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Animated.View style={envelopeStyle}>
              <Text style={{ fontSize: 72 }}>💌</Text>
            </Animated.View>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Revealed phase — photo slideshow */}
      <AnimatePresence>
        {phase === 'revealed' && photos.length > 0 && (
          <Animated.View key="content" style={[StyleSheet.absoluteFill, contentStyle]}>
            {/* Current photo */}
            <Image
              source={{ uri: photos[slideIndex] }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={600}
            />

            {/* Gradient overlay */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />

            {/* Header */}
            <View style={{ position: 'absolute', top: 56, left: 20, right: 60 }}>
              <Text style={{ fontSize: 22, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>
                {recap.label} {style.emoji}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular' }}>
                {slideIndex + 1} / {photos.length}
              </Text>
            </View>

            {/* Navigation */}
            <View style={{ position: 'absolute', bottom: 60, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 }}>
              <Pressable
                onPress={prevSlide}
                disabled={slideIndex === 0}
                style={{ opacity: slideIndex === 0 ? 0 : 1, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12 }}
              >
                <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>‹ prev</Text>
              </Pressable>

              {/* Dot indicators */}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {photos.slice(0, 8).map((_, i) => (
                  <View key={i} style={{
                    width: i === slideIndex ? 16 : 6, height: 6, borderRadius: 3,
                    backgroundColor: i === slideIndex ? style.accent : 'rgba(255,255,255,0.3)',
                  }} />
                ))}
              </View>

              <Pressable
                onPress={nextSlide}
                disabled={slideIndex === photos.length - 1}
                style={{ opacity: slideIndex === photos.length - 1 ? 0 : 1, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12 }}
              >
                <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>next ›</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {phase === 'revealed' && photos.length === 0 && (
          <Animated.View key="empty" style={[StyleSheet.absoluteFill, contentStyle, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
            <Text style={{ fontSize: 64 }}>{style.emoji}</Text>
            <Text style={{ fontSize: 20, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>{recap.label}</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter_400Regular' }}>no photos this season yet</Text>
          </Animated.View>
        )}
      </AnimatePresence>
    </View>
  );
}
