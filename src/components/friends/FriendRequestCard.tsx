import { View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@ui/Avatar';
import type { FriendRequest } from '@types/models';
import { formatDistanceToNow } from 'date-fns';

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
  isDecling?: boolean;
  index?: number;
}

export function FriendRequestCard({
  request,
  onAccept,
  onDecline,
  isAccepting,
  isDecling,
  index = 0,
}: FriendRequestCardProps) {
  const timeAgo = formatDistanceToNow(new Date(request.createdAt), { addSuffix: true });

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAccept();
  };

  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDecline();
  };

  return (
    <MotiView
      from={{ opacity: 0, translateX: -12 }}
      animate={{ opacity: 1, translateX: 0 }}
      exit={{ opacity: 0, translateX: 12, scale: 0.95 }}
      transition={{ type: 'spring', damping: 22, stiffness: 200, delay: index * 60 }}
    >
      <View style={{
        backgroundColor: '#12121C',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#3A2E70',
        padding: 14,
        gap: 12,
      }}>
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar
            emoji={request.avatarEmoji ?? '🌙'}
            size="md"
            isOnline={false}
            hasNewPost={false}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>
              {request.displayName ?? request.username}
            </Text>
            <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
              @{request.username} · {timeAgo}
            </Text>
          </View>
          {/* Pulse glow indicating new request */}
          <MotiView
            from={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.6, 1, 0.6] }}
            transition={{ type: 'timing', duration: 2000, loop: true }}
          >
            <View style={{
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: '#8B76F0',
            }} />
          </MotiView>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={handleAccept}
            disabled={isAccepting}
            style={({ pressed }) => ({
              flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center',
              backgroundColor: pressed || isAccepting ? '#5A40C0' : '#6B52E0',
            })}
          >
            <Text style={{ fontSize: 13, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>
              {isAccepting ? '...' : 'accept'}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleDecline}
            disabled={isDecling}
            style={({ pressed }) => ({
              flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center',
              backgroundColor: pressed ? '#2A2A42' : '#1E1E30',
              borderWidth: 1, borderColor: '#2E2E48',
            })}
          >
            <Text style={{ fontSize: 13, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
              decline
            </Text>
          </Pressable>
        </View>
      </View>
    </MotiView>
  );
}
