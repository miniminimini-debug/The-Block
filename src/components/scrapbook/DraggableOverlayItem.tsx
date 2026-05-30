import { Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { ALL_STICKERS } from '@lib/stickers';
import type { ScrapbookItem } from '@types/models';

interface Props {
  item: ScrapbookItem;
  pageWidth: number;
  pageHeight: number;
  onDragEnd: (itemId: string, posX: number, posY: number) => void;
}

export function DraggableOverlayItem({ item, pageWidth, pageHeight, onDragEnd }: Props) {
  const maxX = pageWidth - 24;
  const maxY = pageHeight - 24;

  const initX = Math.min(Math.max((item.posX / 100) * pageWidth, 0), maxX);
  const initY = Math.min(Math.max((item.posY / 100) * pageHeight, 0), maxY);

  const posX = useSharedValue(initX);
  const posY = useSharedValue(initY);
  const startX = useSharedValue(initX);
  const startY = useSharedValue(initY);

  const notify = (px: number, py: number) => {
    onDragEnd(item.id, (px / pageWidth) * 100, (py / pageHeight) * 100);
  };

  const gesture = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      startX.value = posX.value;
      startY.value = posY.value;
    })
    .onUpdate((e) => {
      posX.value = Math.min(Math.max(startX.value + e.translationX, 0), maxX);
      posY.value = Math.min(Math.max(startY.value + e.translationY, 0), maxY);
    })
    .onEnd((e) => {
      const nx = Math.min(Math.max(startX.value + e.translationX, 0), maxX);
      const ny = Math.min(Math.max(startY.value + e.translationY, 0), maxY);
      posX.value = nx;
      posY.value = ny;
      runOnJS(notify)(nx, ny);
    });

  const animStyle = useAnimatedStyle(() => ({
    left: posX.value,
    top: posY.value,
  }));

  const rotation = `${item.rotation ?? 0}deg`;

  if (item.itemType === 'sticker') {
    const sticker = ALL_STICKERS.find((s) => s.id === item.stickerId);
    if (!sticker) return null;
    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{
          position: 'absolute',
          transform: [{ rotate: rotation }],
          backgroundColor: '#FFFFFF',
          borderRadius: 10,
          padding: 5,
          shadowColor: '#000',
          shadowOpacity: 0.14,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
          elevation: 3,
        }, animStyle]}>
          {sticker.source ? (
            <Image source={sticker.source} style={{ width: 44, height: 44 }} contentFit="contain" />
          ) : (
            <Text style={{ fontSize: 38 }}>{sticker.emoji}</Text>
          )}
        </Animated.View>
      </GestureDetector>
    );
  }

  // Text / handwriting
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ position: 'absolute', transform: [{ rotate: rotation }] }, animStyle]}>
        <Text style={{
          fontFamily: 'Caveat_400Regular',
          fontSize: 21,
          color: item.fontColor ?? '#1A1208',
          maxWidth: ITEM_W,
          lineHeight: 28,
        }}>
          {item.textContent ?? item.note ?? ''}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}
