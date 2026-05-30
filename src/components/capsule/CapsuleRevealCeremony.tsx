import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withSequence, withDelay,
  interpolate, Easing,
} from 'react-native-reanimated';
import { MotiView, AnimatePresence } from 'moti';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const { width: SCREEN_W } = Dimensions.get('window');

interface SubmissionEntry {
  id: string;
  userId: string;
  imageUrl: string | null;
  note: string | null;
  user?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

interface CapsuleRevealCeremonyProps {
  title: string;
  submissions: SubmissionEntry[];
  onClose: () => void;
}

export function CapsuleRevealCeremony({ title, submissions, onClose }: CapsuleRevealCeremonyProps) {
  const [phase, setPhase] = useState<'seal' | 'opening' | 'revealed'>('seal');
  const [visibleIndex, setVisibleIndex] = useState(0);

  const sealScale = useSharedValue(1);
  const sealOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);

  const sealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sealScale.value }],
    opacity: sealOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  const handleOpen = () => {
    if (phase !== 'seal') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase('opening');

    sealScale.value = withSequence(
      withSpring(1.1, { damping: 10 }),
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
    sealOpacity.value = withDelay(200, withTiming(0, { duration: 400 }));

    contentOpacity.value = withDelay(700, withTiming(1, { duration: 600 }));

    setTimeout(() => {
      setPhase('revealed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  };

  const sub = submissions[visibleIndex];

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#08080F',
    }}>
      <AnimatePresence>
        {phase === 'seal' && (
          <MotiView
            key="seal"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32, paddingHorizontal: 32 }}
          >
            <Animated.View style={sealStyle}>
              <Pressable
                onPress={handleOpen}
                style={{ alignItems: 'center', gap: 20 }}
              >
                <MotiView
                  from={{ scale: 1 }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ type: 'timing', duration: 2000, loop: true }}
                >
                  <Text style={{ fontSize: 96 }}>📦</Text>
                </MotiView>
                <Text style={{ fontSize: 24, color: '#EEEEF8', fontFamily: 'Inter_700Bold', textAlign: 'center' }}>
                  {title}
                </Text>
                <View style={{
                  backgroundColor: '#1A1240', borderWidth: 1.5, borderColor: '#6B52E0',
                  borderRadius: 18, paddingHorizontal: 32, paddingVertical: 16,
                }}>
                  <Text style={{ fontSize: 17, color: '#A99BFF', fontFamily: 'Inter_600SemiBold' }}>
                    ✦ open capsule
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: '#3D3D5E', fontFamily: 'Inter_400Regular' }}>
                  tap to open
                </Text>
              </Pressable>
            </Animated.View>
          </MotiView>
        )}

        {phase === 'opening' && (
          <MotiView
            key="opening"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}
          >
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: [1, 1.3, 0.8, 1.1, 1] }}
              transition={{ type: 'timing', duration: 800 }}
            >
              <Text style={{ fontSize: 72 }}>✨</Text>
            </MotiView>
            <Text style={{ fontSize: 18, color: '#A99BFF', fontFamily: 'Inter_600SemiBold' }}>
              opening...
            </Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Revealed content */}
      {phase === 'revealed' && (
        <Animated.View style={[{ flex: 1 }, contentStyle]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Header */}
            <View style={{ paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24, gap: 6 }}>
              <Text style={{ fontSize: 28, color: '#EEEEF8', fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
                {title}
              </Text>
              <Text style={{ fontSize: 14, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
                {submissions.length} memories inside
              </Text>
            </View>

            {/* Submissions */}
            {submissions.map((s, i) => (
              <MotiView
                key={s.id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200, delay: i * 120 }}
                style={{ marginHorizontal: 20, marginBottom: 20 }}
              >
                <View style={{
                  backgroundColor: '#12121C', borderRadius: 20,
                  borderWidth: 1, borderColor: '#2E2E48', overflow: 'hidden',
                }}>
                  {s.imageUrl && (
                    <Image
                      source={{ uri: s.imageUrl }}
                      style={{ width: '100%', height: SCREEN_W - 40, maxHeight: 320 }}
                      contentFit="cover"
                      transition={400}
                    />
                  )}
                  <View style={{ padding: 16, gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: '#1A1A28', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 16 }}>{s.user?.avatar_emoji ?? '🌙'}</Text>
                      </View>
                      <Text style={{ fontSize: 14, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>
                        {s.user?.display_name ?? s.user?.username ?? 'someone'}
                      </Text>
                    </View>
                    {s.note && (
                      <Text style={{
                        fontSize: 15, color: '#A0A0C0',
                        fontFamily: 'Inter_400Regular', lineHeight: 22, fontStyle: 'italic',
                      }}>
                        "{s.note}"
                      </Text>
                    )}
                  </View>
                </View>
              </MotiView>
            ))}
          </ScrollView>

          {/* Close */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            paddingHorizontal: 24, paddingBottom: 44, paddingTop: 16,
            backgroundColor: '#08080F', borderTopWidth: 1, borderTopColor: '#1A1A28',
          }}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
              style={{ borderRadius: 18, paddingVertical: 16, alignItems: 'center', backgroundColor: '#1A1240', borderWidth: 1, borderColor: '#3A2E70' }}
            >
              <Text style={{ fontSize: 16, color: '#A99BFF', fontFamily: 'Inter_600SemiBold' }}>
                save to memories
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* X button */}
      {phase !== 'seal' && (
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: 52, right: 20 }}
        >
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#7A7A9A', fontSize: 16 }}>✕</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}
