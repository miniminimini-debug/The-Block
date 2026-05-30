import { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { useFriends } from '@hooks/useFriendships';
import { Avatar } from '@ui/Avatar';
import * as Haptics from 'expo-haptics';

const ROOM_GRADIENTS: Record<string, [string, string]> = {
  bedroom:   ['#2A2040', '#1A1230'],
  studio:    ['#1E2A3A', '#121C28'],
  loft:      ['#2A1E1E', '#1C1214'],
  treehouse: ['#1A2A1A', '#0E180E'],
  rooftop:   ['#1A1A2A', '#0E0E1C'],
  cabin:     ['#2A1E10', '#1A120A'],
  basement:  ['#141420', '#0A0A14'],
  van:       ['#1A2218', '#0E1610'],
};

const ROOM_EMOJI: Record<string, string> = {
  bedroom: '🛏️', studio: '🎨', loft: '🏗️', treehouse: '🌳',
  rooftop: '🌆', cabin: '🪵', basement: '🎸', van: '🚐',
};

interface RoomUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_url: string | null;
  room_type: string;
  current_mood: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
}

interface RoomPost {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  note: string | null;
  mood: string | null;
  created_at: string;
  development_status: string;
}

export default function RoomScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { friends } = useFriends();

  const friend = friends.find((f) => f.friendId === userId);

  const { data: profile, isLoading: profileLoading } = useQuery<RoomUser>({
    queryKey: ['room-user', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_emoji, avatar_url, room_type, current_mood, is_online, last_seen_at, created_at')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data as RoomUser;
    },
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<RoomPost[]>({
    queryKey: ['room-posts', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, image_url, thumbnail_url, note, mood, created_at, development_status')
        .eq('user_id', userId!)
        .eq('development_status', 'developed')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as RoomPost[];
    },
  });

  const roomType = profile?.room_type ?? 'bedroom';
  const gradient = ROOM_GRADIENTS[roomType] ?? ROOM_GRADIENTS.bedroom;
  const roomEmoji = ROOM_EMOJI[roomType] ?? '🏠';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Room header */}
        <LinearGradient colors={gradient} style={styles.roomHeader}>
          {/* Back button */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>

          {/* Room visual */}
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 180 }}
            style={styles.roomVisual}
          >
            {/* Window glow */}
            <MotiView
              from={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ type: 'timing', duration: 3000, loop: true }}
              style={[styles.windowGlow, { backgroundColor: gradient[0] }]}
            />
            <Text style={styles.roomEmojiLarge}>{roomEmoji}</Text>
          </MotiView>

          {/* User info */}
          {profileLoading ? (
            <ActivityIndicator color="#A99BFF" style={{ marginTop: 20 }} />
          ) : profile ? (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 200, delay: 200 }}
              style={styles.profileRow}
            >
              <Avatar
                emoji={profile.avatar_emoji ?? '🌙'}
                uri={profile.avatar_url ?? undefined}
                size="lg"
                isOnline={profile.is_online}
                hasNewPost={false}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.displayName}>
                  {profile.display_name ?? profile.username}
                </Text>
                <Text style={styles.username}>@{profile.username}</Text>
                {profile.current_mood && (
                  <View style={styles.moodRow}>
                    <Text style={styles.moodText}>{profile.current_mood}</Text>
                  </View>
                )}
              </View>
            </MotiView>
          ) : null}
        </LinearGradient>

        {/* Stats strip */}
        {friend && (
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{friend.friendshipLevel}</Text>
              <Text style={styles.statLabel}>level</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{friend.streakDays}</Text>
              <Text style={styles.statLabel}>day streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{posts.length}</Text>
              <Text style={styles.statLabel}>posts</Text>
            </View>
          </View>
        )}

        {/* Posts grid */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionLabel}>their roll</Text>

          {postsLoading ? (
            <ActivityIndicator color="#6B52E0" style={{ marginTop: 24 }} />
          ) : posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Text style={{ fontSize: 24 }}>📷</Text>
              <Text style={styles.emptyText}>no photos yet</Text>
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {posts.map((post, i) => (
                <MotiView
                  key={post.id}
                  from={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 200, delay: i * 40 }}
                  style={styles.gridItem}
                >
                  <Pressable
                    onPress={() => router.push(`/post/${post.id}`)}
                    style={styles.gridItemInner}
                  >
                    <Image
                      source={{ uri: post.thumbnail_url ?? post.image_url }}
                      style={styles.gridImage}
                      contentFit="cover"
                      transition={400}
                    />
                    {post.note && (
                      <View style={styles.gridNote}>
                        <Text style={styles.gridNoteText} numberOfLines={1}>
                          {post.note}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </MotiView>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const GRID_GAP = 3;
const GRID_COLS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080F' },
  roomHeader: { paddingBottom: 28, paddingHorizontal: 20 },
  backBtn: {
    marginTop: 12, marginBottom: 8,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: '#EEEEF8' },
  roomVisual: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginBottom: 8,
  },
  windowGlow: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    opacity: 0.5,
  },
  roomEmojiLarge: { fontSize: 64 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  profileInfo: { flex: 1, gap: 3 },
  displayName: { fontSize: 20, color: '#EEEEF8', fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  username: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular' },
  moodRow: {
    marginTop: 4,
    backgroundColor: 'rgba(107,82,224,0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  moodText: { fontSize: 11, color: '#A99BFF', fontFamily: 'Inter_500Medium' },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#12121C',
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E48',
    paddingVertical: 16,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, color: '#EEEEF8', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: '#2E2E48' },
  postsSection: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: { fontSize: 11, color: '#3D3D5E', fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
  emptyPosts: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: '#3D3D5E', fontFamily: 'Inter_400Regular' },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridItem: { width: `${(100 - GRID_GAP * (GRID_COLS - 1) / 2) / GRID_COLS}%` },
  gridItemInner: { borderRadius: 8, overflow: 'hidden', backgroundColor: '#1A1A2E' },
  gridImage: { width: '100%', aspectRatio: 1 },
  gridNote: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6, paddingVertical: 4,
  },
  gridNoteText: { fontSize: 9, color: '#EEEEF8', fontFamily: 'Inter_400Regular' },
});
