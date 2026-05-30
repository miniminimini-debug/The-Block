import { View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';
import type { Capsule } from '@types/models';

interface CapsuleCardProps {
  capsule: Capsule;
  onPress: () => void;
  index?: number;
}

function getCountdownLabel(unlockAt: string | null): string {
  if (!unlockAt) return 'milestone';
  const diffMs = new Date(unlockAt).getTime() - Date.now();
  if (diffMs <= 0) return 'ready to open';
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) return '1 day left';
  if (days < 30) return `${days} days left`;
  const months = Math.ceil(days / 30);
  if (months < 12) return `${months} months left`;
  return `${Math.ceil(months / 12)} years left`;
}

export function CapsuleCard({ capsule, onPress, index = 0 }: CapsuleCardProps) {
  const isReady = capsule.unlockAt
    ? new Date(capsule.unlockAt).getTime() <= Date.now()
    : false;

  const isOpen = capsule.isOpened;
  const countdownLabel = getCountdownLabel(capsule.unlockAt);

  const borderColor = isOpen ? '#2A3D2A' : isReady ? '#6B52E0' : '#2E2E48';
  const accentColor = isOpen ? '#6BCB77' : isReady ? '#A99BFF' : '#7A7A9A';

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
          borderColor,
          overflow: 'hidden',
          padding: 16,
          gap: 12,
        })}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {/* Sealed envelope / open state */}
          <View style={{
            width: 52, height: 52, borderRadius: 14,
            backgroundColor: isOpen ? '#0A1F0A' : '#1A1240',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1,
            borderColor: isOpen ? '#2A3D2A' : '#3A2E70',
          }}>
            <Text style={{ fontSize: 26 }}>{isOpen ? '📂' : capsule.coverEmoji}</Text>
            {!isOpen && (
              <View style={{
                position: 'absolute', bottom: -4, right: -4,
                backgroundColor: '#0D0D14', borderRadius: 6, padding: 2,
              }}>
                <Text style={{ fontSize: 10 }}>🔒</Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontSize: 16, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
              {capsule.title}
            </Text>
            {capsule.description && (
              <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                {capsule.description}
              </Text>
            )}
          </View>

          {/* Status */}
          <View style={{
            backgroundColor: isOpen ? '#0A1F0A' : isReady ? '#1A1240' : '#0D0D14',
            borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
          }}>
            <Text style={{ fontSize: 11, color: accentColor, fontFamily: 'Inter_500Medium' }}>
              {isOpen ? 'opened' : isReady ? 'ready!' : capsule.milestoneLabel ? 'milestone' : countdownLabel}
            </Text>
          </View>
        </View>

        {/* Footer: members submitted */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: '#3D3D5E', fontFamily: 'Inter_400Regular' }}>
            {capsule.submissionCount ?? 0}/{capsule.memberCount ?? 0} submitted
          </Text>

          {/* Submission progress dots */}
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: capsule.memberCount ?? 0 }).slice(0, 8).map((_, i) => (
              <View key={i} style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: i < (capsule.submissionCount ?? 0) ? accentColor : '#2E2E48',
              }} />
            ))}
          </View>
        </View>

        {/* Unlock date if set */}
        {capsule.unlockAt && !isOpen && (
          <View style={{
            backgroundColor: '#0D0D14', borderRadius: 10,
            paddingHorizontal: 12, paddingVertical: 8,
            flexDirection: 'row', alignItems: 'center', gap: 6,
          }}>
            <Text style={{ fontSize: 12 }}>{isReady ? '✨' : '⏳'}</Text>
            <Text style={{ fontSize: 12, color: isReady ? '#A99BFF' : '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
              {isReady
                ? 'ready to open!'
                : `opens ${new Date(capsule.unlockAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </Text>
          </View>
        )}

        {capsule.milestoneLabel && !isOpen && (
          <View style={{
            backgroundColor: '#0D0D14', borderRadius: 10,
            paddingHorizontal: 12, paddingVertical: 8,
            flexDirection: 'row', alignItems: 'center', gap: 6,
          }}>
            <Text style={{ fontSize: 12 }}>🎯</Text>
            <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular', fontStyle: 'italic' }}>
              "{capsule.milestoneLabel}"
            </Text>
          </View>
        )}
      </Pressable>
    </MotiView>
  );
}
