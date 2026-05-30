import { View, StyleSheet, ScrollView, Text, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

interface PhotoBoothStripViewProps {
  slots: Record<number, string | undefined>;
  bgColor: string;
}

const { width: SCREEN_W } = Dimensions.get('window');

const STRIP_W    = Math.min(200, SCREEN_W - 80);  // narrow strip, like real photo booth
const SIDE_PAD   = 8;
const TOP_PAD    = 10;
const PHOTO_W    = STRIP_W - SIDE_PAD * 2;
const PHOTO_H    = Math.round(PHOTO_W * 0.78);    // slightly landscape, not square
const GAP        = 5;
const BOTTOM_SPACE = 36;

const today = format(new Date(), 'MM.dd.yy');

function Strip({ slots, bgColor }: PhotoBoothStripViewProps) {
  const isLight = isLightColor(bgColor);
  const metaColor = isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.28)';
  return (
    <View style={[s.strip, { backgroundColor: bgColor }]}>
      <View style={{ height: TOP_PAD }} />
      {[0, 1, 2, 3].map((idx) => (
        <View key={idx}>
          <View style={s.photoSlot}>
            {slots[idx] ? (
              <Image source={{ uri: slots[idx]! }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={s.emptySlot} />
            )}
          </View>
          {idx < 3 && <View style={{ height: GAP }} />}
        </View>
      ))}
      <View style={{ height: BOTTOM_SPACE, justifyContent: 'flex-end', paddingBottom: 7 }}>
        <Text style={[s.datestamp, { color: metaColor }]}>{today}</Text>
      </View>
    </View>
  );
}

export function PhotoBoothStripView({ slots, bgColor }: PhotoBoothStripViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 24,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Strip slots={slots} bgColor={bgColor} />
    </ScrollView>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

const s = StyleSheet.create({
  strip: {
    width: STRIP_W,
    paddingHorizontal: SIDE_PAD,
    borderRadius: 3,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 14,
  },
  photoSlot: {
    width: PHOTO_W,
    height: PHOTO_H,
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
  },
  emptySlot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
  },
  datestamp: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
});
