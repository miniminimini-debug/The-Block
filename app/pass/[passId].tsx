import { useRef, useCallback } from 'react';
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
import { usePass, useTakePassShot, useIsMyPassTurn } from '@hooks/useCameraPass';
import { useAuthStore } from '@stores/auth.store';
import { ShutterButton } from '@/components/camera/ShutterButton';

export default function PassScreen() {
  const { passId } = useLocalSearchParams<{ passId: string }>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user.id);

  const { pass, isLoading } = usePass(passId ?? '');
  const { mutateAsync: takeShot, isPending: isTaking } = useTakePassShot(passId ?? '');
  const isMyTurn = useIsMyPassTurn(pass);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  const capture = useCallback(async () => {
    if (!cameraRef.current || isTaking || !isMyTurn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    flashOpacity.value = withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 200 }));
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        const result = await takeShot({ imageUri: photo.uri });
        if (result.isComplete) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch { /* stay in viewfinder */ }
  }, [isTaking, isMyTurn, takeShot]);

  if (isLoading) {
    return (
      <View style={[styles.bg, styles.center]}>
        <ActivityIndicator color="#6B52E0" />
      </View>
    );
  }

  if (!pass) return null;

  const participants = pass.participants ?? [];
  const shots = (pass.shots ?? []).sort((a, b) => a.orderIndex - b.orderIndex);

  // Show camera if it's my turn and not complete
  if (isMyTurn && !pass.isComplete) {
    return (
      <View style={styles.bg}>
        {!permission?.granted ? (
          <View style={[styles.bg, styles.center, { gap: 20, paddingHorizontal: 40 }]}>
            <Text style={{ fontSize: 48 }}>📷</Text>
            <Pressable onPress={requestPermission} style={styles.permBtn}>
              <Text style={styles.permBtnText}>allow camera</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" flash="off" />
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} />

            {/* Top bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <Pressable onPress={() => router.back()} style={styles.iconBtn}>
                <Text style={{ color: '#EEEEF8', fontSize: 15 }}>‹</Text>
              </Pressable>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' }}>
                  {pass.title ?? 'camera pass'}
                </Text>
                <Text style={{ fontSize: 11, color: '#A99BFF', fontFamily: 'Inter_500Medium' }}>
                  📷 it's your turn!
                </Text>
              </View>
              <View style={styles.iconBtn} />
            </View>

            {/* Chain preview */}
            <View style={{ position: 'absolute', bottom: insets.bottom + 120, left: 0, right: 0, paddingHorizontal: 20 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 0, justifyContent: 'center' }}>
                {participants.map((p, i) => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: p.completed ? '#0A1F0A' : p.userId === userId ? '#1A1240' : 'rgba(0,0,0,0.5)',
                      borderWidth: 2, borderColor: p.completed ? '#3A7A3A' : p.userId === userId ? '#6B52E0' : 'rgba(255,255,255,0.2)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 14 }}>{p.user?.avatar_emoji ?? '🌙'}</Text>
                    </View>
                    {i < participants.length - 1 && (
                      <View style={{ width: 16, height: 2, backgroundColor: p.completed ? '#3A7A3A' : 'rgba(255,255,255,0.2)', marginBottom: 0 }} />
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Shutter */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
              <View style={{ alignItems: 'center', gap: 12 }}>
                <ShutterButton onPress={capture} />
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular' }}>
                  take your shot, then pass it on
                </Text>
              </View>
            </View>

            {isTaking && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator color="#A99BFF" size="large" />
                <Text style={{ color: '#A99BFF', fontSize: 14, fontFamily: 'Inter_500Medium', marginTop: 12 }}>passing the camera...</Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontSize: 15, color: '#7A7A9A', fontFamily: 'Inter_400Regular' }}>‹ back</Text>
          </Pressable>
          <Text style={{ fontSize: 17, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>
            {pass.title ?? 'camera pass'}
          </Text>
          <View style={{ width: 52 }} />
        </View>

        {/* Status */}
        {pass.isComplete ? (
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: '#0A1F0A', borderRadius: 18, borderWidth: 1, borderColor: '#2A3D2A', padding: 20, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 32 }}>✦</Text>
            <Text style={{ fontSize: 16, color: '#6BCB77', fontFamily: 'Inter_600SemiBold' }}>pass complete!</Text>
            <Text style={{ fontSize: 13, color: '#3D3D5E', fontFamily: 'Inter_400Regular' }}>{shots.length} memories captured</Text>
          </MotiView>
        ) : (
          <View style={{ backgroundColor: '#12121C', borderRadius: 18, borderWidth: 1, borderColor: '#2E2E48', padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>chain progress</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 0 }}>
              {participants.map((p, i) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: p.completed ? '#0A1F0A' : p.userId === pass.currentHolderId ? '#1A1240' : '#1A1A28',
                      borderWidth: 2,
                      borderColor: p.completed ? '#3A7A3A' : p.userId === pass.currentHolderId ? '#6B52E0' : '#2E2E48',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 18 }}>{p.user?.avatar_emoji ?? '🌙'}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: p.completed ? '#6BCB77' : p.userId === pass.currentHolderId ? '#A99BFF' : '#3D3D5E', fontFamily: 'Inter_500Medium' }}>
                      {p.completed ? '✓' : p.userId === pass.currentHolderId ? 'here' : p.user?.username ?? '?'}
                    </Text>
                  </View>
                  {i < participants.length - 1 && (
                    <View style={{ width: 24, height: 2, backgroundColor: i < participants.filter((pp) => pp.completed).length ? '#3A7A3A' : '#2E2E48', marginBottom: 14 }} />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Shots */}
        {shots.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 11, color: '#3D3D5E', fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>the shots</Text>
            {shots.map((shot, i) => (
              <MotiView key={shot.id} from={{ opacity: 0, translateX: -8 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 200, delay: i * 60 }}>
                <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#12121C' }}>
                  {shot.imageUrl && (
                    <Image source={{ uri: shot.imageUrl }} style={{ width: '100%', height: 220 }} contentFit="cover" transition={400} />
                  )}
                  <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16 }}>{shot.photographer?.avatar_emoji ?? '🌙'}</Text>
                      <Text style={{ fontSize: 13, color: '#A0A0C0', fontFamily: 'Inter_500Medium' }}>
                        {shot.photographer?.display_name ?? shot.photographer?.username ?? '...'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#3D3D5E', fontFamily: 'Inter_400Regular' }}>
                      shot {i + 1}
                    </Text>
                  </View>
                  {shot.note && (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                      <Text style={{ fontSize: 13, color: '#7A7A9A', fontFamily: 'Inter_400Regular', fontStyle: 'italic' }}>"{shot.note}"</Text>
                    </View>
                  )}
                </View>
              </MotiView>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#08080F' },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(8,8,15,0.85)', paddingTop: 20, alignItems: 'center' },
  permBtn: { backgroundColor: '#6B52E0', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  permBtnText: { color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
