import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView,
  Alert, StyleSheet, Dimensions, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@stores/auth.store';
import { useMyBoards, useCreateBoard, useAddBoardItem, useUpdateItemPosition, useDeleteBoardItem } from '@hooks/useCorkBoards';
import { PinnedItem } from '@/components/board/PinnedItem';
import { CorkBackground } from '@/components/board/CorkBackground';
import { useTheme } from '@hooks/useTheme';
import { isDemoMode } from '@lib/demo';
import { ALL_STICKERS } from '@lib/stickers';
import type { CorkBoardItem } from '@types/models';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const NOTE_COLORS = ['#F5E6A3', '#A8D8A8', '#B0C4DE', '#FFB3BA', '#FFD8A8', '#E8D0FF'];


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

  const [menuVisible, setMenuVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [stickerModalVisible, setStickerModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);

  const ensureBoard = async () => {
    if (!demo && !myBoard) {
      await createBoard({ title: 'my board', coverEmoji: '📌', memberIds: [] });
    }
  };

  // Canvas bounds shared with PinnedItem for clamping drag.
  // Items are ≤ 140px wide and ≤ 160px tall; add 20px margin for rotation.
  const ITEM_W = 160;
  const ITEM_H = 180;
  const safeH = canvasHeight > 0 ? canvasHeight : (SCREEN_H - insets.bottom - 90);
  const itemBounds = {
    maxX: Math.max(0, SCREEN_W - ITEM_W),
    maxY: Math.max(0, safeH - ITEM_H - 70), // 70px clears the ✎ button
  };

  const randomPos = () => ({
    posX: 10 + Math.random() * Math.max(10, itemBounds.maxX - 10),
    posY: 10 + Math.random() * Math.max(10, itemBounds.maxY - 10),
  });

  const handleAddPhoto = useCallback(async () => {
    setMenuVisible(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
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
    }
  }, [addBoardItem, myBoard, demo, userId, canvasHeight]);

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

  const handleDeleteItem = (item: CorkBoardItem) => {
    if (demo) {
      setDemoItems((prev) => prev.filter((i) => i.id !== item.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Alert.alert('Remove', 'Remove this from your board?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteBoardItem.mutateAsync(item.id) },
    ]);
  };

  const items = demo ? demoItems : (myBoard?.items ?? []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 10 }}>
    <View
      style={{ flex: 1, borderRadius: 6, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 4 }}
      onLayout={(e) => setCanvasHeight(e.nativeEvent.layout.height)}
    >
      <CorkBackground />

      {items.length === 0 && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, color: 'rgba(80,40,10,0.4)', fontFamily: 'Inter_500Medium' }}>
            your board is empty
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(80,40,10,0.28)', fontFamily: 'Inter_400Regular' }}>
            tap ✎ to pin photos and notes
          </Text>
        </View>
      )}

      {items.map((item) => (
        <PinnedItem
          key={item.id}
          item={item}
          canEdit
          bounds={itemBounds}
          onDragEnd={demo
            ? (id, x, y) => setDemoItems((prev) => prev.map((i) => i.id === id ? { ...i, posX: x, posY: y } : i))
            : (id, x, y) => updateBoardPos.mutateAsync({ itemId: id, posX: x, posY: y })
          }
        />
      ))}

      {/* Floating pen/edit button */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuVisible(true); }}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: theme.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text style={{ fontSize: 22, color: '#EEEEF8' }}>✎</Text>
      </Pressable>

    </View>

      {/* Board menu — add + delete */}
      <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setMenuVisible(false)} />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>your board</Text>

          <Pressable onPress={handleAddPhoto} style={styles.sheetOption}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.sheetOptionLabel}>pin a photo</Text>
              <Text style={styles.sheetOptionSub}>from your camera roll</Text>
            </View>
            <Text style={{ fontSize: 16, color: '#3D3D5E' }}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => { setMenuVisible(false); setTimeout(() => setNoteModalVisible(true), 300); }}
            style={styles.sheetOption}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.sheetOptionLabel}>pin a note</Text>
              <Text style={styles.sheetOptionSub}>write a sticky note</Text>
            </View>
            <Text style={{ fontSize: 16, color: '#3D3D5E' }}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => { setMenuVisible(false); setTimeout(() => setStickerModalVisible(true), 300); }}
            style={styles.sheetOption}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.sheetOptionLabel}>pin a sticker</Text>
              <Text style={styles.sheetOptionSub}>add an emoji sticker</Text>
            </View>
            <Text style={{ fontSize: 16, color: '#3D3D5E' }}>›</Text>
          </Pressable>

          {items.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>pins on your board</Text>
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                {items.map((item) => (
                  <View key={item.id} style={styles.pinRow}>
                    <Text style={{ fontSize: 16 }}>{item.type === 'note' ? '📝' : '📷'}</Text>
                    <Text style={styles.pinRowLabel} numberOfLines={1}>
                      {item.type === 'note' ? (item.noteText ?? 'note') : 'photo'}
                    </Text>
                    <Pressable
                      onPress={() => { setMenuVisible(false); setTimeout(() => handleDeleteItem(item), 100); }}
                      style={styles.removeBtn}
                    >
                      <Text style={{ fontSize: 12, color: '#FF6B6B', fontFamily: 'Inter_500Medium' }}>remove</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <View style={{ height: insets.bottom + 8 }} />
        </View>
      </Modal>

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
                  style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: c,
                    borderWidth: noteColor === c ? 2.5 : 0,
                    borderColor: '#EEEEF8',
                  }}
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
              <Pressable
                onPress={handleAddNote}
                disabled={!noteText.trim()}
                style={[styles.notePinBtn, !noteText.trim() && { opacity: 0.4 }]}
              >
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1A1A28', borderRadius: 16,
    borderWidth: 1, borderColor: '#2E2E48', padding: 16, marginBottom: 8,
  },
  sheetOptionLabel: {
    fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold',
  },
  sheetOptionSub: {
    fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular',
  },
  sectionLabel: {
    fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginTop: 8, marginBottom: 6, paddingHorizontal: 4,
  },
  pinRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: '#1A1A28', borderRadius: 12,
    borderWidth: 1, borderColor: '#2E2E48', marginBottom: 6,
  },
  pinRowLabel: {
    flex: 1, fontSize: 13, color: '#A0A0C0', fontFamily: 'Inter_400Regular',
  },
  removeBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
  },
  noteOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
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
