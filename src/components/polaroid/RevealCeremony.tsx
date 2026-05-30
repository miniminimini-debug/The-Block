import { useState, useCallback } from 'react';
import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRevealStore } from '@stores/reveal.store';
import { useMarkPostViewed, useAddReaction } from '@hooks/usePosts';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import { RevealAnimation } from './RevealAnimation';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const PHOTO_W = SCREEN_W * 0.72;
const PHOTO_H = PHOTO_W * 0.78;
const INSET = 10;

const REACTIONS = ['❤️', '😭', '✨', '🔥', '🫶'];

type Phase = 'waiting' | 'revealing' | 'revealed' | 'reacted';

export function RevealCeremony() {
  const post = useRevealStore((s) => s.ceremonyPost);
  const closeCeremony = useRevealStore((s) => s.closeCeremony);
  const { mutateAsync: markViewed } = useMarkPostViewed();
  const { mutateAsync: addReaction } = useAddReaction();

  const [phase, setPhase] = useState<Phase>('waiting');
  const [pickedReaction, setPickedReaction] = useState<string | null>(null);

  // Overlay opacity — fades in on mount, out on close
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.88);
  const reactionsY = useSharedValue(80);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
  const reactionsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reactionsY.value }],
    opacity: reactionsY.value < 20 ? 1 : 0,
  }));

  // Animate in when post changes
  const handleMounted = useCallback(() => {
    overlayOpacity.value = withTiming(1, { duration: 320 });
    cardScale.value = withSpring(1, { damping: 20, stiffness: 200 });
    setPhase('waiting');
    setPickedReaction(null);
  }, []);

  const handleRevealTap = () => {
    if (phase !== 'waiting') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase('revealing');
  };

  const handleRevealComplete = useCallback(async () => {
    setPhase('revealed');
    if (post) await markViewed(post.postId).catch(() => {});
    // Slide reactions up
    reactionsY.value = withSpring(0, { damping: 22, stiffness: 220 });
  }, [post, markViewed, reactionsY]);

  const handleReact = async (emoji: string) => {
    if (!post || pickedReaction) return;
    setPickedReaction(emoji);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addReaction({ postId: post.postId, emoji }).catch(() => {});
  };

  const handleClose = () => {
    overlayOpacity.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) }, () => {
      runOnJS(closeCeremony)();
    });
  };

  if (!post) return null;

  const imageSource = post.thumbnailUrl ?? post.imageUrl;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
      // Trigger mount animation
      onLayout={handleMounted}
    >
      {/* Tap-to-dismiss background */}
      <Pressable style={StyleSheet.absoluteFill} onPress={phase === 'revealed' ? handleClose : undefined} />

      {/* Close button */}
      <Pressable onPress={handleClose} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>✕</Text>
      </Pressable>

      {/* Sender label */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200, delay: 200 }}
        style={styles.senderRow}
      >
        <View style={styles.senderEmoji}>
          <Text style={{ fontSize: 18 }}>{post.senderAvatarEmoji ?? '🌙'}</Text>
        </View>
        <Text style={styles.senderText}>
          from {post.senderDisplayName ?? post.senderUsername}
        </Text>
      </MotiView>

      {/* Polaroid card */}
      <Animated.View style={[styles.polaroidWrap, cardStyle]}>
        <View
          style={[
            styles.polaroid,
            { width: PHOTO_W + INSET * 2 },
          ]}
        >
          {/* Photo area */}
          <Pressable onPress={handleRevealTap} disabled={phase !== 'waiting'}>
            {phase === 'waiting' && (
              <View
                style={{
                  width: PHOTO_W,
                  height: PHOTO_H,
                  backgroundColor: '#C5B89A',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={{ uri: imageSource }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  blurRadius={28}
                />
                <View style={styles.sepiaWash} />
                <FilmGrainOverlay opacity={0.2} />

                {/* "tap to develop" hint */}
                <MotiView
                  from={{ opacity: 0 }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ type: 'timing', duration: 2000, loop: true, delay: 600 }}
                  style={styles.tapHint}
                >
                  <Text style={styles.tapHintText}>tap to develop</Text>
                </MotiView>
              </View>
            )}

            {(phase === 'revealing' || phase === 'revealed' || phase === 'reacted') && (
              <RevealAnimation
                imageUri={post.imageUrl}
                thumbnailUri={imageSource}
                width={PHOTO_W}
                height={PHOTO_H}
                onRevealComplete={handleRevealComplete}
              />
            )}
          </Pressable>

          {/* Strip */}
          <View style={styles.strip}>
            <Text style={styles.stripNote} numberOfLines={1}>
              {post.note ?? ''}
            </Text>
            <Text style={styles.stripDate}>
              {post.createdAt ? new Date(post.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Mood label */}
      {post.mood && phase === 'revealed' && (
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 220 }}
          style={styles.moodBadge}
        >
          <Text style={styles.moodText}>{post.mood}</Text>
        </MotiView>
      )}

      {/* Reactions */}
      <Animated.View style={[styles.reactionsRow, reactionsStyle]}>
        {REACTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => handleReact(emoji)}
            style={[
              styles.reactionBtn,
              pickedReaction === emoji && styles.reactionBtnActive,
              pickedReaction !== null && pickedReaction !== emoji && styles.reactionBtnDimmed,
            ]}
          >
            <MotiView
              animate={{ scale: pickedReaction === emoji ? [1, 1.4, 1] : 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 300 }}
            >
              <Text style={{ fontSize: 28 }}>{emoji}</Text>
            </MotiView>
          </Pressable>
        ))}
      </Animated.View>

      {/* Skip reaction hint */}
      {phase === 'revealed' && !pickedReaction && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 400, delay: 800 }}
          style={styles.skipHint}
        >
          <Pressable onPress={handleClose}>
            <Text style={styles.skipHintText}>or close</Text>
          </Pressable>
        </MotiView>
      )}

      {/* Post-reaction close */}
      {pickedReaction && (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          style={styles.sentBadge}
        >
          <Pressable onPress={handleClose}>
            <Text style={styles.sentBadgeText}>reaction sent ✦</Text>
          </Pressable>
        </MotiView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(4,4,10,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#7A7A9A' },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    top: SCREEN_H * 0.12,
  },
  senderEmoji: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1A1240',
    alignItems: 'center', justifyContent: 'center',
  },
  senderText: {
    fontSize: 14,
    color: '#A0A0C0',
    fontFamily: 'Inter_400Regular',
  },
  polaroidWrap: {
    alignItems: 'center',
    marginTop: -20,
  },
  polaroid: {
    backgroundColor: '#F5F0E8',
    borderRadius: 4,
    padding: INSET,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  sepiaWash: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#C9A96E', opacity: 0.45,
  },
  tapHint: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 11,
    color: '#F5F0E8',
    fontFamily: 'Inter_500Medium',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  strip: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  stripNote: {
    fontSize: 12,
    color: '#2A1F0F',
    fontFamily: 'Inter_400Regular',
    maxWidth: PHOTO_W - 16,
  },
  stripDate: {
    fontSize: 10,
    color: '#6B5A48',
    fontFamily: 'Inter_400Regular',
  },
  moodBadge: {
    marginTop: 16,
    backgroundColor: 'rgba(107,82,224,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#3A2E70',
  },
  moodText: {
    fontSize: 12,
    color: '#A99BFF',
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
    paddingHorizontal: 20,
  },
  reactionBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(107,82,224,0.2)',
    borderColor: '#6B52E0',
  },
  reactionBtnDimmed: { opacity: 0.3 },
  skipHint: { marginTop: 16 },
  skipHintText: {
    fontSize: 13,
    color: '#3D3D5E',
    fontFamily: 'Inter_400Regular',
  },
  sentBadge: { marginTop: 16 },
  sentBadgeText: {
    fontSize: 14,
    color: '#6BCB77',
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.3,
  },
});
