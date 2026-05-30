import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Pressable, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { usePhotoBoothStore } from '@stores/photobooth.store';

const TOTAL_PHOTOS = 4;
const COUNTDOWN_FROM = 3;
const PAUSE_BETWEEN_MS = 2000; // gap after each flash before next countdown

type Phase = 'countdown' | 'flash' | 'pause' | 'done';

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function PhotoBoothCameraScreen() {
  const insets = useSafeAreaInsets();
  const { bg } = useLocalSearchParams<{ bg?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const store = usePhotoBoothStore();
  const running = useRef(false);

  const [phase, setPhase] = useState<Phase>('countdown');
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [shotIndex, setShotIndex] = useState(0); // which photo we're on (0-based)
  const [uris, setUris] = useState<string[]>([]);

  const flashAnim = useRef(new Animated.Value(0)).current;

  const doFlash = useCallback(() => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [flashAnim]);

  const runSequence = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    const captured: string[] = [];

    for (let i = 0; i < TOTAL_PHOTOS; i++) {
      setShotIndex(i);

      // Countdown
      for (let c = COUNTDOWN_FROM; c >= 1; c--) {
        setPhase('countdown');
        setCount(c);
        if (c < COUNTDOWN_FROM) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await delay(1000);
      }

      // Capture
      setPhase('flash');
      doFlash();
      try {
        const result = await cameraRef.current?.takePictureAsync({ quality: 0.85, skipProcessing: false });
        if (result?.uri) captured.push(result.uri);
        else captured.push(''); // placeholder on failure
      } catch {
        captured.push('');
      }

      setUris([...captured]);

      if (i < TOTAL_PHOTOS - 1) {
        setPhase('pause');
        await delay(PAUSE_BETWEEN_MS);
      }
    }

    // All done
    setPhase('done');
    const bgColor = `#${bg ?? 'FFFDF5'}`;
    store.set(captured, bgColor);
    await delay(600);
    router.replace(`/scrapbook/photo-booth?bg=${bg ?? 'FFFDF5'}`);
  }, [bg, doFlash, store]);

  useEffect(() => {
    if (permission?.granted) runSequence();
  }, [permission?.granted]);

  // ── Permission screens ───────────────────────────────────────────────────────
  if (!permission) {
    return <View style={s.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', gap: 20, paddingHorizontal: 32 }]}>
        <LinearGradient colors={['#08080F', '#0D0D14', '#1A1240']} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 40 }}>📷</Text>
        <Text style={{ color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', fontSize: 18, textAlign: 'center' }}>
          camera needed
        </Text>
        <Text style={{ color: '#7A7A9A', fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
          the photo booth needs your camera to take your four shots
        </Text>
        <Pressable
          onPress={requestPermission}
          style={{ backgroundColor: '#6B52E0', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 }}
        >
          <Text style={{ color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>allow camera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#5A5A7A', fontFamily: 'Inter_400Regular', fontSize: 14 }}>go back</Text>
        </Pressable>
      </View>
    );
  }

  // ── Booth UI ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* Camera full screen (front-facing like a real booth) */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
      />

      {/* Flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: flashAnim }]}
      />

      {/* Top: progress dots */}
      <View style={[s.dotsRow, { paddingTop: insets.top + 16 }]}>
        {Array.from({ length: TOTAL_PHOTOS }, (_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              i < uris.length && s.dotDone,
              i === shotIndex && phase !== 'done' && s.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Centre: countdown or pause message */}
      <View style={s.centreArea} pointerEvents="none">
        {phase === 'countdown' && (
          <Text style={[s.countNum, count === 1 && { color: '#FFF' }]}>
            {count === 1 ? '😄' : count}
          </Text>
        )}
        {phase === 'flash' && (
          <Text style={s.smileLabel}>click!</Text>
        )}
        {phase === 'pause' && (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={s.pauseNum}>{uris.length} / {TOTAL_PHOTOS}</Text>
            <Text style={s.pauseSub}>next shot coming…</Text>
          </View>
        )}
        {phase === 'done' && (
          <Text style={s.doneLabel}>✓</Text>
        )}
      </View>

      {/* Bottom: photo label */}
      <View style={[s.bottomLabel, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={s.bottomText}>
          {phase === 'done'
            ? 'developing your strip…'
            : `photo ${shotIndex + 1} of ${TOTAL_PHOTOS}`}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  dotsRow: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 10,
    zIndex: 10,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  dotDone: { backgroundColor: '#FFF' },
  dotActive: { backgroundColor: '#FFF', transform: [{ scale: 1.4 }] },
  centreArea: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 5,
  },
  countNum: {
    fontSize: 110,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_700Bold',
    lineHeight: 120,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  smileLabel: {
    fontSize: 36, color: '#FFF', fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  pauseNum: {
    fontSize: 28, color: '#FFF', fontFamily: 'Inter_700Bold',
  },
  pauseSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular',
  },
  doneLabel: {
    fontSize: 72, color: '#FFF',
  },
  bottomLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', zIndex: 10,
  },
  bottomText: {
    color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter_400Regular', fontSize: 13,
    letterSpacing: 0.5,
  },
});
