import { useCallback, useState } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Group, RoundedRect, Circle, Paint, LinearGradient as SkiaLinearGradient, vec } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { palette } from '@theme/tokens';
import { BlockText } from '@ui/Text';
import type { FriendRoom } from '@types/models';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MAP_SIZE = SCREEN_W * 2.5; // Virtual canvas is larger than screen

interface RoomNodeProps {
  room: FriendRoom;
  onPress: (room: FriendRoom) => void;
}

function RoomNode({ room, onPress }: RoomNodeProps) {
  const glowOpacity = useSharedValue(room.hasNewPost ? 0.4 : 0);
  const scale = useSharedValue(1);

  // Pulse glow when new post
  if (room.hasNewPost) {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(0.92, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(room);
  }, [room, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const moodColor = getMoodColor(room.currentMood);
  const roomColor = getRoomColor(room.roomType);

  return (
    <Pressable onPress={handlePress} style={styles.roomNode}>
      <Animated.View style={animatedStyle}>
        {/* Glow ring (new post indicator) */}
        {room.hasNewPost && (
          <Animated.View
            style={[
              styles.glowRing,
              { borderColor: moodColor },
              glowStyle,
            ]}
          />
        )}

        {/* Room building */}
        <View style={[styles.building, { backgroundColor: roomColor.bg }]}>
          {/* Lit window */}
          <View style={styles.windowRow}>
            <View style={[
              styles.window,
              room.isOnline && { backgroundColor: moodColor },
              room.hasNewPost && { backgroundColor: palette.gold300 },
            ]} />
            <View style={[
              styles.window,
              (room.isOnline || room.hasNewPost) && { backgroundColor: roomColor.window },
            ]} />
          </View>

          {/* Door */}
          <View style={[styles.door, { backgroundColor: roomColor.door }]} />
        </View>

        {/* Online dot */}
        {room.isOnline && (
          <View style={[styles.onlineDot, { backgroundColor: palette.success }]} />
        )}

        {/* Username label */}
        <BlockText preset="caption" color={palette.silver} style={styles.roomLabel} numberOfLines={1}>
          {room.displayName ?? room.username}
        </BlockText>
      </Animated.View>
    </Pressable>
  );
}

interface NeighborhoodMapProps {
  rooms: FriendRoom[];
  onRoomPress: (room: FriendRoom) => void;
}

export function NeighborhoodMap({ rooms, onRoomPress }: NeighborhoodMapProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.6), 2.5);
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd((e) => {
      // Momentum decay
      translateX.value = withSpring(translateX.value + e.velocityX * 0.1, {
        damping: 20,
        stiffness: 80,
      });
      translateY.value = withSpring(translateY.value + e.velocityY * 0.1, {
        damping: 20,
        stiffness: 80,
      });
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const mapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      {/* Sky background via Skia canvas */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Group>
          <RoundedRect x={0} y={0} width={SCREEN_W} height={SCREEN_H} r={0}>
            <SkiaLinearGradient
              start={vec(SCREEN_W / 2, 0)}
              end={vec(SCREEN_W / 2, SCREEN_H)}
              colors={[palette.void, palette.ink, '#1A1230']}
            />
          </RoundedRect>
          {/* Stars */}
          {STAR_POSITIONS.map((star, i) => (
            <Circle key={i} cx={star.x} cy={star.y} r={star.r}>
              <Paint color={`rgba(200,200,255,${star.opacity})`} />
            </Circle>
          ))}
        </Group>
      </Canvas>

      {/* Pannable / zoomable map layer */}
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.mapCanvas, mapStyle]}>
          {/* Ground plane */}
          <View style={styles.ground} />

          {/* Street grid */}
          <View style={styles.streetH} />
          <View style={styles.streetV} />

          {/* Render all friend rooms */}
          {rooms.map((room) => (
            <View
              key={room.friendId}
              style={[
                styles.roomPlacement,
                {
                  left: MAP_SIZE / 2 + (room.position?.x ?? 0) - 36,
                  top: MAP_SIZE / 2 + (room.position?.y ?? 0) - 60,
                },
              ]}
            >
              <RoomNode room={room} onPress={onRoomPress} />
            </View>
          ))}

          {/* My house (center) */}
          <View style={[styles.roomPlacement, styles.myHouse]}>
            <View style={[styles.building, styles.myBuilding]}>
              <BlockText preset="caption" color={palette.lavender300} style={styles.myLabel}>
                you
              </BlockText>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Mini-map indicator */}
      <View style={styles.miniMap}>
        <BlockText preset="label" color={palette.ash}>
          {rooms.length} friends nearby
        </BlockText>
      </View>
    </View>
  );
}

// Deterministic star positions from a seeded layout
const STAR_POSITIONS = Array.from({ length: 60 }, (_, i) => ({
  x: (Math.sin(i * 137.5) * 0.5 + 0.5) * SCREEN_W,
  y: (Math.cos(i * 137.5) * 0.5 + 0.5) * (SCREEN_H * 0.6),
  r: (Math.sin(i * 23) * 0.5 + 0.5) * 1.5 + 0.3,
  opacity: (Math.sin(i * 57) * 0.5 + 0.5) * 0.5 + 0.1,
}));

function getMoodColor(mood: string | null): string {
  const map: Record<string, string> = {
    cozy: palette.moodCozy,
    happy: palette.moodHappy,
    reflective: palette.moodReflective,
    adventurous: palette.moodAdventurous,
    melancholic: palette.moodMelancholic,
    excited: palette.moodExcited,
    peaceful: palette.moodPeaceful,
    nostalgic: palette.moodNostalgic,
  };
  return mood ? (map[mood] ?? palette.lavender300) : palette.lavender300;
}

function getRoomColor(type: string) {
  const map: Record<string, { bg: string; window: string; door: string }> = {
    bedroom: { bg: '#2A2040', window: '#FFE0A0', door: '#3D2E5A' },
    studio: { bg: '#1E2A3A', window: '#A0C8FF', door: '#2A3D50' },
    loft: { bg: '#2A1E1E', window: '#FFB07A', door: '#3D2A2A' },
    treehouse: { bg: '#1A2A1A', window: '#A8E6CF', door: '#263A26' },
    rooftop: { bg: '#1A1A2A', window: '#C8C0FF', door: '#262638' },
    basement: { bg: '#1E1E1A', window: '#FFD0A8', door: '#2E2E28' },
    cabin: { bg: '#2A1E10', window: '#FFCE70', door: '#3D2E18' },
    van: { bg: '#10202A', window: '#70C0FF', door: '#182E3D' },
  };
  return map[type] ?? map.bedroom;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  mapCanvas: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    position: 'absolute',
    left: -(MAP_SIZE - SCREEN_W) / 2,
    top: -(MAP_SIZE - SCREEN_H) / 2,
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: MAP_SIZE * 0.45,
    backgroundColor: '#111118',
    borderTopWidth: 1,
    borderTopColor: palette.slate,
  },
  streetH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: MAP_SIZE / 2 - 20,
    height: 40,
    backgroundColor: palette.dusk,
    opacity: 0.6,
  },
  streetV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: MAP_SIZE / 2 - 20,
    width: 40,
    backgroundColor: palette.dusk,
    opacity: 0.6,
  },
  roomPlacement: {
    position: 'absolute',
    alignItems: 'center',
  },
  roomNode: {
    alignItems: 'center',
    gap: 4,
  },
  glowRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    top: -8,
    left: -8,
  },
  building: {
    width: 64,
    height: 72,
    borderRadius: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    padding: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.slate,
  },
  windowRow: {
    flexDirection: 'row',
    gap: 6,
  },
  window: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: palette.slate,
  },
  door: {
    width: 18,
    height: 22,
    borderRadius: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  onlineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: palette.ink,
  },
  roomLabel: {
    maxWidth: 72,
    textAlign: 'center',
  },
  myHouse: {
    left: MAP_SIZE / 2 - 36,
    top: MAP_SIZE / 2 - 60,
    zIndex: 10,
  },
  myBuilding: {
    backgroundColor: palette.lavender800,
    borderColor: palette.lavender500,
    borderWidth: 2,
    justifyContent: 'center',
  },
  myLabel: {
    fontWeight: '600',
  },
  miniMap: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: `${palette.void}CC`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.slate,
  },
});
