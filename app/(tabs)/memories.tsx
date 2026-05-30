import { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMyCapsules } from '@hooks/useCapsules';
import { useMyScrapbooks } from '@hooks/useScrapbooks';
import { useMySeasonalRecaps } from '@hooks/useSeasonalRecaps';
import { useMyDeskDrops } from '@hooks/useDeskDrops';
import { RevealCeremony } from '@/components/polaroid/RevealCeremony';
import { useRevealStore } from '@stores/reveal.store';
import { useTheme } from '@hooks/useTheme';

// ─── Dimensions ───────────────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FRAME_SIDE = 22;
const INNER_W = SCREEN_W - FRAME_SIDE * 2;
const PLANK_H = 24;
const TOP_BEAM_H = 22;
const BOTTOM_BEAM_H = 24;
// Size shelves so exactly 3 rows fill the visible bookshelf area.
// Estimate visible area: screen − safe-area (~100) − header (~60) − tab bar (~80) − margins (~30).
const SHELF_H = Math.max(140, Math.floor(
  (Math.max(420, SCREEN_H - 270) - TOP_BEAM_H - BOTTOM_BEAM_H - 3 * PLANK_H) / 3,
));

// ─── Wood palette — warm walnut ───────────────────────────────────────────────
const FRAME_DARK = '#6A3A10';




// ─── Book colors — 12 distinct spine colours (matches scrapbook/new.tsx) ──────
// [mainColor, stripeColor, textColor]
const COLORS: [string, string, string][] = [
  ['#C84B4B', '#8C2828', '#FFB0A0'], // 0  red
  ['#E05A30', '#B83018', '#FF9060'], // 1  red-orange
  ['#C87B3A', '#8C4A18', '#FFB870'], // 2  orange
  ['#E0B830', '#A08010', '#FFE060'], // 3  golden   ← avoid for presets
  ['#4B9E4B', '#2A6A2A', '#90E890'], // 4  green    ← avoid
  ['#3A8A5A', '#1C5838', '#80D8A8'], // 5  teal-green ← avoid
  ['#309898', '#186060', '#60E0E0'], // 6  teal
  ['#4B7BC8', '#2A5090', '#A0CCFF'], // 7  blue
  ['#2A4060', '#121C38', '#6090C8'], // 8  dark navy
  ['#8B5BC8', '#5830A0', '#D0A0FF'], // 9  purple
  ['#A050C8', '#7028A0', '#E0A0FF'], // 10 violet
  ['#E8E0D0', '#B8B0A0', '#806850'], // 11 cream    ← avoid
];

// Approved colour indices for preset/generated books (no yellow, green, brown)
const APPROVED_IDX = [0, 1, 2, 6, 7, 8, 9, 10];

// Stable seeded random from a book id string — always returns the same value for the same id+slot
function idRand(id: string, slot: number): number {
  let h = slot * 2654435761;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2246822519) | 0;
  return ((h >>> 0) / 0xFFFFFFFF);
}

function bookDims(id: string) {
  const width      = Math.round(idRand(id, 0) * 20 + 20);            // 20–40 px
  const heightRatio = 0.72 + idRand(id, 1) * 0.25;                   // 0.72–0.97
  const stripes    = idRand(id, 2) > 0.5
    ? [0.15 + idRand(id, 3) * 0.1, 0.75 + idRand(id, 4) * 0.12]
    : [0.3  + idRand(id, 3) * 0.4];
  const colorIdx   = APPROVED_IDX[Math.floor(idRand(id, 5) * APPROVED_IDX.length)];
  return { width, heightRatio, stripes, colorIdx };
}

// ─── Book spine data ──────────────────────────────────────────────────────────
interface SpineBook {
  id: string;
  colorIdx: number;
  width: number;
  heightRatio: number;   // 0.7 – 1.0 of SHELF_H
  stripes: number[];     // 0-1 positions for horizontal stripes
  label: string;
  isLocked?: boolean;
  badge?: boolean;
  onPress?: () => void;
}

// ─── BookSpine ────────────────────────────────────────────────────────────────
function BookSpine({ book, delay }: { book: SpineBook; delay: number }) {
  const [main, stripeColor, textColor] = COLORS[book.colorIdx % COLORS.length];
  const h = Math.round(SHELF_H * book.heightRatio);
  const w = book.width;

  const spineContent = (
    <View style={[styles.spine, { width: w, height: h, backgroundColor: main }]}>
      {/* Top cap */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: stripeColor }} />
      <View style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' }} />
      {/* Bottom cap */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, backgroundColor: stripeColor }} />
      <View style={{ position: 'absolute', bottom: 6, left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.22)' }} />
      {/* Mid accent stripes */}
      {book.stripes.map((pos, i) => (
        <View key={i} style={{ position: 'absolute', top: Math.round(h * pos), left: 0, right: 0, height: 3, backgroundColor: stripeColor }} />
      ))}
      {/* Left binding shadow */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: 'rgba(0,0,0,0.40)' }} />
      <View style={{ position: 'absolute', left: 3, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.10)' }} />
      {/* Lock overlay */}
      {book.isLocked && (
        <View style={[StyleSheet.absoluteFill, styles.lockOverlay]}>
          <Text style={{ fontSize: 13 }}>🔒</Text>
        </View>
      )}
      {/* Badge */}
      {book.badge && <View style={styles.badgeDot} />}
      {/* Vertical title */}
      {!book.isLocked && (
        <View style={{
          position: 'absolute',
          width: h - 20, height: w - 6,
          left: (w - (h - 20)) / 2,
          top: (h - (w - 6)) / 2,
          transform: [{ rotate: '90deg' }],
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text numberOfLines={1} style={{
            fontSize: 8, fontFamily: 'Inter_700Bold',
            color: textColor, letterSpacing: 1,
            textTransform: 'uppercase', width: h - 20,
            textAlign: 'center',
            textShadowColor: 'rgba(0,0,0,0.4)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}>
            {book.label}
          </Text>
        </View>
      )}
      {/* Right-edge shadow */}
      <View style={styles.spineEdge} />
    </View>
  );

  if (!book.onPress) {
    return (
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 180, delay }}
        style={{ alignSelf: 'flex-end' }}
      >
        {spineContent}
      </MotiView>
    );
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 180, delay }}
      style={{ alignSelf: 'flex-end' }}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          book.onPress!();
        }}
      >
        {spineContent}
      </Pressable>
    </MotiView>
  );
}

// ─── ShelfRow ─────────────────────────────────────────────────────────────────
function ShelfRow({ books, rowIndex }: { books: SpineBook[]; rowIndex: number }) {
  return (
    <View>
      {/* Back wall — flat warm brown */}
      <View style={{ height: SHELF_H, backgroundColor: '#9A6225' }}>
        {/* Top shadow — shelf overhang */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, backgroundColor: 'rgba(0,0,0,0.18)' }} pointerEvents="none" />
        {/* Books */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: SHELF_H, paddingHorizontal: 6, gap: 3 }}>
          {books.map((book, i) => (
            <BookSpine key={book.id} book={book} delay={rowIndex * 100 + i * 40} />
          ))}
        </View>
      </View>

      {/* Shelf plank — flat with single top highlight */}
      <View style={{ height: PLANK_H, backgroundColor: '#B8782A' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.18)' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: '#7A4C18' }} />
      </View>
    </View>
  );
}

// ─── AddBookModal ─────────────────────────────────────────────────────────────
function AddBookModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const options = [
    { label: 'time capsule', sub: 'lock memories until a future date', route: '/capsule/new' },
    { label: 'scrapbook', sub: 'build a photo book with friends', route: '/scrapbook/new' },
    { label: 'film roll', sub: 'shoot and develop with friends', route: '/roll/new' },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose} />
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>add a book</Text>
        {options.map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => { onClose(); router.push(opt.route as any); }}
            style={({ pressed }) => [styles.sheetRow, pressed && { backgroundColor: '#1A1A2E' }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.sheetRowLabel}>{opt.label}</Text>
              <Text style={styles.sheetRowSub}>{opt.sub}</Text>
            </View>
            <Text style={{ fontSize: 18, color: '#3D3D5E' }}>›</Text>
          </Pressable>
        ))}
        <View style={{ height: 20 }} />
      </View>
    </Modal>
  );
}

// ─── MemoriesScreen ───────────────────────────────────────────────────────────
export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const ceremonyPost = useRevealStore((s) => s.ceremonyPost);

  const { capsules } = useMyCapsules();
  const { scrapbooks } = useMyScrapbooks();
  const { recaps } = useMySeasonalRecaps();
  const { drops } = useMyDeskDrops();

  // ── Build real user books only (no filler) ──────────────────────────────────
  const allBooks = useMemo<SpineBook[]>(() => {
    const books: SpineBook[] = [];

    // Always-present permanent books (can't be deleted)
    books.push({
      id: 'my-pics',
      colorIdx: 7,   // blue
      width: 36, heightRatio: 0.96, stripes: [0.15, 0.82],
      label: 'my pics',
      onPress: () => router.push('/scrapbook/my-pics' as any),
    });
    books.push({
      id: 'friends',
      colorIdx: 9,   // purple
      width: 34, heightRatio: 0.88, stripes: [0.18, 0.76],
      label: 'friends',
      badge: drops.length > 0,
      onPress: () => router.push('/scrapbook/friends' as any),
    });
    books.push({
      id: 'photo-booth',
      colorIdx: 0,   // red
      width: 30, heightRatio: 0.90, stripes: [0.28],
      label: 'photo booth',
      onPress: () => router.push('/scrapbook/photo-booth' as any),
    });

    // Time capsules
    capsules.forEach((c) => {
      const unlockDate = c.unlockAt ? new Date(c.unlockAt) : null;
      const isLocked = !c.isOpened && !!unlockDate && unlockDate > new Date();
      const d = bookDims(c.id);
      books.push({ id: c.id, ...d, label: c.title, isLocked, onPress: () => router.push(`/capsule/${c.id}`) });
    });

    // Scrapbooks
    scrapbooks.forEach((s) => {
      let storedColorIdx: number | null = null;
      try {
        const meta = JSON.parse(s.description ?? '');
        if (typeof meta?.colorIdx === 'number') storedColorIdx = meta.colorIdx;
      } catch {}
      const d = bookDims(s.id);
      books.push({ id: s.id, ...d, colorIdx: storedColorIdx ?? d.colorIdx, label: s.title, onPress: () => router.push(`/scrapbook/${s.id}`) });
    });

    // Seasonal recaps
    recaps.forEach((r) => {
      const d = bookDims(r.id);
      books.push({ id: r.id, ...d, label: r.label, badge: !r.isOpened, onPress: () => router.push(`/recap/${r.id}`) });
    });

    return books;
  }, [capsules, scrapbooks, recaps, drops]);

  // ── Pack books into shelf rows by width ─────────────────────────────────────
  const rows = useMemo<SpineBook[][]>(() => {
    const shelfWidth = INNER_W - 12; // 6px padding each side
    const result: SpineBook[][] = [];
    let current: SpineBook[] = [];
    let rowWidth = 0;

    for (const book of allBooks) {
      const needed = book.width + 2; // +gap
      if (rowWidth + needed > shelfWidth && current.length > 0) {
        result.push(current);
        current = [];
        rowWidth = 0;
      }
      current.push(book);
      rowWidth += needed;
    }
    if (current.length > 0) result.push(current);

    // Show exactly 3 rows by default; extra rows only appear when books overflow
    while (result.length < 3) result.push([]);
    return result;
  }, [allBooks]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F5F5', '#EFEFEF']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* ── Items on top of the bookcase ──────────────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end',
          paddingHorizontal: FRAME_SIDE + 8,
          marginBottom: -2, marginTop: 4,
        }}>

          {/* ── Candle ─── */}
          <View style={{ alignItems: 'center', marginRight: 14 }}>
            {/* Flame */}
            <View style={{ width: 10, height: 18, borderRadius: 5, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: '#FFBB20', marginBottom: -1 }}>
              <View style={{ position: 'absolute', top: 3, left: 2, width: 6, height: 9, borderRadius: 3, backgroundColor: '#FFEE80', opacity: 0.7 }} />
            </View>
            {/* Wick */}
            <View style={{ width: 2, height: 6, backgroundColor: '#3A2010' }} />
            {/* Wax body */}
            <View style={{ width: 24, height: 54, backgroundColor: '#F4ECE0', borderRadius: 4, borderTopLeftRadius: 6, borderTopRightRadius: 6, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: 'rgba(0,0,0,0.07)' }} />
              <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, backgroundColor: 'rgba(0,0,0,0.09)' }} />
              {/* Wax drip */}
              <View style={{ position: 'absolute', top: 0, left: 7, width: 5, height: 14, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: 'rgba(225,210,190,0.9)' }} />
            </View>
            {/* Holder plate */}
            <View style={{ width: 34, height: 5, backgroundColor: '#C4A870', borderRadius: 3 }} />
          </View>

          {/* ── Mug ─── */}
          <View style={{ marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Body */}
              <View style={{ width: 34, height: 30, backgroundColor: '#EDE4D2', borderRadius: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, overflow: 'hidden' }}>
                <View style={{ position: 'absolute', top: 0, left: 3, right: 3, height: 5, backgroundColor: 'rgba(100,70,40,0.20)', borderRadius: 3 }} />
                <View style={{ position: 'absolute', bottom: 9, left: 0, right: 0, height: 7, backgroundColor: 'rgba(180,100,40,0.22)' }} />
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: 'rgba(0,0,0,0.06)' }} />
              </View>
              {/* Handle — open D ring */}
              <View style={{ width: 10, height: 16, borderRadius: 5, borderWidth: 3, borderColor: '#D8CDB8', backgroundColor: 'transparent', marginLeft: -2 }} />
            </View>
            {/* Base */}
            <View style={{ width: 40, height: 3, backgroundColor: '#C8BCAA', borderRadius: 2, marginLeft: -3 }} />
          </View>

          {/* ── Cactus ─── */}
          <View style={{ alignItems: 'center', marginRight: 8 }}>
            <View style={{ width: 52, alignItems: 'center', marginBottom: -2 }}>
              {/* Left arm */}
              <View style={{ position: 'absolute', left: 2, bottom: 20, width: 18, height: 14, backgroundColor: '#3E8038', borderRadius: 9, borderBottomRightRadius: 3 }}>
                <View style={{ position: 'absolute', right: 4, top: 3, bottom: 3, width: 2, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 1 }} />
              </View>
              {/* Right arm */}
              <View style={{ position: 'absolute', right: 4, bottom: 12, width: 16, height: 13, backgroundColor: '#3E8038', borderRadius: 8, borderBottomLeftRadius: 3 }}>
                <View style={{ position: 'absolute', left: 3, top: 3, bottom: 3, width: 2, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 1 }} />
              </View>
              {/* Main trunk */}
              <View style={{ width: 22, height: 46, backgroundColor: '#4A9040', borderRadius: 11, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 }}>
                <View style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 3, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2 }} />
                <View style={{ position: 'absolute', right: 5, top: 4, bottom: 4, width: 3, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2 }} />
                <View style={{ position: 'absolute', left: '50%', marginLeft: -1, top: 6, height: 30, width: 2, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 1 }} />
              </View>
            </View>
            <View style={{ width: 30, height: 6, backgroundColor: '#C47038', borderRadius: 3 }} />
            <View style={{ width: 26, height: 22, backgroundColor: '#B85E28', borderBottomLeftRadius: 7, borderBottomRightRadius: 7, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, backgroundColor: 'rgba(0,0,0,0.12)', borderBottomRightRadius: 7 }} />
            </View>
          </View>

          {/* Spacer pushes plant to right */}
          <View style={{ flex: 1 }} />

          {/* ── Add button (integrated) ─── */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/scrapbook/new' as any); }}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#5A40C0' : theme.accent,
              borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7,
              marginRight: 12, marginBottom: 6,
              shadowColor: theme.accent, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
            })}
          >
            <Text style={{ fontSize: 12, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>+ add</Text>
          </Pressable>

          {/* ── Vase (right) ─── */}
          <View style={{ alignItems: 'center' }}>
            {/* Rim */}
            <View style={{ width: 20, height: 5, backgroundColor: '#A8C8E0', borderRadius: 3 }} />
            {/* Neck */}
            <View style={{ width: 14, height: 14, backgroundColor: '#B8D4E8' }} />
            {/* Body — uniform round sphere */}
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#B8D4E8', overflow: 'hidden' }}>
              <View style={{ position: 'absolute', left: 8, top: 8, width: 8, height: 22, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.28)' }} />
              <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 24 }} />
            </View>
            {/* Foot */}
            <View style={{ width: 20, height: 5, backgroundColor: '#A8C8E0', borderRadius: 3 }} />
          </View>
        </View>

        {/* ── Bookshelf ─────────────────────────────────────────────────────── */}
        <View style={styles.bookshelf}>
          {/* Top beam */}
          <View style={styles.topBeam}>
            <View style={styles.topBeamEdge} />
          </View>

          {/* Content: side frames + shelf rows */}
          <View style={{ flexDirection: 'row' }}>
            {/* Left frame */}
            <View style={styles.sideFrame}>
              <View style={styles.sideFrameRightEdge} />
            </View>

            {/* Shelf rows */}
            <View style={{ flex: 1 }}>
              {rows.map((rowBooks, i) => (
                <ShelfRow key={i} books={rowBooks} rowIndex={i} />
              ))}
            </View>

            {/* Right frame */}
            <View style={styles.sideFrame}>
              <View style={styles.sideFrameLeftEdge} />
            </View>
          </View>

          {/* Bottom beam */}
          <View style={styles.bottomBeam} />
        </View>

        {/* Tap hint */}
        <Text style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.12)', fontFamily: 'Inter_400Regular', marginTop: 14 }}>
          tap a book to open it
        </Text>
      </ScrollView>

      <AnimatePresence>
        {ceremonyPost && <RevealCeremony key="ceremony" />}
      </AnimatePresence>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bookshelf: {
    marginHorizontal: 10,
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 14,
  },
  topBeam: {
    height: TOP_BEAM_H,
    backgroundColor: '#B8782A',
  },
  topBeamEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: FRAME_DARK,
  },
  sideFrame: {
    width: FRAME_SIDE,
    backgroundColor: '#B8782A',
  },
  sideFrameRightEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 3,
    backgroundColor: FRAME_DARK,
  },
  sideFrameLeftEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
    backgroundColor: FRAME_DARK,
  },
  bottomBeam: {
    height: BOTTOM_BEAM_H,
    backgroundColor: '#B8782A',
    borderTopWidth: 3,
    borderTopColor: FRAME_DARK,
  },
  spine: {
    borderRadius: 1,
    overflow: 'hidden',
  },
  spineEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  lockOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 5,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C84B6B',
  },
  bottomSheet: {
    backgroundColor: '#12121C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 6,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#2E2E48',
    alignSelf: 'center', marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16, color: '#EEEEF8',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center', marginBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A28', borderRadius: 16,
    borderWidth: 1, borderColor: '#2E2E48',
    padding: 16, gap: 12,
  },
  sheetRowLabel: {
    fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold',
  },
  sheetRowSub: {
    fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular',
  },
});
