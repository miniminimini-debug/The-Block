import { View, Text } from 'react-native';
import { MotiView } from 'moti';

interface ExposureCounterProps {
  shotsTaken: number;
  maxShots: number;
  size?: 'sm' | 'lg';
}

export function ExposureCounter({ shotsTaken, maxShots, size = 'lg' }: ExposureCounterProps) {
  const shotsLeft = maxShots - shotsTaken;
  const isAlmostFull = shotsLeft <= 3;
  const isFull = shotsLeft === 0;

  const counterColor = isFull ? '#FF6B6B' : isAlmostFull ? '#FF8C42' : '#C9A060';

  if (size === 'sm') {
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
      }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: counterColor }}>
          {shotsLeft}
        </Text>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular' }}>
          left
        </Text>
      </View>
    );
  }

  return (
    <View style={{
      alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
      borderWidth: 1, borderColor: 'rgba(201,160,96,0.3)',
    }}>
      {/* Film strip sprockets */}
      <View style={{ flexDirection: 'row', gap: 3, marginBottom: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={{
            width: 8, height: 6, borderRadius: 2,
            backgroundColor: 'rgba(201,160,96,0.25)',
          }} />
        ))}
      </View>

      {/* Shot counter */}
      <MotiView
        key={shotsTaken}
        from={{ opacity: 0, scale: 1.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        style={{ alignItems: 'center' }}
      >
        <Text style={{ fontSize: 32, fontFamily: 'Inter_700Bold', color: counterColor, letterSpacing: -1 }}>
          {String(shotsLeft).padStart(2, '0')}
        </Text>
      </MotiView>

      <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter_600SemiBold', letterSpacing: 1.5, textTransform: 'uppercase' }}>
        shots left
      </Text>

      {/* Bottom sprockets */}
      <View style={{ flexDirection: 'row', gap: 3, marginTop: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={{
            width: 8, height: 6, borderRadius: 2,
            backgroundColor: 'rgba(201,160,96,0.25)',
          }} />
        ))}
      </View>
    </View>
  );
}
