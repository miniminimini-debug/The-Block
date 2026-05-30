import { View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Image } from 'expo-image';
import type { Roll } from '@types/models';

interface RollCardProps {
  roll: Roll;
  onPress: () => void;
  index?: number;
}

export function RollCard({ roll, onPress, index = 0 }: RollCardProps) {
  const shotsLeft = roll.maxShots - roll.shotsTaken;
  const progress = roll.shotsTaken / roll.maxShots;
  const isDeveloping = roll.status === 'developing';
  const isDeveloped = roll.status === 'developed';

  const statusLabel = isDeveloped
    ? 'developed ✦'
    : isDeveloping
    ? 'developing...'
    : `${shotsLeft} shot${shotsLeft === 1 ? '' : 's'} left`;

  const statusColor = isDeveloped ? '#6BCB77' : isDeveloping ? '#C9A060' : '#A0A0C0';

  // Show up to 4 member avatars
  const previewMembers = (roll.members ?? []).slice(0, 4);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 200, delay: index * 60 }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: pressed ? '#1C1830' : '#12121C',
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: isDeveloped ? '#2A3D2A' : isDeveloping ? '#3D3010' : '#2E2E48',
          overflow: 'hidden',
        })}
      >
        {/* Film strip top bar */}
        <View style={{
          flexDirection: 'row', backgroundColor: '#0A0A12',
          paddingVertical: 6, paddingHorizontal: 12, gap: 4, alignItems: 'center',
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={{
              flex: 1, height: 10, borderRadius: 2,
              backgroundColor: i / 8 < progress ? '#C9A060' : '#1A1A28',
            }} />
          ))}
        </View>

        {/* Body */}
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            {/* Emoji + name */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: '#1A1A28',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 22 }}>{roll.coverEmoji}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
                  {roll.name}
                </Text>
                {roll.description && (
                  <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                    {roll.description}
                  </Text>
                )}
              </View>
            </View>

            {/* Status badge */}
            <View style={{
              backgroundColor: isDeveloped ? '#0A1F0A' : isDeveloping ? '#1F1A08' : '#1A1A28',
              borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
            }}>
              <Text style={{ fontSize: 11, color: statusColor, fontFamily: 'Inter_500Medium' }}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={{ height: 3, backgroundColor: '#1A1A28', borderRadius: 2, overflow: 'hidden' }}>
            <MotiView
              from={{ width: '0%' }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: 'timing', duration: 800 }}
              style={{ height: '100%', backgroundColor: isDeveloped ? '#6BCB77' : '#C9A060', borderRadius: 2 }}
            />
          </View>

          {/* Footer: member avatars + shot count */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', gap: -6 }}>
              {previewMembers.map((m, i) => (
                <View key={m.id} style={{
                  width: 24, height: 24, borderRadius: 12,
                  backgroundColor: '#2E2E48', borderWidth: 1.5, borderColor: '#12121C',
                  alignItems: 'center', justifyContent: 'center',
                  marginLeft: i === 0 ? 0 : -6, zIndex: previewMembers.length - i,
                }}>
                  <Text style={{ fontSize: 11 }}>{m.user?.avatar_emoji ?? '🌙'}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
              {roll.shotsTaken}/{roll.maxShots} shots
            </Text>
          </View>
        </View>
      </Pressable>
    </MotiView>
  );
}
