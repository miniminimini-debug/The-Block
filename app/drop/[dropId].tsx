import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MotiView, AnimatePresence } from 'moti';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useDrop, useDiscoverDrop } from '@hooks/useDeskDrops';
import { useTheme } from '@hooks/useTheme';

export default function DropRevealScreen() {
  const { dropId } = useLocalSearchParams<{ dropId: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const { drop, isLoading } = useDrop(dropId ?? '');
  const { mutateAsync: discoverDrop, isPending } = useDiscoverDrop();

  const [revealed, setRevealed] = useState(false);

  const blurValue = useSharedValue(20);
  const scaleValue = useSharedValue(0.95);
  const overlayOpacity = useSharedValue(1);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handleReveal = async () => {
    if (revealed || isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (!drop?.isDiscovered) {
      await discoverDrop(dropId ?? '');
    }

    setRevealed(true);

    blurValue.value = withTiming(0, { duration: 800 });
    scaleValue.value = withSpring(1, { damping: 15, stiffness: 120 });
    overlayOpacity.value = withTiming(0, { duration: 600 });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (isLoading) {
    return (
      <View style={[styles.bg, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!drop) return null;

  return (
    <View style={[styles.bg, { backgroundColor: '#000' }]}>
      {/* Full-screen photo */}
      {drop.imageUrl && (
        <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
          <Image
            source={{ uri: drop.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={revealed ? 0 : 22}
            transition={800}
          />
        </Animated.View>
      )}

      {/* Dark gradient overlay when unrevealed */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, overlayStyle, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
      />

      {/* Top bar */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={{ color: '#EEEEF8', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>‹</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular' }}>
            {drop.sender?.display_name ?? drop.sender?.username ?? '...'} left this for you
          </Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      {/* Reveal prompt — shown before revealed */}
      <AnimatePresence>
        {!revealed && (
          <MotiView
            key="reveal-prompt"
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 20 }}
          >
            {/* Sender info */}
            <View style={{ alignItems: 'center', gap: 8 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.accentDim, borderWidth: 2, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 30 }}>{drop.sender?.avatar_emoji ?? '🌙'}</Text>
              </View>
              <Text style={{ fontSize: 16, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>
                {drop.sender?.display_name ?? drop.sender?.username ?? '...'}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular' }}>
                left something on your desk
              </Text>
            </View>

            {/* Tap to reveal */}
            <MotiView
              from={{ opacity: 0.5 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ type: 'timing', duration: 1600, loop: true }}
            >
              <Pressable
                onPress={handleReveal}
                style={{
                  backgroundColor: theme.accent,
                  borderRadius: 20, paddingHorizontal: 32, paddingVertical: 16,
                  alignItems: 'center', gap: 4,
                }}
              >
                {isPending ? (
                  <ActivityIndicator color="#EEEEF8" />
                ) : (
                  <>
                    <Text style={{ fontSize: 24 }}>📷</Text>
                    <Text style={{ fontSize: 16, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>tap to reveal</Text>
                  </>
                )}
              </Pressable>
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Revealed info strip */}
      <AnimatePresence>
        {revealed && (
          <MotiView
            key="info-strip"
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 200, delay: 400 }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              paddingHorizontal: 24, paddingBottom: insets.bottom + 32, paddingTop: 20,
              backgroundColor: 'rgba(8,8,15,0.85)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: drop.note ? 12 : 0 }}>
              <Text style={{ fontSize: 28 }}>{drop.sender?.avatar_emoji ?? '🌙'}</Text>
              <View>
                <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>
                  {drop.sender?.display_name ?? drop.sender?.username}
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter_400Regular' }}>
                  {drop.createdAt ? new Date(drop.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}
                </Text>
              </View>
            </View>
            {drop.note && (
              <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular', fontStyle: 'italic', lineHeight: 22 }}>
                "{drop.note}"
              </Text>
            )}
          </MotiView>
        )}
      </AnimatePresence>

      {/* No photo — note-only drop */}
      {!drop.imageUrl && !revealed && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.bg }} />
      )}
      {!drop.imageUrl && revealed && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 64 }}>📝</Text>
          <Text style={{ fontSize: 18, color: theme.text, fontFamily: 'Inter_600SemiBold', marginTop: 16 }}>
            a note for you
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
});
