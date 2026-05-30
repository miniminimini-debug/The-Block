import { View, Text, Pressable, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import type { CameraPass } from '@types/models';

interface PassChainCardProps {
  pass: CameraPass;
  currentUserId: string;
  onPress: () => void;
  index?: number;
}

export function PassChainCard({ pass, currentUserId, onPress, index = 0 }: PassChainCardProps) {
  const isMyTurn = pass.currentHolderId === currentUserId && !pass.isComplete;
  const participants = pass.participants ?? [];
  const shots = pass.shots ?? [];
  const completedCount = participants.filter((p) => p.completed).length;

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
          borderColor: isMyTurn ? '#6B52E0' : pass.isComplete ? '#2A3D2A' : '#2E2E48',
          overflow: 'hidden',
          padding: 16,
          gap: 12,
        })}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <View style={{ gap: 2, flex: 1 }}>
            <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
              {pass.title ?? 'camera pass'}
            </Text>
            <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
              {completedCount}/{participants.length} done
            </Text>
          </View>

          <View style={{
            backgroundColor: isMyTurn ? '#1A1240' : pass.isComplete ? '#0A1F0A' : '#1A1A28',
            borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
          }}>
            <Text style={{
              fontSize: 11, fontFamily: 'Inter_500Medium',
              color: isMyTurn ? '#A99BFF' : pass.isComplete ? '#6BCB77' : '#5A5A7A',
            }}>
              {isMyTurn ? '📷 your turn!' : pass.isComplete ? 'complete ✦' : 'waiting...'}
            </Text>
          </View>
        </View>

        {/* Participant chain */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 0 }}>
          {participants.map((p, i) => {
            const isHolder = p.userId === pass.currentHolderId;
            const isDone = p.completed;
            return (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <MotiView
                    animate={{ scale: isHolder ? 1.15 : 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundColor: isDone ? '#0A1F0A' : isHolder ? '#1A1240' : '#1A1A28',
                      borderWidth: 2,
                      borderColor: isDone ? '#3A7A3A' : isHolder ? '#6B52E0' : '#2E2E48',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{p.user?.avatar_emoji ?? '🌙'}</Text>
                  </MotiView>
                  <Text style={{
                    fontSize: 9, fontFamily: 'Inter_400Regular',
                    color: isDone ? '#6BCB77' : isHolder ? '#A99BFF' : '#3D3D5E',
                    maxWidth: 36, textAlign: 'center',
                  }} numberOfLines={1}>
                    {isDone ? '✓' : isHolder ? '→' : (p.user?.username ?? '?')}
                  </Text>
                </View>

                {/* Connector line */}
                {i < participants.length - 1 && (
                  <View style={{
                    width: 20, height: 2,
                    backgroundColor: i < completedCount ? '#3A7A3A' : '#2E2E48',
                    marginBottom: 16,
                  }} />
                )}
              </View>
            );
          })}
        </ScrollView>
      </Pressable>
    </MotiView>
  );
}
