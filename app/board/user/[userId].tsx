import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useCorkBoardByCreatorId } from '@hooks/useCorkBoards';
import { PinnedItem } from '@/components/board/PinnedItem';
import { CorkBackground } from '@/components/board/CorkBackground';
import { useTheme } from '@hooks/useTheme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function FriendBoardScreen() {
  const { userId: friendId, name } = useLocalSearchParams<{ userId: string; name?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { board, isLoading } = useCorkBoardByCreatorId(friendId ?? '');
  const [canvasH, setCanvasH] = useState(SCREEN_H);

  const items = board?.items ?? [];
  const bounds = { maxX: Math.max(0, SCREEN_W - 160), maxY: Math.max(0, canvasH - 180) };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top + 52, padding: 10 }}>

      {/* Back button — sits above the frame */}
      <Pressable
        onPress={() => router.back()}
        style={{
          position: 'absolute', top: insets.top + 12, left: 16, zIndex: 20,
          backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 8,
        }}
      >
        <Text style={{ color: '#3A2010', fontSize: 14, fontFamily: 'Inter_500Medium' }}>‹ back</Text>
      </Pressable>

      {/* Board owner label — above the frame */}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 0, right: 0, alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <Text style={{ color: 'rgba(60,30,10,0.55)', fontSize: 13, fontFamily: 'Inter_500Medium' }}>
          {name ? `${name}'s board` : 'their board'}
        </Text>
      </View>

      {/* Framed cork board */}
      <View
        style={{ flex: 1, borderRadius: 6, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 4 }}
        onLayout={(e) => setCanvasH(e.nativeEvent.layout.height)}
      >
        <CorkBackground />

        {isLoading && (
          <View style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(80,40,10,0.4)', fontFamily: 'Inter_400Regular' }}>loading…</Text>
            </View>
          </View>
        )}

        {!isLoading && items.length === 0 && (
          <View style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14, color: 'rgba(80,40,10,0.4)', fontFamily: 'Inter_500Medium' }}>
                nothing pinned yet
              </Text>
            </View>
          </View>
        )}

        {items.map((item) => (
          <PinnedItem
            key={item.id}
            item={item}
            canEdit={false}
            bounds={bounds}
            onDragEnd={() => {}}
          />
        ))}

        {/* Floating action circles */}
        <View style={{ position: 'absolute', bottom: 24, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
          {[
            { emoji: '📮', label: 'leave a pic',   onPress: () => router.push(`/drop/send?recipientId=${friendId}` as any) },
            { emoji: '🎞️', label: 'shared albums', onPress: () => router.push(`/albums/${friendId}` as any) },
          ].map((action) => (
            <Pressable
              key={action.label}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); action.onPress(); }}
              style={({ pressed }) => ({ alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{
                width: 54, height: 54, borderRadius: 27,
                backgroundColor: 'rgba(80,40,10,0.55)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 22 }}>{action.emoji}</Text>
              </View>
              <Text style={{ fontSize: 10, color: 'rgba(80,40,10,0.7)', fontFamily: 'Inter_500Medium' }}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
