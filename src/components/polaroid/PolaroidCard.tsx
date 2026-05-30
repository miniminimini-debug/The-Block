import { useRef, useMemo } from 'react';
import { View, Text, Pressable, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { MotiView } from 'moti';
import { format } from 'date-fns';
import { FilmGrainOverlay } from './FilmGrainOverlay';

type Size = 'sm' | 'md' | 'lg' | 'full';

interface PolaroidCardProps {
  imageUri: string;
  status?: 'developing' | 'developed';
  note?: string | null;
  senderName?: string | null;
  capturedAt?: Date | string;
  size?: Size;
  tilt?: number;
  style?: ViewStyle;
  onPress?: () => void;
  onLongPress?: () => void;
}

const sizeMap: Record<Size, { width: number; photoHeight: number; stripHeight: number; noteSize: number }> = {
  sm:   { width: 140, photoHeight: 132, stripHeight: 40, noteSize: 10 },
  md:   { width: 190, photoHeight: 178, stripHeight: 50, noteSize: 11 },
  lg:   { width: 260, photoHeight: 248, stripHeight: 62, noteSize: 12 },
  full: { width: 320, photoHeight: 308, stripHeight: 70, noteSize: 13 },
};

export function PolaroidCard({
  imageUri,
  status = 'developed',
  note,
  senderName,
  capturedAt,
  size = 'md',
  tilt,
  style,
  onPress,
  onLongPress,
}: PolaroidCardProps) {
  const { width, photoHeight, stripHeight, noteSize } = sizeMap[size];
  const inset = size === 'sm' ? 4 : 6;

  // Stable tilt: seeded from imageUri so it never changes on re-render
  const stableTilt = useMemo(() => {
    if (tilt !== undefined) return tilt;
    const seed = imageUri.charCodeAt(imageUri.length - 4) || 0;
    return ((seed % 7) - 3) * 0.8;
  }, [imageUri]);

  const dateStr = capturedAt
    ? format(typeof capturedAt === 'string' ? new Date(capturedAt) : capturedAt, 'MMM d')
    : '';

  const isDeveloping = status === 'developing';

  return (
    <MotiView
      animate={{ rotate: `${stableTilt}deg` }}
      transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      style={[
        {
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
        },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={!onPress && !onLongPress}
      >
        {/* Photo area */}
        <View style={{ width: width - inset * 2, height: photoHeight, backgroundColor: '#E8E0D0', borderRadius: 2, overflow: 'hidden' }}>
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            blurRadius={isDeveloping ? 24 : 0}
            transition={isDeveloping ? 0 : 800}
          />

          {/* Sepia overlay during development */}
          {isDeveloping && (
            <View
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: '#C9A96E',
                opacity: 0.45,
              }}
            />
          )}

          {/* Developing text */}
          {isDeveloping && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <MotiView
                from={{ opacity: 0.5 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ type: 'timing', duration: 2000, loop: true }}
              >
                <Text style={{ fontSize: noteSize + 1, color: '#2A1F0F', fontFamily: 'Inter_500Medium', letterSpacing: 1 }}>
                  developing...
                </Text>
              </MotiView>
            </View>
          )}

          {/* Handwritten note overlay on photo */}
          {note && !isDeveloping && (
            <View style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              backgroundColor: 'rgba(42,31,15,0.55)',
              paddingHorizontal: 8, paddingVertical: 6,
            }}>
              <Text
                style={{ fontSize: noteSize, color: '#F5F0E8', fontFamily: 'Inter_400Regular', lineHeight: noteSize * 1.5 }}
                numberOfLines={2}
              >
                {note}
              </Text>
            </View>
          )}

          <FilmGrainOverlay opacity={isDeveloping ? 0.18 : 0.07} />
        </View>

        {/* Strip */}
        <View style={{ height: stripHeight, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          {senderName && (
            <Text style={{ fontSize: noteSize, color: '#2A1F0F', fontFamily: 'Inter_500Medium' }} numberOfLines={1}>
              {senderName}
            </Text>
          )}
          {dateStr ? (
            <Text style={{ fontSize: noteSize - 1, color: '#6B5A48', fontFamily: 'Inter_400Regular' }}>
              {dateStr}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </MotiView>
  );
}
