import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { FilmGrainOverlay } from './FilmGrainOverlay';

interface RevealAnimationProps {
  imageUri: string;
  thumbnailUri: string;
  width: number;
  height: number;
  onRevealComplete?: () => void;
}

function triggerRevealHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/**
 * Plays the photo development reveal ceremony.
 * Blur lifts, sepia fades, grain dissolves — over ~1.8 seconds.
 */
export function RevealAnimation({ imageUri, thumbnailUri, width, height, onRevealComplete }: RevealAnimationProps) {
  const sepiaOpacity = useSharedValue(0.45);
  const grainOpacity = useSharedValue(0.22);
  const sharpOpacity = useSharedValue(0);
  const blurAmount = useSharedValue(30);

  useEffect(() => {
    const duration = 1400;
    const ease = Easing.out(Easing.cubic);

    // Slight delay before ceremony starts
    setTimeout(() => {
      runOnJS(triggerRevealHaptic)();
    }, 400);

    sepiaOpacity.value = withDelay(200, withTiming(0, { duration: duration + 200, easing: ease }));
    grainOpacity.value = withDelay(200, withTiming(0, { duration: duration, easing: ease }));
    sharpOpacity.value = withDelay(300, withTiming(1, { duration: duration - 100, easing: ease }));
    blurAmount.value = withDelay(200, withTiming(0, { duration: duration + 100, easing: ease }));

    const totalDuration = duration + 500;
    const timeout = setTimeout(() => onRevealComplete?.(), totalDuration);
    return () => clearTimeout(timeout);
  }, []);

  const sepiaStyle = useAnimatedStyle(() => ({
    opacity: sepiaOpacity.value,
  }));

  const grainStyle = useAnimatedStyle(() => ({
    opacity: grainOpacity.value,
  }));

  const sharpStyle = useAnimatedStyle(() => ({
    opacity: sharpOpacity.value,
  }));

  return (
    <View style={{ width, height, borderRadius: 2, overflow: 'hidden', backgroundColor: '#C5B89A' }}>
      {/* Thumbnail (blurred, fades out) */}
      <Image
        source={{ uri: thumbnailUri }}
        style={{ position: 'absolute', width, height }}
        contentFit="cover"
        blurRadius={30}
      />

      {/* Sharp revealed photo (fades in) */}
      <Animated.View style={[{ position: 'absolute', width, height }, sharpStyle]}>
        <Image
          source={{ uri: imageUri }}
          style={{ width, height }}
          contentFit="cover"
        />
      </Animated.View>

      {/* Sepia overlay fades out */}
      <Animated.View
        style={[
          { position: 'absolute', top: 0, left: 0, width, height, backgroundColor: '#C9A96E' },
          sepiaStyle,
        ]}
      />

      {/* Film grain fades out */}
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width, height }, grainStyle]}>
        <FilmGrainOverlay opacity={1} />
      </Animated.View>
    </View>
  );
}
