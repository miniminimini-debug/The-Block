import { useRef, useState } from 'react';
import { View, Text, PanResponder, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ALL_STICKERS } from '@lib/stickers';
import type { CorkBoardItem } from '@types/models';

interface PinnedItemProps {
  item: CorkBoardItem;
  canEdit: boolean;
  bounds: { maxX: number; maxY: number };
  onDragEnd: (itemId: string, x: number, y: number) => void;
}

const NOTE_COLORS: Record<string, { bg: string; text: string }> = {
  '#F5E6A3': { bg: '#F5E6A3', text: '#3A3010' },
  '#A8D8A8': { bg: '#A8D8A8', text: '#1A3A1A' },
  '#B0C4DE': { bg: '#B0C4DE', text: '#1A2840' },
  '#FFB3BA': { bg: '#FFB3BA', text: '#3A1020' },
  '#FFD8A8': { bg: '#FFD8A8', text: '#3A2010' },
  '#E8D0FF': { bg: '#E8D0FF', text: '#2A1040' },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function PinnedItem({ item, canEdit, bounds, onDragEnd }: PinnedItemProps) {
  const [pos, setPos] = useState({ x: item.posX, y: item.posY });
  const [isDragging, setIsDragging] = useState(false);

  // Refs keep the PanResponder (created once) reading fresh values
  const posRef = useRef(pos);
  posRef.current = pos;
  const startPosRef = useRef({ x: 0, y: 0 });
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        canEditRef.current && (Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3),
      onPanResponderGrant: () => {
        setIsDragging(true);
        startPosRef.current = { ...posRef.current };
      },
      onPanResponderMove: (_, gs) => {
        const { maxX, maxY } = boundsRef.current;
        setPos({
          x: clamp(startPosRef.current.x + gs.dx, 0, maxX),
          y: clamp(startPosRef.current.y + gs.dy, 0, maxY),
        });
      },
      onPanResponderRelease: (_, gs) => {
        const { maxX, maxY } = boundsRef.current;
        const newX = clamp(startPosRef.current.x + gs.dx, 0, maxX);
        const newY = clamp(startPosRef.current.y + gs.dy, 0, maxY);
        setPos({ x: newX, y: newY });
        setIsDragging(false);
        onDragEndRef.current(item.id, newX, newY);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    })
  ).current;

  const noteStyle = NOTE_COLORS[item.color] ?? NOTE_COLORS['#F5E6A3'];

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.item,
        {
          left: pos.x,
          top: pos.y,
          transform: [{ rotate: `${item.rotation}deg` }],
          zIndex: isDragging ? 999 : item.zIndex,
          opacity: isDragging ? 0.85 : 1,
          elevation: isDragging ? 8 : 2,
        },
      ]}
    >
      {item.type === 'photo' && item.imageUrl && (
        <View style={styles.photoFrame}>
          <Image source={{ uri: item.imageUrl }} style={styles.photo} contentFit="cover" />
          <View style={styles.tape} />
        </View>
      )}

      {item.type === 'note' && (
        <View style={[styles.noteCard, { backgroundColor: noteStyle.bg }]}>
          <View style={[styles.pin, { backgroundColor: '#8B0000' }]} />
          <Text style={[styles.noteText, { color: noteStyle.text }]}>
            {item.noteText ?? ''}
          </Text>
        </View>
      )}

      {item.type === 'sticker' && (() => {
        const sticker = ALL_STICKERS.find((s) => s.id === item.stickerId);
        if (!sticker) return null;
        return sticker.source ? (
          <Image source={sticker.source} style={{ width: 52, height: 52 }} contentFit="contain" />
        ) : (
          <Text style={{ fontSize: 44 }}>{sticker.emoji}</Text>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
  },
  photoFrame: {
    width: 120,
    backgroundColor: '#FFFDF0',
    padding: 6,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  photo: {
    width: 108,
    height: 108,
  },
  tape: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 16,
    backgroundColor: 'rgba(255, 240, 150, 0.7)',
  },
  noteCard: {
    width: 130,
    minHeight: 100,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pin: {
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noteText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    marginTop: 12,
  },
});
