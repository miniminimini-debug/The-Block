import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useMyScrapbooks } from '@hooks/useScrapbooks';
import { useAuthStore } from '@stores/auth.store';
import { useTheme } from '@hooks/useTheme';

const COVER_PALETTES = [
  ['#8B3A3A', '#F5C0A0'],
  ['#3A5A8B', '#A0C0F5'],
  ['#3A6B3A', '#A0E0A0'],
  ['#7A3A8B', '#D0A0F5'],
  ['#8B6A3A', '#F5D0A0'],
  ['#3A3A7A', '#A0A0F0'],
];

function palette(id: string) {
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return COVER_PALETTES[sum % COVER_PALETTES.length];
}

export default function SharedAlbumsScreen() {
  const { userId: friendId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);

  const { scrapbooks, isLoading } = useMyScrapbooks();

  // Only show scrapbooks where the friend is also a member
  const shared = scrapbooks.filter((sb) =>
    (sb.members ?? []).some((m) => m.userId === friendId)
  );

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
          <Text style={{ fontSize: 17, color: theme.text, fontFamily: 'Inter_700Bold' }}>shared albums</Text>
          <View style={{ width: 52 }} />
        </View>

        {isLoading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : shared.length === 0 ? (
          /* Empty state */
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22 }}
            style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 32, alignItems: 'center', gap: 16, borderWidth: 1, borderColor: theme.border, marginTop: 24 }}
          >
            <Text style={{ fontSize: 13, color: theme.textSub, fontFamily: 'Inter_500Medium', textAlign: 'center' }}>
              no shared albums yet
            </Text>
            <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 }}>
              start a scrapbook together to collect your favourite moments
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/scrapbook/new', params: { preselectedFriendId: friendId } } as any);
              }}
              style={{ marginTop: 4, backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accent, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12 }}
            >
              <Text style={{ fontSize: 13, color: theme.accentLight, fontFamily: 'Inter_600SemiBold' }}>start a shared album</Text>
            </Pressable>
          </MotiView>
        ) : (
          /* Book covers grid */
          <>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>
              {shared.length} album{shared.length !== 1 ? 's' : ''}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {shared.map((sb, i) => {
                const [main, text] = palette(sb.id);
                return (
                  <MotiView
                    key={sb.id}
                    from={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 60, type: 'spring', damping: 22 }}
                  >
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/scrapbook/${sb.id}` as any); }}
                      style={{ width: 140 }}
                    >
                      {/* Book cover */}
                      <View style={{
                        width: 140, height: 180,
                        backgroundColor: main, borderRadius: 4,
                        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: -3, height: 4 },
                        elevation: 6, overflow: 'hidden',
                        paddingTop: 16, paddingHorizontal: 12,
                        gap: 8,
                      }}>
                        {/* Spine */}
                        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: 'rgba(0,0,0,0.2)' }} />
                        {/* Texture lines */}
                        {[0,1,2].map((n) => (
                          <View key={n} style={{ position: 'absolute', left: 0, right: 0, top: 55 + n * 32, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />
                        ))}
                        <Text style={{ fontFamily: 'Caveat_400Regular', fontSize: 22, color: text, lineHeight: 26 }} numberOfLines={3}>
                          {sb.title}
                        </Text>
                        <Text style={{ fontFamily: 'Caveat_400Regular', fontSize: 14, color: text, opacity: 0.65 }}>
                          {sb.pageCount ?? 0} page{(sb.pageCount ?? 0) !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </Pressable>
                  </MotiView>
                );
              })}

              {/* Add new album card */}
              <MotiView
                from={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: shared.length * 60, type: 'spring', damping: 22 }}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/scrapbook/new', params: { preselectedFriendId: friendId } } as any);
                  }}
                  style={{
                    width: 140, height: 180,
                    backgroundColor: theme.surface,
                    borderRadius: 4, borderWidth: 1.5, borderColor: theme.border,
                    borderStyle: 'dashed',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 28, color: theme.textDim }}>+</Text>
                  <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'Inter_500Medium', textAlign: 'center' }}>
                    new album
                  </Text>
                </Pressable>
              </MotiView>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
