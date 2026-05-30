import { View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@ui/Avatar';
import type { FriendSummary } from '@types/models';
import { formatDistanceToNow } from 'date-fns';

const MOOD_COLORS: Record<string, string> = {
  cozy:        '#FF8C42',
  happy:       '#FFD93D',
  reflective:  '#9BB8D4',
  adventurous: '#6BCB77',
  peaceful:    '#A8E6CF',
  nostalgic:   '#C5A3A3',
  melancholic: '#8B9DC3',
  excited:     '#FF6B6B',
  grateful:    '#C3E88D',
  anxious:     '#E8C3B9',
};

const MOOD_EMOJI: Record<string, string> = {
  cozy: '🕯️', happy: '✨', reflective: '🌧️', adventurous: '🌿',
  peaceful: '🌙', nostalgic: '📷', melancholic: '🌊', excited: '⚡',
  grateful: '🌱', anxious: '🌀',
};

interface FriendCardProps {
  friend: FriendSummary;
  onPress?: () => void;
  index?: number;
}

export function FriendCard({ friend, onPress, index = 0 }: FriendCardProps) {
  const moodColor = friend.currentMood ? MOOD_COLORS[friend.currentMood] : null;
  const moodEmoji = friend.currentMood ? MOOD_EMOJI[friend.currentMood] : null;

  const lastSeen = friend.lastSeenAt
    ? formatDistanceToNow(new Date(friend.lastSeenAt), { addSuffix: true })
    : null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 200, delay: index * 40 }}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: pressed ? '#1A1A2E' : '#12121C',
          borderRadius: 18,
          borderWidth: 1,
          borderColor: '#2E2E48',
          padding: 14,
          gap: 12,
        })}
      >
        {/* Avatar with online indicator */}
        <Avatar
          emoji={friend.avatarEmoji ?? '🌙'}
          uri={friend.avatarUrl ?? undefined}
          size="md"
          isOnline={friend.isOnline}
          hasNewPost={false}
        />

        {/* Info */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>
            {friend.displayName ?? friend.username}
          </Text>

          <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
            @{friend.username}
          </Text>

          {(friend.currentMood || lastSeen) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
              {friend.currentMood && moodEmoji && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                  backgroundColor: (moodColor ?? '#6B52E0') + '20',
                  paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
                }}>
                  <Text style={{ fontSize: 10 }}>{moodEmoji}</Text>
                  <Text style={{ fontSize: 10, color: moodColor ?? '#A99BFF', fontFamily: 'Inter_500Medium' }}>
                    {friend.currentMood}
                  </Text>
                </View>
              )}
              {!friend.isOnline && lastSeen && (
                <Text style={{ fontSize: 10, color: '#3D3D5E', fontFamily: 'Inter_400Regular' }}>
                  {lastSeen}
                </Text>
              )}
            </View>
          )}
        </View>

      </Pressable>
    </MotiView>
  );
}
