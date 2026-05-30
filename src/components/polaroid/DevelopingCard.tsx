import { View, Text } from 'react-native';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { FilmGrainOverlay } from './FilmGrainOverlay';

interface DevelopingCardProps {
  thumbnailUri: string;
  senderName: string;
  developedAt: string | null;
  developmentDelayMins: number;
  width?: number;
  height?: number;
}

function getTimeRemaining(developedAt: string | null, delayMins: number, createdAt?: string): string {
  if (developedAt) return '';
  if (!createdAt) return 'developing...';

  const created = new Date(createdAt);
  const revealTime = new Date(created.getTime() + delayMins * 60 * 1000);
  const now = new Date();
  const diffMs = revealTime.getTime() - now.getTime();

  if (diffMs <= 0) return 'almost ready...';

  const diffMins = Math.ceil(diffMs / 60000);
  if (diffMins < 60) return `ready in ~${diffMins}m`;
  const hours = Math.ceil(diffMins / 60);
  return `ready in ~${hours}h`;
}

export function DevelopingCard({
  thumbnailUri,
  senderName,
  developedAt,
  developmentDelayMins,
  width = 260,
  height = 200,
}: DevelopingCardProps) {
  const inset = 6;

  return (
    <View style={{
      width,
      backgroundColor: '#F5F0E8',
      borderRadius: 4,
      padding: inset,
      paddingBottom: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
      elevation: 5,
    }}>
      {/* Photo area — blurred + sepia */}
      <View style={{ width: width - inset * 2, height, backgroundColor: '#C5B89A', borderRadius: 2, overflow: 'hidden' }}>
        <Image
          source={{ uri: thumbnailUri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          blurRadius={30}
        />

        {/* Sepia color wash */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#C9A96E', opacity: 0.5 }} />

        {/* Heavy film grain for developing state */}
        <FilmGrainOverlay opacity={0.22} />

        {/* Developing label */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {/* Pulsing camera icon */}
          <MotiView
            from={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.6, 1, 0.6] }}
            transition={{ type: 'timing', duration: 2200, loop: true }}
          >
            <Text style={{ fontSize: 32 }}>📷</Text>
          </MotiView>

          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 12, color: '#2A1F0F', fontFamily: 'Inter_600SemiBold', letterSpacing: 1 }}>
              DEVELOPING
            </Text>
            <Text style={{ fontSize: 11, color: '#6B5A48', fontFamily: 'Inter_400Regular' }}>
              from {senderName}
            </Text>
          </View>
        </View>
      </View>

      {/* Strip */}
      <View style={{ height: 56, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <MotiView
          from={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ type: 'timing', duration: 1800, loop: true }}
        >
          <Text style={{ fontSize: 11, color: '#6B5A48', fontFamily: 'Inter_400Regular', letterSpacing: 0.5 }}>
            {getTimeRemaining(developedAt, developmentDelayMins)}
          </Text>
        </MotiView>
      </View>
    </View>
  );
}
