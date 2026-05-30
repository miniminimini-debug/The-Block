import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useRevealStore } from '@stores/reveal.store';
import { useDeveloping, useDarkroom, useCountdown } from '@hooks/useDevelopingQueue';
import { CountdownRing } from './CountdownRing';
import type { ReceivedPost } from '@hooks/usePosts';

interface QueueCardProps {
  post: ReceivedPost;
  index: number;
  isDarkroom?: boolean;
}

function QueueCard({ post, index, isDarkroom = false }: QueueCardProps) {
  const openCeremony = useRevealStore((s) => s.openCeremony);
  const { label, progress } = useCountdown(post.developedAt);
  const imageSource = post.thumbnailUrl ?? post.imageUrl;

  const handlePress = () => {
    if (!isDarkroom) return; // developing cards aren't tappable yet
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openCeremony(post);
  };

  const CARD_WIDTH = 84;
  const PHOTO_HEIGHT = 72;
  const INSET = 4;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9, translateY: 8 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 250, delay: index * 60 }}
    >
      <Pressable
        onPress={handlePress}
        disabled={!isDarkroom}
        style={{ alignItems: 'center', gap: 6, width: CARD_WIDTH }}
      >
        {/* Mini polaroid */}
        <View
          style={{
            width: CARD_WIDTH,
            backgroundColor: '#F5F0E8',
            borderRadius: 3,
            padding: INSET,
            paddingBottom: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {/* Photo area */}
          <View
            style={{
              width: CARD_WIDTH - INSET * 2,
              height: PHOTO_HEIGHT,
              backgroundColor: '#C5B89A',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Image
              source={{ uri: imageSource }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              blurRadius={isDarkroom ? 8 : 28}
            />

            {/* Sepia wash */}
            {!isDarkroom && (
              <View
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: '#C9A96E', opacity: 0.5,
                }}
              />
            )}

            {/* Ready glow for darkroom */}
            {isDarkroom && (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ type: 'timing', duration: 2000, loop: true }}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: '#8B76F0',
                }}
              />
            )}
          </View>

          {/* Strip */}
          <View style={{ height: 28, alignItems: 'center', justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: 9, color: '#6B5A48',
                fontFamily: 'Inter_400Regular',
                letterSpacing: 0.3,
              }}
              numberOfLines={1}
            >
              {post.senderUsername}
            </Text>
          </View>
        </View>

        {/* Countdown ring below card */}
        <CountdownRing label={isDarkroom ? 'tap ✦' : label} progress={progress} size={44} />
      </Pressable>
    </MotiView>
  );
}

// ─── DevelopingQueue ──────────────────────────────────────────────────────────

interface DevelopingQueueProps {
  onSeeAll?: () => void;
}

export function DevelopingQueue({ onSeeAll }: DevelopingQueueProps) {
  const { developing } = useDeveloping();
  const { darkroom } = useDarkroom();

  const total = developing.length + darkroom.length;
  if (total === 0) return null;

  const allItems = [
    ...darkroom.map((p) => ({ post: p, isDarkroom: true })),
    ...developing.map((p) => ({ post: p, isDarkroom: false })),
  ];

  return (
    <View style={{ marginBottom: 4 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{
              fontSize: 11,
              color: '#5A5A7A',
              fontFamily: 'Inter_600SemiBold',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            darkroom
          </Text>
          {darkroom.length > 0 && (
            <View
              style={{
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: '#6B52E0',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 9, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>
                {darkroom.length}
              </Text>
            </View>
          )}
        </View>
        {onSeeAll && (
          <Pressable onPress={onSeeAll}>
            <Text style={{ fontSize: 12, color: '#6B52E0', fontFamily: 'Inter_500Medium' }}>
              see all
            </Text>
          </Pressable>
        )}
      </View>

      {/* Horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
      >
        {allItems.map(({ post, isDarkroom }, i) => (
          <QueueCard
            key={post.postId}
            post={post}
            index={i}
            isDarkroom={isDarkroom}
          />
        ))}
      </ScrollView>
    </View>
  );
}
