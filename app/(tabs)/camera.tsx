import { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSequence, withTiming, withSpring,
} from 'react-native-reanimated';
import { AnimatePresence, MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useCameraStore } from '@stores/camera.store';
import { ShutterButton } from '@/components/camera/ShutterButton';
import { PostComposer } from '@/components/camera/PostComposer';
import type { CameraMode } from '@types/models';

const { width: SCREEN_W } = Dimensions.get('window');
const BOOTH_SHOTS = 4;
const BOOTH_INTERVAL_MS = 1200;

const PROMPTS = [
  'photograph something that surprised you today',
  'capture what cozy feels like right now',
  'find beauty in something you usually overlook',
  'photograph the thing you touched most today',
  'capture a texture that makes you feel something',
  'find a moment of stillness',
  'photograph what "home" looks like right now',
  'capture the light at this exact moment',
  'photograph something ending or beginning',
  'find the oldest thing you can see from here',
  'capture what you\'re looking forward to',
  'photograph a secret only you would notice',
  'capture the mood of this exact hour',
  'find something that looks different than it is',
  'photograph what silence looks like',
  'capture something small that means something big',
  'find the most interesting shadow near you',
  'photograph what you wish someone else could see',
];

const MODES: { id: CameraMode; label: string; icon: string }[] = [
  { id: 'oneshot', label: 'one shot', icon: '⚡' },
  { id: 'booth', label: 'booth', icon: '🎞' },
];

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const stage        = useCameraStore((s) => s.stage);
  const isFlashOn    = useCameraStore((s) => s.isFlashOn);
  const isFront      = useCameraStore((s) => s.isFrontCamera);
  const cameraMode   = useCameraStore((s) => s.cameraMode);
  const boothCaptures = useCameraStore((s) => s.boothCaptures);
  const boothCountdown = useCameraStore((s) => s.boothCountdown);

  const toggleFlash    = useCameraStore((s) => s.toggleFlash);
  const toggleCamera   = useCameraStore((s) => s.toggleCamera);
  const setCaptureUri  = useCameraStore((s) => s.setCaptureUri);
  const setStage       = useCameraStore((s) => s.setStage);
  const reset          = useCameraStore((s) => s.reset);
  const setCameraMode  = useCameraStore((s) => s.setCameraMode);
  const addBoothCapture = useCameraStore((s) => s.addBoothCapture);
  const setBoothCountdown = useCameraStore((s) => s.setBoothCountdown);
  const resetBooth     = useCameraStore((s) => s.resetBooth);

  const cameraRef    = useRef<CameraView>(null);
  const flashOpacity = useSharedValue(0);
  const [isBoothRunning, setIsBoothRunning] = useState(false);
  const boothCapturesRef = useRef<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);

  const givePrompt = useCallback(() => {
    const pool = currentPrompt
      ? PROMPTS.filter((p) => p !== currentPrompt)
      : PROMPTS;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setCurrentPrompt(next);
    Haptics.selectionAsync();
  }, [currentPrompt]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  const doFlash = () => {
    flashOpacity.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0, { duration: 200 }),
    );
  };

  // ── Normal / One Shot capture ──────────────────────────────
  const capture = useCallback(async () => {
    if (!cameraRef.current || isBoothRunning) return;
    try {
      if (isFlashOn) doFlash();
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        setCaptureUri(photo.uri);
        setStage('composer');
      }
    } catch { /* stay in viewfinder */ }
  }, [isBoothRunning, isFlashOn, setCaptureUri, setStage]);

  // ── Photo Booth capture loop ───────────────────────────────
  const startBooth = useCallback(async () => {
    if (!cameraRef.current || isBoothRunning) return;
    setIsBoothRunning(true);
    boothCapturesRef.current = [];
    setStage('booth-countdown');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const captureShot = async () => {
      if (!cameraRef.current) return;
      doFlash();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        boothCapturesRef.current.push(photo.uri);
        addBoothCapture(photo.uri);
      }
    };

    const countdown = (n: number): Promise<void> =>
      new Promise((resolve) => {
        setBoothCountdown(n);
        Haptics.selectionAsync();
        setTimeout(resolve, 1000);
      });

    // Shoot 4 times
    for (let i = 0; i < BOOTH_SHOTS; i++) {
      await countdown(3);
      await countdown(2);
      await countdown(1);
      await captureShot();
      if (i < BOOTH_SHOTS - 1) {
        await new Promise((r) => setTimeout(r, BOOTH_INTERVAL_MS));
      }
    }

    setStage('booth-strip');
    setIsBoothRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [isBoothRunning, addBoothCapture, setBoothCountdown, setStage]);

  // ── Permission not determined ──────────────────────────────
  if (!permission) return <View style={styles.bg} />;

  // ── Permission denied ──────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[styles.bg, styles.center]}>
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 180 }} style={{ alignItems: 'center', paddingHorizontal: 40, gap: 20 }}>
          <Text style={{ fontSize: 48 }}>📷</Text>
          <Text style={styles.permTitle}>camera access needed</Text>
          <Text style={styles.permSub}>your block needs your camera to capture real moments.</Text>
          <Pressable onPress={requestPermission} style={styles.permBtn}>
            <Text style={styles.permBtnText}>allow camera</Text>
          </Pressable>
        </MotiView>
      </View>
    );
  }

  // ── Sent confirmation ──────────────────────────────────────
  if (stage === 'sent') {
    return (
      <View style={[styles.bg, styles.center]}>
        <MotiView from={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', damping: 18, stiffness: 200 }} style={{ alignItems: 'center', gap: 16 }}>
          <Text style={{ fontSize: 56 }}>✦</Text>
          <Text style={styles.sentTitle}>developing...</Text>
          <Text style={styles.sentSub}>your photo is on its way</Text>
          <Pressable onPress={reset} style={{ marginTop: 8 }}>
            <Text style={styles.sentAction}>take another</Text>
          </Pressable>
        </MotiView>
      </View>
    );
  }

  // ── Photo Booth Strip result ───────────────────────────────
  if (stage === 'booth-strip') {
    return (
      <View style={[styles.bg, styles.center]}>
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 20 }} style={{ alignItems: 'center', gap: 0, paddingTop: insets.top + 16 }}>
          <Text style={{ fontSize: 13, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>your strip</Text>

          {/* Film strip */}
          <View style={{ width: SCREEN_W * 0.55, backgroundColor: '#F5F0E8', borderRadius: 4, paddingVertical: 12, paddingHorizontal: 8, gap: 6, alignItems: 'center' }}>
            {/* Sprocket holes top */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0D0D14' }} />
              ))}
            </View>

            {/* 4 frames */}
            {boothCaptures.slice(0, 4).map((uri, i) => (
              <MotiView key={i} from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 100, type: 'timing', duration: 300 }}>
                <View style={{ width: SCREEN_W * 0.55 - 16, aspectRatio: 3 / 4, backgroundColor: '#2A2040', borderRadius: 2, overflow: 'hidden' }}>
                  {uri ? (
                    <Animated.Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, backgroundColor: '#1A1A28' }} />
                  )}
                </View>
              </MotiView>
            ))}

            {/* Sprocket holes bottom */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0D0D14' }} />
              ))}
            </View>

            {/* Footer label */}
            <Text style={{ fontSize: 8, color: '#888', fontFamily: 'Inter_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>
              your block · {new Date().getFullYear()}
            </Text>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, paddingHorizontal: 32 }}>
            <Pressable onPress={resetBooth} style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1A1A28', borderWidth: 1, borderColor: '#2E2E48' }}>
              <Text style={{ fontSize: 14, color: '#7A7A9A', fontFamily: 'Inter_500Medium' }}>retake</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                // Use first frame as a regular post capture
                if (boothCaptures[0]) { setCaptureUri(boothCaptures[0]); setStage('composer'); }
              }}
              style={{ flex: 2, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#6B52E0' }}
            >
              <Text style={{ fontSize: 14, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>✦ send to friends</Text>
            </Pressable>
          </View>
        </MotiView>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      {/* Viewfinder */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={cameraMode === 'booth' ? 'front' : (isFront ? 'front' : 'back')}
        flash={isFlashOn ? 'on' : 'off'}
      />

      {/* Flash burst overlay */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} />

      {/* One-Shot drama overlay */}
      {cameraMode === 'oneshot' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: 'rgba(255,100,100,0.4)', pointerEvents: 'none' }} />
      )}

      {/* Top controls */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {/* Flash toggle (not shown in booth mode) */}
        {cameraMode !== 'booth' && (
          <Pressable onPress={() => { toggleFlash(); Haptics.selectionAsync(); }} style={[styles.iconBtn, isFlashOn && styles.iconBtnActive]}>
            <Text style={{ fontSize: 18 }}>{isFlashOn ? '⚡' : '⚡'}</Text>
          </Pressable>
        )}

        {/* Mode label */}
        <View style={{ alignItems: 'center' }}>
          {cameraMode === 'oneshot' && (
            <View style={{ backgroundColor: 'rgba(255,100,100,0.25)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,100,100,0.5)' }}>
              <Text style={{ fontSize: 11, color: '#FF6B6B', fontFamily: 'Inter_700Bold', letterSpacing: 1 }}>ONE SHOT</Text>
            </View>
          )}
          {cameraMode === 'booth' && (
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_500Medium' }}>
              {isBoothRunning ? `${boothCountdown}` : 'photo booth'}
            </Text>
          )}
        </View>

        {/* Flip camera (not in booth) */}
        {cameraMode !== 'booth' ? (
          <Pressable onPress={() => { toggleCamera(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.iconBtn}>
            <Text style={{ fontSize: 18 }}>🔄</Text>
          </Pressable>
        ) : <View style={styles.iconBtn} />}
      </View>

      {/* Viewfinder corner guides */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.cornersWrap}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      {/* Booth countdown overlay */}
      {isBoothRunning && stage === 'booth-countdown' && (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <MotiView
            key={boothCountdown}
            from={{ opacity: 1, scale: 1.4 }}
            animate={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'timing', duration: 900 }}
          >
            <Text style={{ fontSize: 120, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.9)' }}>
              {boothCountdown}
            </Text>
          </MotiView>
          <Text style={{ position: 'absolute', bottom: '22%', fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular' }}>
            shot {boothCaptures.length + 1} of {BOOTH_SHOTS}
          </Text>
        </View>
      )}

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {/* Mode selector */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
          {MODES.map((mode) => {
            const isActive = cameraMode === mode.id;
            return (
              <Pressable
                key={mode.id}
                onPress={() => { setCameraMode(mode.id); Haptics.selectionAsync(); }}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: isActive ? 'rgba(107,82,224,0.3)' : 'rgba(0,0,0,0.4)',
                  borderWidth: 1,
                  borderColor: isActive ? '#6B52E0' : 'rgba(255,255,255,0.15)',
                }}
              >
                <Text style={{ fontSize: 12, color: isActive ? '#A99BFF' : 'rgba(255,255,255,0.5)', fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                  {mode.icon} {mode.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Shutter row */}
        <View style={styles.shutterRow}>
          <View style={{ width: 44 }} />

          {cameraMode === 'booth' ? (
            <Pressable
              onPress={startBooth}
              disabled={isBoothRunning}
              style={[styles.boothBtn, isBoothRunning && { opacity: 0.5 }]}
            >
              <Text style={{ fontSize: 13, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>
                {isBoothRunning ? '...' : 'start booth'}
              </Text>
            </Pressable>
          ) : (
            <ShutterButton onPress={capture} />
          )}

          {cameraMode !== 'booth' ? (
            <Pressable onPress={() => { toggleCamera(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.flipBtn}>
              <Text style={{ fontSize: 22 }}>🔄</Text>
            </Pressable>
          ) : <View style={{ width: 44 }} />}
        </View>

        {/* One-shot note */}
        {cameraMode === 'oneshot' && (
          <Text style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,100,100,0.6)', fontFamily: 'Inter_400Regular', marginTop: 8 }}>
            no retakes · make it count
          </Text>
        )}

        {/* Prompt */}
        <AnimatePresence>
          {currentPrompt ? (
            <MotiView
              key="prompt"
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 8 }}
              transition={{ type: 'spring', damping: 22, stiffness: 200 }}
              style={{ marginHorizontal: 20, marginTop: 8 }}
            >
              <Pressable
                onPress={givePrompt}
                style={{ backgroundColor: 'rgba(8,8,15,0.7)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 4 }}
              >
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>
                  prompt · tap for new
                </Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular', fontStyle: 'italic', lineHeight: 20 }}>
                  {currentPrompt}
                </Text>
              </Pressable>
            </MotiView>
          ) : (
            <MotiView
              key="prompt-btn"
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ alignItems: 'center', marginTop: 10 }}
            >
              <Pressable onPress={givePrompt} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: 'Inter_400Regular' }}>
                  give me a prompt
                </Text>
              </Pressable>
            </MotiView>
          )}
        </AnimatePresence>
      </View>

      {/* Composer overlay (normal + one-shot) */}
      <AnimatePresence>
        {(stage === 'composer' || stage === 'uploading') && (
          <PostComposer key="composer" isOneShot={cameraMode === 'oneshot'} />
        )}
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: '#08080F' },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: 'rgba(255,220,0,0.25)', borderWidth: 1, borderColor: '#FFD93D' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(8,8,15,0.75)', paddingTop: 16,
  },
  shutterRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 40, marginBottom: 8,
  },
  flipBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  boothBtn: {
    width: 120, height: 64, borderRadius: 32,
    backgroundColor: '#6B52E0',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#0D0D14',
  },
  cornersWrap: { flex: 1, margin: 50 },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: 'rgba(255,255,255,0.55)' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 4 },
  permTitle:   { fontSize: 22, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  permSub:     { fontSize: 15, color: '#7A7A9A', fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  permBtn:     { backgroundColor: '#6B52E0', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  permBtnText: { color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  sentTitle:   { fontSize: 26, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' },
  sentSub:     { fontSize: 15, color: '#7A7A9A', fontFamily: 'Inter_400Regular' },
  sentAction:  { fontSize: 15, color: '#8B76F0', fontFamily: 'Inter_500Medium' },
});
