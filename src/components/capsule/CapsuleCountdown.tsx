import { View, Text } from 'react-native';
import { MotiView } from 'moti';

interface CapsuleCountdownProps {
  unlockAt: string | null;
  milestoneLabel: string | null;
  isOpened: boolean;
}

function getCountdownParts(unlockAt: string | null): {
  days: number; hours: number; minutes: number; isReady: boolean;
} {
  if (!unlockAt) return { days: 0, hours: 0, minutes: 0, isReady: false };
  const diffMs = new Date(unlockAt).getTime() - Date.now();
  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, isReady: true };
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes, isReady: false };
}

export function CapsuleCountdown({ unlockAt, milestoneLabel, isOpened }: CapsuleCountdownProps) {
  if (isOpened) {
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ alignItems: 'center', gap: 8 }}
      >
        <Text style={{ fontSize: 48 }}>📂</Text>
        <Text style={{ fontSize: 18, color: '#6BCB77', fontFamily: 'Inter_600SemiBold' }}>
          opened
        </Text>
      </MotiView>
    );
  }

  if (milestoneLabel && !unlockAt) {
    return (
      <View style={{
        backgroundColor: '#12121C', borderRadius: 20,
        borderWidth: 1, borderColor: '#2E2E48',
        padding: 20, alignItems: 'center', gap: 12,
      }}>
        <Text style={{ fontSize: 36 }}>🎯</Text>
        <Text style={{
          fontSize: 13, color: '#A0A0C0', fontFamily: 'Inter_400Regular',
          textAlign: 'center', lineHeight: 20, fontStyle: 'italic',
        }}>
          "{milestoneLabel}"
        </Text>
        <Text style={{ fontSize: 11, color: '#3D3D5E', fontFamily: 'Inter_500Medium', letterSpacing: 0.5 }}>
          opens when the moment arrives
        </Text>
      </View>
    );
  }

  const { days, hours, minutes, isReady } = getCountdownParts(unlockAt);

  if (isReady) {
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          backgroundColor: '#1A1240', borderRadius: 20,
          borderWidth: 1.5, borderColor: '#6B52E0',
          padding: 24, alignItems: 'center', gap: 12,
        }}
      >
        <MotiView
          from={{ scale: 1 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ type: 'timing', duration: 1500, loop: true }}
        >
          <Text style={{ fontSize: 48 }}>✨</Text>
        </MotiView>
        <Text style={{ fontSize: 20, color: '#A99BFF', fontFamily: 'Inter_700Bold' }}>
          ready to open!
        </Text>
        <Text style={{ fontSize: 13, color: '#7A7A9A', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
          the wait is over
        </Text>
      </MotiView>
    );
  }

  return (
    <View style={{
      backgroundColor: '#0D0D14', borderRadius: 20,
      borderWidth: 1, borderColor: '#2E2E48',
      padding: 20,
    }}>
      <Text style={{
        fontSize: 10, color: '#3D3D5E', fontFamily: 'Inter_600SemiBold',
        letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16,
      }}>
        opens in
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        {days > 0 && (
          <TimeUnit value={days} label="days" />
        )}
        {(days === 0 || days < 30) && (
          <TimeUnit value={hours} label="hrs" />
        )}
        {days === 0 && (
          <TimeUnit value={minutes} label="min" />
        )}
      </View>

      {unlockAt && (
        <Text style={{
          fontSize: 11, color: '#3D3D5E', fontFamily: 'Inter_400Regular',
          textAlign: 'center', marginTop: 14,
        }}>
          {new Date(unlockAt).toLocaleDateString('en', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </Text>
      )}
    </View>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4, minWidth: 56 }}>
      <View style={{
        backgroundColor: '#1A1A28', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 12,
        borderWidth: 1, borderColor: '#2E2E48',
      }}>
        <MotiView
          key={value}
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18 }}
        >
          <Text style={{ fontSize: 28, color: '#EEEEF8', fontFamily: 'Inter_700Bold', letterSpacing: -1 }}>
            {String(value).padStart(2, '0')}
          </Text>
        </MotiView>
      </View>
      <Text style={{ fontSize: 10, color: '#3D3D5E', fontFamily: 'Inter_500Medium', letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}
