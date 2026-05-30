import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Image } from 'expo-image';
import { useFriendshipBoard } from '@hooks/useFriendshipBoards';
import { useFeed } from '@hooks/useDevelopingQueue';
import { useAuthStore } from '@stores/auth.store';
import { useTheme } from '@hooks/useTheme';

export default function FriendshipBoardScreen() {
  const { boardId } = useLocalSearchParams<{ boardId: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);

  const { board, isLoading } = useFriendshipBoard(boardId ?? '');
  const { feed } = useFeed();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!board) return null;

  const members = board.members ?? [];
  const otherMember = members.find((m) => m.userId !== userId);

  // Filter feed to show only shared posts between board members
  const memberIds = new Set(members.map((m) => m.userId));
  const sharedPosts = feed.filter((p) => memberIds.size < 3);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 20 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontSize: 15, color: theme.textSub, fontFamily: 'Inter_400Regular' }}>‹ back</Text>
          </Pressable>
          <Text style={{ fontSize: 17, color: theme.text, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>
            {board.coverEmoji} {board.title ?? (otherMember ? `you & ${otherMember.user?.username ?? '...'}` : 'friendship board')}
          </Text>
          <View style={{ width: 52 }} />
        </View>

        {/* Members */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.border }}>
          {members.map((m, i) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: i === 0 ? 0 : 6 }}>
              {i > 0 && <Text style={{ fontSize: 13, color: theme.textDim }}>·</Text>}
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: m.userId === userId ? theme.accentDim : theme.surfaceElevated, borderWidth: 1.5, borderColor: m.userId === userId ? theme.accent : theme.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>{m.user?.avatar_emoji ?? '🌙'}</Text>
                </View>
                <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'Inter_400Regular' }}>
                  {m.userId === userId ? 'you' : (m.user?.username ?? '...')}
                </Text>
              </View>
            </View>
          ))}
          <Text style={{ marginLeft: 'auto', fontSize: 12, color: theme.textDim, fontFamily: 'Inter_400Regular' }}>
            together since {new Date(board.createdAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
          </Text>
        </View>

        {/* Shared memories */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>
            shared memories
          </Text>

          {sharedPosts.length === 0 ? (
            <View style={{ backgroundColor: theme.surface, borderRadius: 18, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ fontSize: 40 }}>📷</Text>
              <Text style={{ fontSize: 14, color: theme.textSub, fontFamily: 'Inter_500Medium', textAlign: 'center' }}>
                no shared photos yet
              </Text>
              <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                send polaroids to each other and they'll appear here
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {sharedPosts.slice(0, 9).map((post, i) => (
                <MotiView
                  key={post.postId}
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 40, type: 'spring', damping: 22 }}
                >
                  <Pressable onPress={() => router.push(`/post/${post.postId}`)}>
                    <Image
                      source={{ uri: post.imageUrl }}
                      style={{ width: (360 - 48) / 3, height: (360 - 48) / 3, borderRadius: 10 }}
                      contentFit="cover"
                      transition={400}
                    />
                  </Pressable>
                </MotiView>
              ))}
            </View>
          )}
        </View>

        {/* Friendship milestones placeholder */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>
            milestones
          </Text>
          <View style={{ backgroundColor: theme.surface, borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: theme.border }}>
            {[
              { emoji: '🌱', label: 'first polaroid', done: sharedPosts.length > 0 },
              { emoji: '🎞', label: '10 photos together', done: sharedPosts.length >= 10 },
              { emoji: '📦', label: 'first time capsule', done: false },
              { emoji: '📌', label: 'first cork board', done: false },
            ].map((m, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 20, opacity: m.done ? 1 : 0.35 }}>{m.emoji}</Text>
                <Text style={{ fontSize: 13, color: m.done ? theme.text : theme.textDim, fontFamily: m.done ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                  {m.label}
                </Text>
                {m.done && <Text style={{ marginLeft: 'auto', fontSize: 12, color: theme.success }}>✓</Text>}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
