import { useMemo } from 'react';
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
  promptSticker?: string | null;
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
  lg:   { width: 260, photoHeight: 248, stripHeight: 68, noteSize: 13 },
  full: { width: 320, photoHeight: 308, stripHeight: 76, noteSize: 14 },
};

export function PolaroidCard({
  imageUri,
  status = 'developed',
  note,
  promptSticker,
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

  const stableTilt = useMemo(() => {
    if (tilt !== undefined) return tilt;
    const seed = imageUri.charCodeAt(imageUri.length - 4) || 0;
    return ((seed % 7) - 3) * 0.8;
  }, [imageUri, tilt]);

  const dateStr = capturedAt
    ? format(typeof capturedAt === 'string' ? new Date(capturedAt) : capturedAt, 'MMM d')
    : '';

  const isDeveloping = status === 'developing';
  // Truncate note to 20 characters for the strip
  const displayNote = note ? note.slice(0, 20) : null;

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

          {isDeveloping && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#C9A96E', opacity: 0.45 }} />
          )}

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

          {/* Prompt sticker — small angled label on the photo */}
          {promptSticker && !isDeveloping && (
            <View style={{
              position: 'absolute', top: 8, right: -4,
              backgroundColor: '#FFFDF5',
              paddingHorizontal: 7, paddingVertical: 4,
              borderRadius: 3,
              transform: [{ rotate: '3deg' }],
              shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
              elevation: 3, maxWidth: width * 0.75,
            }}>
              <Text style={{ fontSize: noteSize - 1, color: '#2A1F0F', fontFamily: 'Caveat_400Regular', lineHeight: noteSize + 2 }} numberOfLines={2}>
                {promptSticker}
              </Text>
            </View>
          )}

          <FilmGrainOverlay opacity={isDeveloping ? 0.18 : 0.07} />
        </View>

        {/* White strip — note + sender + date */}
        <View style={{ height: stripHeight, paddingHorizontal: 6, paddingTop: 6, paddingBottom: 4, justifyContent: 'center', gap: 2 }}>
          {displayNote && !isDeveloping ? (
            <Text
              style={{ fontSize: noteSize + 1, color: '#2A1F0F', fontFamily: 'Caveat_400Regular', lineHeight: (noteSize + 1) * 1.3 }}
              numberOfLines={1}
            >
              {displayNote}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {senderName ? (
              <Text style={{ fontSize: noteSize - 1, color: '#6B5A48', fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                {senderName}
              </Text>
            ) : <View />}
            {dateStr ? (
              <Text style={{ fontSize: noteSize - 1, color: '#9A8A78', fontFamily: 'Inter_400Regular' }}>
                {dateStr}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </MotiView>
  );
}
