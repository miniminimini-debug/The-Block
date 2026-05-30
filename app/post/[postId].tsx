import { View, Text, Pressable, ScrollView, Share, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { useAddReaction } from '@hooks/usePosts';
import { FilmGrainOverlay } from '@/components/polaroid/FilmGrainOverlay';
import { format } from 'date-fns';

const REACTIONS = ['❤️', '😭', '✨', '🔥', '🫶'];

const MOOD_COLORS: Record<string, string> = {
  cozy: '#FF8C42', happy: '#FFD93D', reflective: '#9BB8D4',
  adventurous: '#6BCB77', peaceful: '#A8E6CF', nostalgic: '#C5A3A3',
};

export default function PostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user.id);
  const qc = useQueryClient();
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const { mutateAsync: addReaction } = useAddReaction();

  const { data: post, isLoading } = useQuery({
    queryKey: ['post-detail', postId],
    enabled: !!postId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, image_url, thumbnail_url, note, mood, created_at, development_status,
          reaction_counts, view_count,
          sender:users!posts_user_id_fkey ( id, username, display_name, avatar_emoji )
        `)
        .eq('id', postId!)
        .single();
      if (error) throw error;

      // Also fetch my reaction
      if (userId) {
        const { data: r } = await supabase
          .from('reactions')
          .select('emoji')
          .eq('post_id', postId!)
          .eq('user_id', userId)
          .maybeSingle();
        if (r?.emoji) setMyReaction(r.emoji);
      }

      return data as any;
    },
  });

  const handleReact = async (emoji: string) => {
    if (!postId || myReaction) return;
    setMyReaction(emoji);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addReaction({ postId, emoji }).catch(() => setMyReaction(null));
  };

  const moodColor = post?.mood ? MOOD_COLORS[post.mood] : null;

  if (isLoading || !post) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ type: 'timing', duration: 1400, loop: true }}
        >
          <Text style={{ fontSize: 32 }}>📷</Text>
        </MotiView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        style={[styles.backBtn, { marginTop: 8 }]}
      >
        <Text style={styles.backText}>←</Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Polaroid frame */}
        <MotiView
          from={{ opacity: 0, scale: 0.93, rotate: '-1deg' }}
          animate={{ opacity: 1, scale: 1, rotate: '0deg' }}
          transition={{ type: 'spring', damping: 22, stiffness: 200, delay: 80 }}
          style={styles.polaroidWrap}
        >
          <View style={styles.polaroid}>
            {/* Photo */}
            <View style={styles.photoArea}>
              <Image
                source={{ uri: post.image_url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={600}
              />
              <FilmGrainOverlay opacity={0.06} />

              {/* Mood color wash */}
              {moodColor && (
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: moodColor, opacity: 0.08 }]}
                />
              )}
            </View>

            {/* Polaroid strip */}
            <View style={styles.strip}>
              {post.note && (
                <Text style={styles.stripNote}>{post.note}</Text>
              )}
              <Text style={styles.stripDate}>
                {format(new Date(post.created_at), 'MMM d, yyyy')}
              </Text>
            </View>
          </View>
        </MotiView>

        {/* Sender info */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 200, delay: 200 }}
          style={styles.senderSection}
        >
          <View style={styles.senderRow}>
            <View style={styles.senderAvatar}>
              <Text style={{ fontSize: 20 }}>{post.sender?.avatar_emoji ?? '🌙'}</Text>
            </View>
            <View style={{ gap: 1 }}>
              <Text style={styles.senderName}>
                {post.sender?.display_name ?? post.sender?.username ?? ''}
              </Text>
              <Text style={styles.senderUsername}>@{post.sender?.username ?? ''}</Text>
            </View>
            {post.mood && (
              <View style={[styles.moodPill, { borderColor: moodColor ?? '#3A2E70', backgroundColor: (moodColor ?? '#6B52E0') + '20' }]}>
                <Text style={[styles.moodPillText, { color: moodColor ?? '#A99BFF' }]}>
                  {post.mood}
                </Text>
              </View>
            )}
          </View>
        </MotiView>

        {/* Reactions */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 200, delay: 300 }}
          style={styles.reactionsSection}
        >
          <Text style={styles.sectionLabel}>react</Text>
          <View style={styles.reactionsRow}>
            {REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => handleReact(emoji)}
                disabled={!!myReaction}
                style={[
                  styles.reactionBtn,
                  myReaction === emoji && styles.reactionBtnActive,
                  myReaction !== null && myReaction !== emoji && { opacity: 0.3 },
                ]}
              >
                <MotiView
                  animate={{ scale: myReaction === emoji ? [1, 1.3, 1] : 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 300 }}
                >
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </MotiView>
              </Pressable>
            ))}
          </View>
        </MotiView>
      </ScrollView>
    </View>
  );
}

const PHOTO_W = 300;
const PHOTO_H = 240;
const INSET = 10;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080F' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 8 },
  backText: { fontSize: 16, color: '#5A5A7A', fontFamily: 'Inter_400Regular' },
  polaroidWrap: { alignItems: 'center', paddingVertical: 20 },
  polaroid: {
    width: PHOTO_W + INSET * 2,
    backgroundColor: '#F5F0E8',
    borderRadius: 4,
    padding: INSET,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  photoArea: {
    width: PHOTO_W,
    height: PHOTO_H,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#E8E0D0',
  },
  strip: {
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stripNote: {
    fontSize: 13, color: '#2A1F0F',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  stripDate: {
    fontSize: 10, color: '#6B5A48',
    fontFamily: 'Inter_400Regular',
  },
  senderSection: { paddingHorizontal: 24, marginTop: 4, marginBottom: 8 },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  senderAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1A1240',
    borderWidth: 1.5, borderColor: '#3A2E70',
    alignItems: 'center', justifyContent: 'center',
  },
  senderName: { fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' },
  senderUsername: { fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' },
  moodPill: {
    marginLeft: 'auto',
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  moodPillText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  reactionsSection: { paddingHorizontal: 24, marginTop: 16 },
  sectionLabel: {
    fontSize: 10, color: '#3D3D5E',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 12,
  },
  reactionsRow: { flexDirection: 'row', gap: 12 },
  reactionBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#12121C',
    borderWidth: 1, borderColor: '#2E2E48',
    alignItems: 'center', justifyContent: 'center',
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(107,82,224,0.2)',
    borderColor: '#6B52E0',
  },
});
