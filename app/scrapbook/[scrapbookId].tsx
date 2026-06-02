import { useState, useMemo } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, StyleSheet,
  Modal, TextInput, Platform, ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useScrapbook, useAddScrapbookItem, useAddScrapbookPage } from '@hooks/useScrapbooks';
import { useMyPosts, useIncomingPosts } from '@hooks/usePosts';
import { useAuthStore } from '@stores/auth.store';
import { PageTurn } from '@/components/scrapbook/PageTurn';
import { PhotoBoothStripView } from '@/components/photobooth/PhotoBoothStripView';
import { usePhotoBoothStore } from '@stores/photobooth.store';
import { useTheme } from '@hooks/useTheme';
import { isDemoMode } from '@lib/demo';
import { ALL_STICKERS } from '@lib/stickers';
import type { ScrapbookPage, ScrapbookItem } from '@types/models';

function postsToPages(
  posts: { id: string; imageUrl: string | null; createdAt: string }[],
  sbId: string,
): ScrapbookPage[] {
  if (!posts.length) return [];
  const SLOTS = 6;
  const pages: ScrapbookPage[] = [];
  for (let p = 0; p < Math.ceil(posts.length / SLOTS); p++) {
    const slice = posts.slice(p * SLOTS, (p + 1) * SLOTS);
    const pageId = `auto-page-${sbId}-${p}`;
    pages.push({
      id: pageId,
      scrapbookId: sbId,
      pageNumber: p + 1,
      layout: 'collage',
      title: null,
      createdAt: new Date().toISOString(),
      items: slice.map((post, si): ScrapbookItem => ({
        id: `auto-item-${post.id}`,
        pageId,
        scrapbookId: sbId,
        creatorId: 'auto',
        imageUrl: post.imageUrl,
        thumbnailUrl: null,
        storagePath: null,
        note: null,
        posX: 0, posY: 0,
        rotation: 0, scale: 1,
        orderIndex: si,
        createdAt: post.createdAt,
        itemType: 'photo',
        slotIndex: si,
      })),
    });
  }
  return pages;
}

const INK_COLORS = ['#1A1208', '#1A2840', '#6B1020', '#1A3A1A', '#3A1060', '#5A3010'];

function makeDemoPage(num: number, scrapbookId: string): ScrapbookPage {
  return {
    id: `demo-page-${scrapbookId}-${num}`,
    scrapbookId,
    pageNumber: num,
    layout: 'collage',
    title: null,
    createdAt: new Date().toISOString(),
    items: [],
  };
}

export default function ScrapbookScreen() {
  const { scrapbookId, bg } = useLocalSearchParams<{ scrapbookId: string; bg?: string }>();
  const isPhotoBooth = scrapbookId === 'photo-booth';
  const isMyPics = scrapbookId === 'my-pics';
  const isFriends = scrapbookId === 'friends';
  const isSpecial = isPhotoBooth || isMyPics || isFriends;
  const boothStore = usePhotoBoothStore();
  const boothBg = isPhotoBooth ? (boothStore.bgColor || `#${bg ?? 'FFFDF5'}`) : undefined;
  // Slot map from captured URIs (index → uri)
  const boothSlots: Record<number, string | undefined> = isPhotoBooth
    ? Object.fromEntries(boothStore.uris.map((u, i) => [i, u || undefined]))
    : {};
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const demo = isDemoMode() || isSpecial;

  const { scrapbook, isLoading } = useScrapbook(isSpecial ? '' : (scrapbookId ?? ''));
  const { data: rawMyPosts } = useMyPosts();
  const { data: rawIncoming } = useIncomingPosts();
  const { mutateAsync: addItem, isPending: isAddingItem } = useAddScrapbookItem(scrapbookId ?? '');
  const { mutateAsync: addPage } = useAddScrapbookPage(scrapbookId ?? '');

  const [currentPage, setCurrentPage] = useState(0);
  const [demoPages, setDemoPages] = useState<ScrapbookPage[]>(() => [
    makeDemoPage(1, scrapbookId ?? 'demo'),
  ]);

  const [textModalVisible, setTextModalVisible] = useState(false);
  const [stickerModalVisible, setStickerModalVisible] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [inkColor, setInkColor] = useState(INK_COLORS[0]);

  const myPicsPages = useMemo((): ScrapbookPage[] => {
    if (!isMyPics) return [];
    return postsToPages(
      (rawMyPosts ?? []).map((p: any) => ({ id: p.id, imageUrl: p.image_url as string | null, createdAt: p.created_at as string })),
      'my-pics',
    );
  }, [isMyPics, rawMyPosts]);

  const friendsPages = useMemo((): ScrapbookPage[] => {
    if (!isFriends) return [];
    return postsToPages(
      (rawIncoming ?? []).map((p: any) => ({ id: p.postId, imageUrl: p.imageUrl as string | null, createdAt: p.createdAt as string })),
      'friends',
    );
  }, [isFriends, rawIncoming]);

  const pages = isMyPics ? myPicsPages
    : isFriends ? friendsPages
    : demo ? demoPages
    : (scrapbook?.pages ?? []);
  const canEdit = (isMyPics || isFriends) ? false : demo ? true : !scrapbook?.isFinished;
  const title = isPhotoBooth ? 'photo booth'
    : isMyPics ? 'my pics'
    : isFriends ? 'friends'
    : demo
    ? (scrapbookId === 'demo-scrapbook-2' ? 'summer 25' : 'my scrapbook')
    : (scrapbook?.title ?? '');
  const coverEmoji = demo ? '📒' : (scrapbook?.coverEmoji ?? '📒');
  const currentPageData = pages[currentPage];

  const randomOverlayPos = () => ({
    posX: 20 + Math.random() * 60,
    posY: 18 + Math.random() * 60,
  });

  // ── Demo helpers ──────────────────────────────────────────────────────────

  const addDemoOverlayItem = (
    partial: Partial<ScrapbookItem> & { itemType: 'text' | 'sticker' },
  ) => {
    if (!currentPageData) return;
    const { posX, posY } = randomOverlayPos();
    const item: ScrapbookItem = {
      id: `demo-item-${Date.now()}`,
      pageId: currentPageData.id,
      scrapbookId: scrapbookId ?? 'demo',
      creatorId: userId ?? 'demo',
      imageUrl: null,
      thumbnailUrl: null,
      storagePath: null,
      note: null,
      posX, posY,
      rotation: Math.random() * 12 - 6,
      scale: 1,
      orderIndex: (currentPageData.items ?? []).length,
      createdAt: new Date().toISOString(),
      ...partial,
    };
    setDemoPages((prev) => prev.map((p) =>
      p.id === currentPageData.id ? { ...p, items: [...(p.items ?? []), item] } : p,
    ));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Photo via slot tap ────────────────────────────────────────────────────

  const handleSlotPress = async (pageId: string, slotIndex: number) => {
    if (!demo) return; // real-mode backend wiring left for later

    const pickAndAdd = (uri: string) => {
      const newItem: ScrapbookItem = {
        id: `demo-item-${Date.now()}`,
        pageId,
        scrapbookId: scrapbookId ?? 'demo',
        creatorId: userId ?? 'demo',
        imageUrl: uri,
        thumbnailUrl: uri,
        storagePath: null,
        note: null,
        posX: 0, posY: 0,
        rotation: 0,
        scale: 1,
        orderIndex: slotIndex,
        createdAt: new Date().toISOString(),
        itemType: 'photo',
        slotIndex,
      };
      setDemoPages((prev) => prev.map((p) => {
        if (p.id !== pageId) return p;
        // Replace any existing photo in the same slot, then add new one
        const rest = (p.items ?? []).filter(
          (it) => !(it.itemType === 'photo' && it.slotIndex === slotIndex),
        );
        return { ...p, items: [...rest, newItem] };
      }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      (input as any).onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) pickAndAdd(URL.createObjectURL(file));
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (!result.canceled) pickAndAdd(result.assets[0].uri);
    }
  };

  // ── Item move (drag end) ──────────────────────────────────────────────────

  const handleItemMove = (pageId: string, itemId: string, posX: number, posY: number) => {
    setDemoPages((prev) => prev.map((p) => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        items: (p.items ?? []).map((it) =>
          it.id === itemId ? { ...it, posX, posY } : it,
        ),
      };
    }));
  };

  // ── Sticker ───────────────────────────────────────────────────────────────

  const handleAddSticker = (stickerId: string) => {
    addDemoOverlayItem({ itemType: 'sticker', stickerId });
    setStickerModalVisible(false);
  };

  // ── Text ──────────────────────────────────────────────────────────────────

  const handlePinText = () => {
    if (!textContent.trim()) return;
    addDemoOverlayItem({ itemType: 'text', textContent: textContent.trim(), fontColor: inkColor });
    setTextContent('');
    setInkColor(INK_COLORS[0]);
    setTextModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Page management ───────────────────────────────────────────────────────

  const handleAddPage = async () => {
    if (demo) {
      const nextNum = demoPages.length + 1;
      setDemoPages((prev) => [...prev, makeDemoPage(nextNum, scrapbookId ?? 'demo')]);
      setCurrentPage(demoPages.length);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (!pages.length) return;
    const nextNum = Math.max(...pages.map((p) => p.pageNumber)) + 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addPage({ pageNumber: nextNum });
    setCurrentPage(pages.length);
  };

  // ── Loading / error ───────────────────────────────────────────────────────

  if (!demo && isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!demo && !scrapbook) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 40 }}>📒</Text>
        <Text style={{ fontSize: 16, color: theme.textSub, fontFamily: 'Inter_500Medium' }}>book not found</Text>
        <Pressable
          onPress={() => router.back()}
          style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.accentDim, borderRadius: 14 }}
        >
          <Text style={{ color: theme.accentLight, fontFamily: 'Inter_600SemiBold' }}>go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: isPhotoBooth ? (boothBg ?? '#FFFDF5') : '#FFFDF5' }}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: '#EEEEF8', fontSize: 20, lineHeight: 22 }}>‹</Text>
            <Text style={{ color: '#EEEEF8', fontSize: 14, fontFamily: 'Inter_500Medium' }}>back</Text>
          </Pressable>

          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>
              {title}
            </Text>
            <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
              page {currentPage + 1} of {pages.length || 1}
            </Text>
          </View>

          {canEdit && !isPhotoBooth ? (
            <Pressable onPress={handleAddPage} style={styles.addPageBtn}>
              <Text style={{ color: '#B8AEFF', fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>+ page</Text>
            </Pressable>
          ) : (
            <View style={{ width: 64 }} />
          )}
        </View>

        {/* ── Page canvas ─────────────────────────────────────────────────── */}
        {pages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 }}>
            {isMyPics && (
              <>
                <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>your sent photos</Text>
                <Text style={{ fontSize: 13, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 }}>
                  every polaroid you send to friends collects here automatically
                </Text>
              </>
            )}
            {isFriends && (
              <>
                <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>photos from friends</Text>
                <Text style={{ fontSize: 13, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 }}>
                  polaroids your friends send you will appear here once developed
                </Text>
              </>
            )}
            {isPhotoBooth && (
              <>
                <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>your photo booth strips</Text>
                <Text style={{ fontSize: 13, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 }}>
                  every photo booth session you take gets saved here
                </Text>
              </>
            )}
            {!isSpecial && (
              <Text style={{ fontSize: 13, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                this scrapbook is empty
              </Text>
            )}
            {canEdit && (
              <Pressable
                onPress={handleAddPage}
                style={{ marginTop: 4, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#2A2040', borderRadius: 14, borderWidth: 1, borderColor: '#6B52E0' }}
              >
                <Text style={{ color: '#B8AEFF', fontFamily: 'Inter_600SemiBold' }}>add first page</Text>
              </Pressable>
            )}
          </View>
        ) : isPhotoBooth ? (
          <PhotoBoothStripView
            slots={boothSlots}
            bgColor={boothBg ?? '#FFFDF5'}
          />
        ) : (
          <PageTurn
            pages={pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onSlotPress={canEdit ? handleSlotPress : undefined}
            onItemMove={canEdit ? handleItemMove : undefined}
            bgColor={boothBg}
            photoRows={3}
          />
        )}

        {/* Page dots — scrapbook only, not photo booth */}
        {!isPhotoBooth && pages.length > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8 }}>
            {pages.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => setCurrentPage(i)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View style={{
                  width: i === currentPage ? 18 : 6, height: 6, borderRadius: 3,
                  backgroundColor: i === currentPage ? '#6B52E0' : '#3A3A5A',
                }} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Floating edit buttons (pen + sticker) ───────────────────────── */}
        {canEdit && pages.length > 0 && (
          <View style={{ position: 'absolute', right: 16, bottom: insets.bottom + 10, gap: 8 }}>
            {/* Flat flower / sticker button */}
            <Pressable onPress={() => setStickerModalVisible(true)} style={styles.penBtn}>
              <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                {[0,60,120,180,240,300].map((deg, i) => {
                  const rad = (deg - 90) * Math.PI / 180;
                  return (
                    <View key={i} style={{
                      position: 'absolute',
                      left: 12 + Math.cos(rad) * 7 - 4,
                      top:  12 + Math.sin(rad) * 7 - 5,
                      width: 8, height: 10, borderRadius: 4,
                      backgroundColor: '#E8609A',
                      transform: [{ rotate: `${deg}deg` }],
                    }} />
                  );
                })}
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFE050', position: 'absolute' }} />
              </View>
            </Pressable>
            {/* Flat pencil button */}
            <Pressable onPress={() => setTextModalVisible(true)} style={styles.penBtn}>
              <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 7, height: 20, borderRadius: 3, backgroundColor: '#F5C840', transform: [{ rotate: '-38deg' }], overflow: 'hidden' }}>
                  {/* Eraser */}
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, backgroundColor: '#F0909A' }} />
                  {/* Tip */}
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, backgroundColor: '#D4A030' }} />
                  {/* Body stripe */}
                  <View style={{ position: 'absolute', left: 0, right: 0, top: 5, height: 1, backgroundColor: 'rgba(0,0,0,0.12)' }} />
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {/* ── Write modal ───────────────────────────────────────────────────── */}
        <Modal visible={textModalVisible} transparent animationType="slide" onRequestClose={() => setTextModalVisible(false)}>
          <Pressable style={styles.overlay} onPress={() => setTextModalVisible(false)}>
            <MotiView
              from={{ translateY: 300 }}
              animate={{ translateY: 0 }}
              transition={{ type: 'spring', damping: 22 }}
              style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            >
              <View style={styles.sheetHandle} />

              <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 12, marginTop: 4 }}>
                {INK_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setInkColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: 14, backgroundColor: c,
                      borderWidth: inkColor === c ? 3 : 1.5,
                      borderColor: inkColor === c ? '#B8AEFF' : 'rgba(255,255,255,0.12)',
                    }}
                  />
                ))}
              </View>

              <View style={{ marginHorizontal: 20, backgroundColor: '#FFFDF5', borderRadius: 14, padding: 14, minHeight: 100 }}>
                <TextInput
                  value={textContent}
                  onChangeText={setTextContent}
                  placeholder="write here..."
                  placeholderTextColor="rgba(0,0,0,0.22)"
                  multiline
                  maxLength={150}
                  autoFocus
                  style={{
                    fontFamily: 'Caveat_400Regular',
                    fontSize: 24,
                    color: inkColor,
                    lineHeight: 32,
                    textAlignVertical: 'top',
                    minHeight: 80,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, paddingHorizontal: 20 }}>
                <Pressable onPress={() => setTextModalVisible(false)} style={styles.cancelBtn}>
                  <Text style={{ fontSize: 14, color: '#7A7A9A', fontFamily: 'Inter_500Medium' }}>cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handlePinText}
                  disabled={!textContent.trim()}
                  style={[styles.pinBtn, !textContent.trim() && { opacity: 0.4 }]}
                >
                  <Text style={{ fontSize: 14, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>pin ✏️</Text>
                </Pressable>
              </View>
            </MotiView>
          </Pressable>
        </Modal>

        {/* ── Sticker modal ─────────────────────────────────────────────────── */}
        <Modal visible={stickerModalVisible} transparent animationType="slide" onRequestClose={() => setStickerModalVisible(false)}>
          <Pressable style={styles.overlay} onPress={() => setStickerModalVisible(false)}>
            <MotiView
              from={{ translateY: 300 }}
              animate={{ translateY: 0 }}
              transition={{ type: 'spring', damping: 22 }}
              style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            >
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>stickers</Text>
              <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}>
                {ALL_STICKERS.map((sticker) => (
                  <Pressable
                    key={sticker.id}
                    onPress={() => handleAddSticker(sticker.id)}
                    style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12 }}
                  >
                    <Text style={{ fontSize: 30 }}>{sticker.emoji}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </MotiView>
          </Pressable>
        </Modal>

        {/* Members strip (real mode) */}
        {!demo && (
          <View style={{ position: 'absolute', bottom: insets.bottom + 56, right: 16, flexDirection: 'row' }}>
            {(scrapbook?.members ?? []).slice(0, 4).map((m, i) => (
              <View key={m.id} style={{
                width: 28, height: 28, borderRadius: 14, backgroundColor: '#2A2040',
                borderWidth: 1.5, borderColor: '#12121C',
                alignItems: 'center', justifyContent: 'center',
                marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i,
              }}>
                <Text style={{ fontSize: 12 }}>{m.user?.avatar_emoji ?? '🌙'}</Text>
              </View>
            ))}
          </View>
        )}

        {isAddingItem && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator color="#B8AEFF" size="large" />
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1E1E30',
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#1A1A28', borderRadius: 12,
    borderWidth: 1, borderColor: '#2E2E48', minWidth: 64,
  },
  addPageBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#2A2040', borderRadius: 12,
    borderWidth: 1, borderColor: '#6B52E0', minWidth: 64, alignItems: 'center',
  },
  penBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,253,245,0.92)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: 4,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#12121C',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: '#2E2E48', paddingTop: 16,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#2E2E48', alignSelf: 'center', marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 14, color: '#EEEEF8', fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 14, paddingHorizontal: 20,
  },
  cancelBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#1A1A28', borderWidth: 1, borderColor: '#2E2E48',
  },
  pinBtn: {
    flex: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#6B52E0',
  },
});
