import { useState, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, ActivityIndicator,
  StyleSheet, TextInput, Modal, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useCorkBoard, useAddBoardItem, useUpdateItemPosition, useDeleteBoardItem } from '@hooks/useCorkBoards';
import { useAuthStore } from '@stores/auth.store';
import { PinnedItem } from '@/components/board/PinnedItem';
import { useTheme } from '@hooks/useTheme';
import type { CorkBoardItem } from '@types/models';

const NOTE_COLORS = ['#F5E6A3', '#A8D8A8', '#B0C4DE', '#FFB3BA', '#FFD8A8', '#E8D0FF'];

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1600;

export default function BoardScreen() {
  const { boardId } = useLocalSearchParams<{ boardId: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);

  const { board, isLoading } = useCorkBoard(boardId ?? '');
  const { mutateAsync: addItem, isPending: isAdding } = useAddBoardItem(boardId ?? '');
  const { mutateAsync: updatePosition } = useUpdateItemPosition(boardId ?? '');
  const { mutateAsync: deleteItem } = useDeleteBoardItem(boardId ?? '');

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [selectedItem, setSelectedItem] = useState<CorkBoardItem | null>(null);

  const isCreator = board?.creatorId === userId;

  const handleAddPhoto = async () => {
    setShowAddMenu(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await addItem({ type: 'photo', imageUri: result.assets[0].uri });
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addItem({ type: 'note', noteText: noteText.trim(), color: noteColor });
    setNoteText('');
    setShowNoteModal(false);
  };

  const handleDragEnd = async (itemId: string, x: number, y: number) => {
    await updatePosition({ itemId, posX: x, posY: y });
  };

  const handleItemLongPress = (item: CorkBoardItem) => {
    if (item.creatorId !== userId) return;
    setSelectedItem(item);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove from board?', undefined, [
      { text: 'cancel', style: 'cancel', onPress: () => setSelectedItem(null) },
      {
        text: 'remove', style: 'destructive', onPress: async () => {
          await deleteItem(item.id);
          setSelectedItem(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!board) return null;

  const items = board.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.text, fontSize: 15 }}>‹</Text>
        </Pressable>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: theme.text, fontFamily: 'Inter_700Bold' }}>
            {board.coverEmoji} {board.title}
          </Text>
          <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_400Regular' }}>
            {(board.members ?? []).length} pinning
          </Text>
        </View>

        <Pressable
          onPress={() => { setShowAddMenu(true); Haptics.selectionAsync(); }}
          style={[styles.iconBtn, { backgroundColor: theme.accent }]}
        >
          <Text style={{ color: theme.text, fontSize: 18, lineHeight: 20 }}>+</Text>
        </Pressable>
      </View>

      {/* Canvas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        maximumZoomScale={2}
        minimumZoomScale={0.5}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
          {/* Cork board texture */}
          <View style={[styles.canvas, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }]}>
            {/* Grid dots for visual reference */}
            {Array.from({ length: 20 }).map((_, row) =>
              Array.from({ length: 15 }).map((_, col) => (
                <View
                  key={`${row}-${col}`}
                  style={{
                    position: 'absolute',
                    top: row * 80 + 40,
                    left: col * 80 + 40,
                    width: 3, height: 3, borderRadius: 1.5,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  }}
                />
              ))
            )}

            {/* Pinned items */}
            {items.map((item) => (
              <PinnedItem
                key={item.id}
                item={item}
                canEdit={true}
                onDragEnd={handleDragEnd}
                onLongPress={handleItemLongPress}
              />
            ))}

            {/* Empty state */}
            {items.length === 0 && (
              <View style={{ position: 'absolute', top: '40%', left: 0, right: 0, alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 48 }}>📌</Text>
                <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter_500Medium' }}>
                  pin photos & notes
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)', fontFamily: 'Inter_400Regular' }}>
                  tap + to add something
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Add menu sheet */}
      <Modal visible={showAddMenu} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddMenu(false)}>
          <MotiView
            from={{ translateY: 200 }}
            animate={{ translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            style={[styles.menuSheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + 12 }]}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 13, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16, paddingHorizontal: 20 }}>add to board</Text>

            <Pressable
              onPress={handleAddPhoto}
              style={[styles.menuItem, { borderBottomColor: theme.border }]}
            >
              <Text style={{ fontSize: 28 }}>📷</Text>
              <View>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Inter_600SemiBold' }}>photo</Text>
                <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'Inter_400Regular' }}>pin an image from your library</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => { setShowAddMenu(false); setShowNoteModal(true); }}
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
            >
              <Text style={{ fontSize: 28 }}>📝</Text>
              <View>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Inter_600SemiBold' }}>sticky note</Text>
                <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'Inter_400Regular' }}>write something on the board</Text>
              </View>
            </Pressable>
          </MotiView>
        </Pressable>
      </Modal>

      {/* Note modal */}
      <Modal visible={showNoteModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowNoteModal(false)}>
          <MotiView
            from={{ translateY: 300 }}
            animate={{ translateY: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            style={[styles.menuSheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + 12 }]}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 20 }} />

            {/* Color picker */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 14 }}>
              {NOTE_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => { setNoteColor(c); Haptics.selectionAsync(); }}
                  style={{
                    width: 32, height: 32, borderRadius: 16, backgroundColor: c,
                    borderWidth: noteColor === c ? 3 : 1.5,
                    borderColor: noteColor === c ? theme.accent : 'rgba(0,0,0,0.2)',
                  }}
                />
              ))}
            </View>

            {/* Note input */}
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={{ backgroundColor: noteColor, borderRadius: 8, padding: 14, minHeight: 100 }}>
                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="write something..."
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  multiline
                  maxLength={200}
                  style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#2A2010', padding: 0 }}
                  autoFocus
                />
              </View>
            </View>

            <Pressable
              onPress={handleAddNote}
              disabled={!noteText.trim() || isAdding}
              style={{ marginHorizontal: 20, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: noteText.trim() ? theme.accent : theme.border }}
            >
              {isAdding ? <ActivityIndicator color={theme.text} /> : <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Inter_600SemiBold' }}>pin it</Text>}
            </Pressable>
          </MotiView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, zIndex: 10,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  canvas: {
    backgroundColor: '#2C1A0E',
    backgroundImage: undefined,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, paddingTop: 12,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
  },
});
