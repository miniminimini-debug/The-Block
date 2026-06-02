import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView,
  Alert, StyleSheet, Dimensions, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';
import { useAuthStore } from '@stores/auth.store';
import { useMyBoards, useCreateBoard, useAddBoardItem, useUpdateItemPosition, useDeleteBoardItem } from '@hooks/useCorkBoards';
import { PinnedItem } from '@/components/board/PinnedItem';
import { CorkBackground } from '@/components/board/CorkBackground';
import { PolaroidCropModal } from '@/components/board/PolaroidCropModal';
import { useTheme } from '@hooks/useTheme';
import { isDemoMode } from '@lib/demo';
import { ALL_STICKERS } from '@lib/stickers';
import type { CorkBoardItem } from '@types/models';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const NOTE_COLORS = ['#F5E6A3', '#A8D8A8', '#B0C4DE', '#FFB3BA', '#FFD8A8', '#E8D0FF'];

// Radial actions — appear above the FAB when expanded
const ACTIONS = [
  { id: 'photo',   emoji: '📷', label: 'photo'   },
  { id: 'note',    emoji: '✏️', label: 'note'    },
  { id: 'sticker', emoji: '🌸', label: 'sticker' },
  { id: 'delete',  emoji: '🗑', label: 'delete'  },
] as const;

type ActionId = typeof ACTIONS[number]['id'];

export default function CorkScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const demo = isDemoMode();

  const { boards } = useMyBoards();
  const { mutateAsync: createBoard } = useCreateBoard();
  const myBoard = boards.find((b) => b.creatorId === userId) ?? null;
  const addBoardItem = useAddBoardItem(myBoard?.id ?? '');
  const updateBoardPos = useUpdateItemPosition(myBoard?.id ?? '');
  const deleteBoardItem = useDeleteBoardItem(myBoard?.id ?? '');

  const [demoItems, setDemoItems] = useState<CorkBoardItem[]>([]);
  const [canvasHeight, setCanvasHeight] = useState(0);

  // FAB state
  const [fabOpen, setFabOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

  // Crop modal
  const [cropUri, setCropUri] = useState<string | null>(null);

  // Modals
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [stickerModalVisible, setStickerModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);

  const ensureBoard = async () => {
    if (!demo && !myBoard) {
      await createBoard({ title: 'my board', coverEmoji: '📌', memberIds: [] });
    }
  };

  const ITEM_W = 160;
  const ITEM_H = 180;
  const safeH = canvasHeight > 0 ? canvasHeight : (SCREEN_H - insets.bottom - 90);
  const itemBounds = {
    maxX: Math.max(0, SCREEN_W - ITEM_W),
    maxY: Math.max(0, safeH - ITEM_H - 70),
  };

  const randomPos = () => ({
    posX: 10 + Math.random() * Math.max(10, itemBounds.maxX - 10),
    posY: 10 + Math.random() * Math.max(10, itemBounds.maxY - 10),
  });

  const closeFab = () => { setFabOpen(false); };

  const handleAction = useCallback((id: ActionId) => {
    closeFab();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (id === 'delete') {
      setDeleteMode((v) => !v);
      return;
    }
    if (id === 'photo') {
      // Small delay so the FAB collapse animation plays first
      setTimeout(() => handleAddPhoto(), 200);
    } else if (id === 'note') {
      setTimeout(() => setNoteModalVisible(true), 200);
    } else if (id === 'sticker') {
      setTimeout(() => setStickerModalVisible(true), 200);
    }
  }, []);

  const pinPhoto = useCallback(async (uri: string) => {
    setCropUri(null);
    if (demo) {
      const { posX, posY } = randomPos();
      setDemoItems((prev) => [...prev, {
        id: `demo-${Date.now()}`,
        boardId: 'demo',
        creatorId: userId ?? 'demo',
        type: 'photo',
        imageUrl: uri,
        thumbnailUrl: uri,
        storagePath: null,
        noteText: null,
        color: '#F5E6A3',
        posX, posY,
        rotation: Math.random() * 16 - 8,
        zIndex: 1,
        createdAt: new Date().toISOString(),
      }]);
    } else {
      await ensureBoard();
      await addBoardItem.mutateAsync({ type: 'photo', imageUri: uri });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [addBoardItem, myBoard, demo, userId, canvasHeight]);

  const handleAddPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setCropUri(result.assets[0].uri);
    }
  }, []);

  const handleAddSticker = useCallback((stickerId: string) => {
    setStickerModalVisible(false);
    const { posX, posY } = randomPos();
    if (demo) {
      setDemoItems((prev) => [...prev, {
        id: `demo-${Date.now()}`,
        boardId: 'demo',
        creatorId: userId ?? 'demo',
        type: 'sticker' as const,
        imageUrl: null,
        thumbnailUrl: null,
        storagePath: null,
        noteText: null,
        stickerId,
        color: '#FFFFFF',
        posX, posY,
        rotation: Math.random() * 20 - 10,
        zIndex: 1,
        createdAt: new Date().toISOString(),
      }]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [demo, userId, canvasHeight]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    const { posX, posY } = randomPos();
    if (demo) {
      setDemoItems((prev) => [...prev, {
        id: `demo-${Date.now()}`,
        boardId: 'demo',
        creatorId: userId ?? 'demo',
        type: 'note',
        imageUrl: null,
        thumbnailUrl: null,
        storagePath: null,
        noteText: noteText.trim(),
        color: noteColor,
        posX, posY,
        rotation: Math.random() * 16 - 8,
        zIndex: 1,
        createdAt: new Date().toISOString(),
      }]);
    } else {
      await ensureBoard();
      await addBoardItem.mutateAsync({ type: 'note', noteText: noteText.trim(), color: noteColor });
    }
    setNoteText('');
    setNoteColor(NOTE_COLORS[0]);
    setNoteModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteItem = useCallback((item: CorkBoardItem) => {
    if (demo) {
      setDemoItems((prev) => prev.filter((i) => i.id !== item.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    deleteBoardItem.mutateAsync(item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [demo, deleteBoardItem]);

  const items = demo ? demoItems : (myBoard?.items ?? []);

  // FAB button positions (stacked upward from bottom-right)
  const FAB_BOTTOM = insets.bottom + 24;
  const FAB_RIGHT = 24;
  const FAB_SIZE = 52;
  const MINI_SIZE = 44;
  const MINI_SPACING = 60;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 10 }}>
      <View
        style={{ flex: 1, borderRadius: 6, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 4 }}
        onLayout={(e) => setCanvasHeight(e.nativeEvent.layout.height)}
      >
        <CorkBackground />

        {items.length === 0 && !deleteMode && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Text style={{ fontSize: 14, color: 'rgba(80,40,10,0.4)', fontFamily: 'Inter_500Medium' }}>
              your board is empty
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(80,40,10,0.28)', fontFamily: 'Inter_400Regular' }}>
              tap the button to pin photos and notes
            </Text>
          </View>
        )}

        {/* Delete mode label */}
        {deleteMode && (
          <MotiView
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22 }}
            style={{ position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }}
          >
            <View style={{ backgroundColor: 'rgba(255,80,80,0.85)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, color: '#FFF', fontFamily: 'Inter_600SemiBold' }}>tap × to remove · tap 🗑 again to finish</Text>
            </View>
          </MotiView>
        )}

        {items.map((item) => (
          <PinnedItem
            key={item.id}
            item={item}
            canEdit={!deleteMode}
            bounds={itemBounds}
            deleteMode={deleteMode}
            onDeletePress={deleteMode ? () => handleDeleteItem(item) : undefined}
            onDragEnd={demo
              ? (id, x, y) => setDemoItems((prev) => prev.map((i) => i.id === id ? { ...i, posX: x, posY: y } : i))
              : (id, x, y) => updateBoardPos.mutateAsync({ itemId: id, posX: x, posY: y })
            }
          />
        ))}
      </View>

      {/* ── Radial FAB ──────────────────────────────────────────────────────── */}
      <View style={{ position: 'absolute', bottom: FAB_BOTTOM, right: FAB_RIGHT }}>

        {/* Mini action circles — animate outward */}
        <AnimatePresence>
          {fabOpen && ACTIONS.map((action, i) => {
            const offset = (ACTIONS.length - i) * MINI_SPACING;
            return (
              <MotiView
                key={action.id}
                from={{ opacity: 0, translateY: 0, scale: 0.6 }}
                animate={{ opacity: 1, translateY: -offset, scale: 1 }}
                exit={{ opacity: 0, translateY: 0, scale: 0.6 }}
                transition={{ type: 'spring', damping: 18, stiffness: 260, delay: i * 30 }}
                style={{ position: 'absolute', bottom: 0, right: 0 }}
              >
                <Pressable
                  onPress={() => handleAction(action.id)}
                  style={{ alignItems: 'center', gap: 4 }}
                >
                  <View style={[
                    styles.miniFab,
                    action.id === 'delete' && deleteMode && { backgroundColor: '#FF4444', borderColor: '#FF6666' },
                  ]}>
                    <Text style={{ fontSize: 18 }}>{action.emoji}</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, color: '#FFF', fontFamily: 'Inter_600SemiBold' }}>{action.label}</Text>
                  </View>
                </Pressable>
              </MotiView>
            );
          })}
        </AnimatePresence>

        {/* Main FAB */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (deleteMode) { setDeleteMode(false); setFabOpen(false); }
            else setFabOpen((v) => !v);
          }}
          style={[
            styles.fab,
            { backgroundColor: deleteMode ? '#FF4444' : theme.accent },
          ]}
        >
          <MotiView
            animate={{ rotate: fabOpen ? '45deg' : '0deg' }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <Text style={{ fontSize: 22, color: '#EEEEF8', lineHeight: 26 }}>
              {deleteMode ? '✕' : '+'}
            </Text>
          </MotiView>
        </Pressable>
      </View>

      {/* Backdrop — tap outside to close FAB */}
      {fabOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => { setFabOpen(false); }}
        />
      )}

      {/* Note modal */}
      <Modal visible={noteModalVisible} transparent animationType="slide" onRequestClose={() => setNoteModalVisible(false)}>
        <View style={styles.noteOverlay}>
          <View style={[styles.noteModal, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.sheetTitle}>write a note</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {NOTE_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNoteColor(c)}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: noteColor === c ? 2.5 : 0, borderColor: '#EEEEF8' }}
                />
              ))}
            </View>
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder="what's on your mind?"
              placeholderTextColor="#888"
              multiline
              maxLength={200}
              style={[styles.noteInput, { backgroundColor: noteColor }]}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => setNoteModalVisible(false)} style={styles.noteCancelBtn}>
                <Text style={{ fontSize: 14, color: '#7A7A9A', fontFamily: 'Inter_500Medium' }}>cancel</Text>
              </Pressable>
              <Pressable onPress={handleAddNote} disabled={!noteText.trim()} style={[styles.notePinBtn, !noteText.trim() && { opacity: 0.4 }]}>
                <Text style={{ fontSize: 14, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>pin it</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sticker modal */}
      <Modal visible={stickerModalVisible} transparent animationType="slide" onRequestClose={() => setStickerModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setStickerModalVisible(false)} />
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { marginBottom: 14 }]}>stickers</Text>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ALL_STICKERS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => handleAddSticker(s.id)}
                style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14 }}
              >
                <Text style={{ fontSize: 32 }}>{s.emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Polaroid crop modal */}
      <PolaroidCropModal
        visible={!!cropUri}
        imageUri={cropUri}
        onConfirm={pinPhoto}
        onCancel={() => setCropUri(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  miniFab: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,253,245,0.95)',
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: 5,
  },
  bottomSheet: {
    backgroundColor: '#12121C',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, gap: 4,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#2E2E48', alignSelf: 'center', marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16, color: '#EEEEF8',
    fontFamily: 'Inter_700Bold', marginBottom: 12, textAlign: 'center',
  },
  noteOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  noteModal: {
    backgroundColor: '#12121C',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
  },
  noteInput: {
    borderRadius: 12, padding: 14,
    fontSize: 15, color: '#2A2820',
    fontFamily: 'Inter_400Regular',
    minHeight: 100, textAlignVertical: 'top',
  },
  noteCancelBtn: {
    flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#1A1A28', borderWidth: 1, borderColor: '#2E2E48',
  },
  notePinBtn: {
    flex: 2, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#6B52E0',
  },
});
