import { useState, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MotiView, AnimatePresence } from 'moti';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRoll, useAddShot, useDevelopRoll, useRevealRoll } from '@hooks/useRolls';
import { useAuthStore } from '@stores/auth.store';
import { ExposureCounter } from '@/components/roll/ExposureCounter';
import { ShutterButton } from '@/components/camera/ShutterButton';

export default function RollScreen() {
  const { rollId } = useLocalSearchParams<{ rollId: string }>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user.id);

  const { roll, isLoading } = useRoll(rollId ?? '');
  const { mutateAsync: addShot, isPending: isUploading } = useAddShot(rollId ?? '');
  const { mutateAsync: developRoll, isPending: isDeveloping } = useDevelopRoll();
  const { mutateAsync: revealRoll } = useRevealRoll();

  const [permission, requestPermission] = useCameraPermissions();
  const [viewMode, setViewMode] = useState<'camera' | 'shots'>('camera');
  const [note, setNote] = useState('');

  const cameraRef = useRef<CameraView>(null);
  const flashOpacity = useSharedValue(0);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  const isCreator = roll?.creatorId === userId;
  const canShoot = roll?.status === 'active' && (roll?.shotsTaken ?? 0) < (roll?.maxShots ?? 0);

  // Check if developing period has passed and we should reveal
  const isReadyToReveal = roll?.status === 'developing'
    && roll.developedAt
    && new Date(roll.developedAt).getTime() <= Date.now();

  const capture = useCallback(async () => {
    if (!cameraRef.current || isUploading || !canShoot) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    flashOpacity.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0, { duration: 200 }),
    );

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        await addShot({ imageUri: photo.uri });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // stay in viewfinder
    }
  }, [isUploading, canShoot, addShot]);

  if (isLoading) {
    return (
      <View style={[styles.bg, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#6B52E0" />
      </View>
    );
  }

  if (!roll) {
    return (
      <View style={[styles.bg, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
        <Text style={{ fontSize: 40 }}>😕</Text>
        <Text style={{ color: '#7A7A9A', fontSize: 15, fontFamily: 'Inter_400Regular' }}>roll not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#6B52E0', fontSize: 14, fontFamily: 'Inter_500Medium' }}>go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      {/* ── Camera view ─────────────────────────────────────── */}
      {viewMode === 'camera' && roll.status === 'active' && (
        <>
          {!permission?.granted ? (
            <View style={[styles.bg, { alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 40 }]}>
              <Text style={{ fontSize: 48 }}>📷</Text>
              <Text style={styles.permTitle}>camera access needed</Text>
              <Pressable onPress={requestPermission} style={styles.permBtn}>
                <Text style={styles.permBtnText}>allow camera</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" flash="off" />

              {/* Flash burst */}
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} />

              {/* Top bar */}
              <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => router.back()} style={styles.iconBtn}>
                  <Text style={{ color: '#EEEEF8', fontSize: 15 }}>‹</Text>
                </Pressable>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_600SemiBold' }}>
                  {roll.name}
                </Text>
                <Pressable onPress={() => setViewMode('shots')} style={styles.iconBtn}>
                  <Text style={{ color: '#EEEEF8', fontSize: 15 }}>≡</Text>
                </Pressable>
              </View>

              {/* Corner guides */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <View style={styles.cornersWrap}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
              </View>

              {/* Bottom bar */}
              <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40 }}>
                  <ExposureCounter shotsTaken={roll.shotsTaken} maxShots={roll.maxShots} size="sm" />
                  <ShutterButton onPress={capture} />
                  <View style={{ width: 52 }} />
                </View>
              </View>

              {/* Uploading overlay */}
              {isUploading && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }]}>
                  <ActivityIndicator color="#C9A060" size="large" />
                  <Text style={{ color: '#C9A060', fontSize: 14, fontFamily: 'Inter_500Medium', marginTop: 12 }}>saving shot...</Text>
                </View>
              )}
            </>
          )}
        </>
      )}

      {/* ── Developing / Developed state ─────────────────── */}
      {(roll.status !== 'active' || viewMode === 'shots') && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 80, gap: 20 }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => { if (viewMode === 'shots') setViewMode('camera'); else router.back(); }}>
              <Text style={{ fontSize: 15, color: '#7A7A9A', fontFamily: 'Inter_400Regular' }}>
                {viewMode === 'shots' && roll.status === 'active' ? '← camera' : '‹ back'}
              </Text>
            </Pressable>
            <Text style={{ fontSize: 17, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }} numberOfLines={1}>
              {roll.name}
            </Text>
            <View style={{ width: 52 }} />
          </View>

          {/* Status card */}
          {roll.status === 'developing' && (
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={{
                backgroundColor: '#1F1A08', borderRadius: 20,
                borderWidth: 1.5, borderColor: '#4A3810', padding: 20,
                alignItems: 'center', gap: 10,
              }}
            >
              <MotiView
                from={{ rotate: '0deg' }}
                animate={{ rotate: ['0deg', '10deg', '-10deg', '0deg'] }}
                transition={{ type: 'timing', duration: 3000, loop: true }}
              >
                <Text style={{ fontSize: 40 }}>🎞</Text>
              </MotiView>
              <Text style={{ fontSize: 17, color: '#C9A060', fontFamily: 'Inter_600SemiBold' }}>developing...</Text>
              <Text style={{ fontSize: 13, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                {roll.developedAt
                  ? `ready ${new Date(roll.developedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`
                  : 'sit tight'}
              </Text>
              {isReadyToReveal && isCreator && (
                <Pressable
                  onPress={async () => { await revealRoll(roll.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                  style={{ backgroundColor: '#C9A060', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 }}
                >
                  <Text style={{ fontSize: 14, color: '#0D0D14', fontFamily: 'Inter_700Bold' }}>✦ reveal the roll</Text>
                </Pressable>
              )}
            </MotiView>
          )}

          {/* Shot counter */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: '#3D3D5E', fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>
              {roll.status === 'developed' ? `${roll.shots?.length ?? 0} shots` : `${roll.shotsTaken}/${roll.maxShots} shots taken`}
            </Text>
            {isCreator && roll.status === 'active' && roll.shotsTaken > 0 && (
              <Pressable
                onPress={async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); await developRoll(roll.id); }}
                disabled={isDeveloping}
                style={{ backgroundColor: '#2A2040', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ fontSize: 12, color: '#A99BFF', fontFamily: 'Inter_500Medium' }}>
                  {isDeveloping ? 'developing...' : 'develop now'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Shots grid */}
          {(roll.shots?.length ?? 0) > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {(roll.shots ?? []).map((shot, i) => (
                <MotiView
                  key={shot.id}
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 200, delay: i * 40 }}
                  style={{ width: '32%' }}
                >
                  <View style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: 1, backgroundColor: '#1A1A28' }}>
                    {shot.imageUrl && roll.isRevealed ? (
                      <Image source={{ uri: shot.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : shot.imageUrl ? (
                      <Image source={{ uri: shot.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" blurRadius={16} />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18 }}>📷</Text>
                      </View>
                    )}
                    {/* Shot number */}
                    <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, color: '#C9A060', fontFamily: 'Inter_700Bold' }}>{shot.shotNumber}</Text>
                    </View>
                  </View>
                </MotiView>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 32, gap: 12 }}>
              <Text style={{ fontSize: 40 }}>📷</Text>
              <Text style={{ fontSize: 15, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                no shots yet — be the first to shoot
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#08080F' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, zIndex: 10,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(8,8,15,0.8)', paddingTop: 16,
  },
  cornersWrap: { flex: 1, margin: 50 },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: 'rgba(255,255,255,0.5)' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 4 },
  permTitle: { fontSize: 20, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  permBtn: { backgroundColor: '#6B52E0', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  permBtnText: { color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
