import { View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import type { DeskDrop } from '@types/models';

interface DeskDropCardProps {
  drop: DeskDrop;
  onDiscover: (id: string) => void;
  isLoading?: boolean;
}

export function DeskDropCard({ drop, onDiscover, isLoading }: DeskDropCardProps) {
  const handleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDiscover(drop.id);
  };

  const senderName = drop.sender?.display_name ?? drop.sender?.username ?? 'someone';

  return (
    <MotiView
      from={{ opacity: 0, translateX: -12 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 180 }}
    >
      <Pressable
        onPress={handleTap}
        disabled={isLoading}
        style={({ pressed }) => ({
          opacity: pressed ? 0.85 : 1,
          backgroundColor: '#12121C',
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: '#3A2E70',
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 14,
        })}
      >
        {/* Blurred photo or note icon */}
        <View style={{
          width: 60, height: 60, borderRadius: 10,
          overflow: 'hidden', backgroundColor: '#1A1240',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {drop.thumbnailUrl ? (
            <>
              <Image
                source={{ uri: drop.thumbnailUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                blurRadius={12}
              />
              <View style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: '#6B52E0', opacity: 0.2,
              }} />
            </>
          ) : (
            <Text style={{ fontSize: 26 }}>📝</Text>
          )}
        </View>

        {/* Info */}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>
              {senderName}
            </Text>
            {/* Glow dot */}
            <MotiView
              from={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ type: 'timing', duration: 1800, loop: true }}
              style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#8B76F0' }}
            />
          </View>
          <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
            left something on your desk
          </Text>
          {drop.note && !drop.thumbnailUrl && (
            <Text style={{
              fontSize: 12, color: '#7A7A9A', fontFamily: 'Inter_400Regular', fontStyle: 'italic',
            }} numberOfLines={1}>
              "{drop.note}"
            </Text>
          )}
        </View>

        {/* Reveal button */}
        <View style={{
          backgroundColor: '#6B52E0', borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 7,
        }}>
          <Text style={{ fontSize: 12, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>
            look
          </Text>
        </View>
      </Pressable>
    </MotiView>
  );
}
