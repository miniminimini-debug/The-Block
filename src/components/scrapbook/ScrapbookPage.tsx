import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { FilmGrainOverlay } from '@/components/polaroid/FilmGrainOverlay';
import { DraggableOverlayItem } from './DraggableOverlayItem';
import type { ScrapbookPage, ScrapbookItem } from '@types/models';

interface ScrapbookPageProps {
  page: ScrapbookPage;
  pageIndex: number;
  width: number;
  bgColor?: string;    // custom page background (photo booth)
  photoRows?: 2 | 3;  // 2 = 4-slot booth, 3 = 6-slot scrapbook (default)
  onSlotPress?: (slotIndex: number) => void;
  onItemMove?: (itemId: string, posX: number, posY: number) => void;
}

const CC = '#8A7050';
const CA = 10;
const CT = 2;

function CornerMounts() {
  return (
    <>
      <View style={[s.ch, { top: 0, left: 0 }]} />
      <View style={[s.cv, { top: 0, left: 0 }]} />
      <View style={[s.ch, { top: 0, right: 0 }]} />
      <View style={[s.cv, { top: 0, right: 0 }]} />
      <View style={[s.ch, { bottom: 0, left: 0 }]} />
      <View style={[s.cv, { bottom: 0, left: 0 }]} />
      <View style={[s.ch, { bottom: 0, right: 0 }]} />
      <View style={[s.cv, { bottom: 0, right: 0 }]} />
    </>
  );
}

const SLOT_ROTATIONS = ['-1.1deg', '0.9deg', '-0.7deg', '1.2deg', '0.6deg', '-1deg'];

// Divide the page into 6 equal sections (2 cols × 3 rows) and size each
// polaroid to fill as much of its section as possible.
// containerH: measured height of the page (from onLayout).
function getPolaroidDims(pageWidth: number, containerH: number) {
  const PAD   = 20;  // outer page padding — pushes grid toward centre
  const H_GAP = 8;   // gap between the 2 columns
  const V_GAP = 8;   // gap between the 3 rows
  const INSET = 5;   // inner polaroid padding

  // Each cell's available space
  const cellW = (pageWidth  - 2 * PAD - H_GAP) / 2;
  const cellH = (containerH - 2 * PAD - 2 * V_GAP) / 3;

  // Square photo: totalH ≈ polaroidW * 1.29 (photoW + strip + top-inset)
  const RATIO = 1.29;
  // 76% of the cell — comfortably sized with breathing room around each polaroid
  const fitW = cellW * 0.76;
  const fitH = cellH * 0.76;

  // Constrain to whichever dimension is tighter
  let polaroidW = fitW;
  if (polaroidW * RATIO > fitH) polaroidW = fitH / RATIO;
  polaroidW = Math.floor(polaroidW);

  const photoH = polaroidW - INSET * 2; // square photo area
  const stripH = Math.round(polaroidW * 0.286);
  const totalH = INSET + photoH + stripH;

  return { PAD, H_GAP, V_GAP, INSET, cellW, cellH, polaroidW, photoH, stripH, totalH };
}

export function ScrapbookPageView({
  page,
  pageIndex,
  width,
  bgColor = '#FFFDF5',
  photoRows = 3,
  onSlotPress,
  onItemMove,
}: ScrapbookPageProps) {
  // 700 is a good starting estimate for most phones — avoids visible resize on first render
  const [containerH, setContainerH] = useState(700);
  const { PAD, H_GAP, V_GAP, INSET, polaroidW, photoH, stripH, totalH } = getPolaroidDims(width, containerH);

  const items = page.items ?? [];
  const photoBySlot: Record<number, ScrapbookItem> = {};
  items.forEach((item) => {
    if (item.itemType === 'photo' || (!item.itemType && item.imageUrl)) {
      photoBySlot[item.slotIndex ?? 0] = item;
    }
  });
  const overlayItems = items.filter(
    (item) => item.itemType === 'text' || item.itemType === 'sticker',
  );

  const lineColor = pageIndex % 2 === 0
    ? 'rgba(180,120,80,0.09)'
    : 'rgba(80,100,180,0.07)';

  return (
    <View
      style={{ flex: 1, backgroundColor: bgColor, overflow: 'visible' }}
      onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}
    >
      {/* Decoration — absoluteFill + pointerEvents="none" so lines stay inside page */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 32 }).map((_, i) => (
          <View key={i} style={{
            position: 'absolute', left: 28, right: 6,
            top: 28 + i * 24, height: 1,
            backgroundColor: lineColor,
          }} />
        ))}
        <View style={{
          position: 'absolute', left: 28, top: 0, bottom: 0,
          width: 1, backgroundColor: 'rgba(220,100,100,0.12)',
        }} />
      </View>

      {/*
        Grid — flex:1 fills the full page.
        3 rows × 2 cols, each row is flex:1 so all rows are equal height.
        Each cell is flex:1 so both columns are equal width.
        Polaroid is centred inside each cell at its calculated max size.
        overflow:visible on every flex container so tilt doesn't clip.
      */}
      <View style={{ flex: 1, padding: PAD, rowGap: V_GAP, zIndex: 1, overflow: 'visible' }}>
        {Array.from({ length: photoRows }, (_, row) => row).map((row) => (
          <View
            key={row}
            style={{ flex: 1, flexDirection: 'row', columnGap: H_GAP, overflow: 'visible' }}
          >
            {[0, 1].map((col) => {
              const idx = row * 2 + col;
              const photo = photoBySlot[idx];
              return (
                <View
                  key={idx}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}
                >
                  <Pressable
                    onPress={onSlotPress ? () => onSlotPress(idx) : undefined}
                    style={{
                      width: polaroidW,
                      height: totalH,
                      backgroundColor: '#F5F0E8',
                      padding: INSET,
                      paddingBottom: 0,
                      borderRadius: 4,
                      transform: [{ rotate: SLOT_ROTATIONS[idx] }],
                      shadowColor: '#000',
                      shadowOpacity: 0.2,
                      shadowOffset: { width: 2, height: 3 },
                      shadowRadius: 5,
                      elevation: 5,
                      overflow: 'visible',
                    }}
                  >
                    <View style={{
                      width: polaroidW - INSET * 2,
                      height: photoH,
                      overflow: 'hidden',
                      backgroundColor: '#E8E0D0',
                      borderRadius: 2,
                    }}>
                      {photo?.imageUrl ? (
                        <Image
                          source={{ uri: photo.imageUrl }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          blurRadius={photo.isDeveloping ? 24 : 0}
                        />
                      ) : (
                        <View style={s.empty}>
                          <Text style={{ fontSize: 18, color: 'rgba(0,0,0,0.13)' }}>+</Text>
                        </View>
                      )}
                      {/* Sepia wash + developing label */}
                      {photo?.isDeveloping && (
                        <>
                          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#C9A96E', opacity: 0.45 }} />
                          <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 8, color: '#2A1F0F', fontFamily: 'Inter_500Medium', letterSpacing: 0.8 }}>developing...</Text>
                          </View>
                        </>
                      )}
                      <CornerMounts />
                      <FilmGrainOverlay opacity={photo?.isDeveloping ? 0.16 : 0.07} />
                    </View>
                    <View style={{ height: stripH }} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={s.pageNum}>{page.pageNumber}</Text>

      <View style={[StyleSheet.absoluteFill, { zIndex: 20 }]} pointerEvents="box-none">
        {overlayItems.map((item) => (
          <DraggableOverlayItem
            key={item.id}
            item={item}
            pageWidth={width}
            pageHeight={containerH}
            onDragEnd={(id, px, py) => onItemMove?.(id, px, py)}
          />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  ch: { position: 'absolute', width: CA, height: CT, backgroundColor: CC },
  cv: { position: 'absolute', width: CT, height: CA, backgroundColor: CC },
  empty: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(180,160,120,0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNum: {
    position: 'absolute',
    bottom: 5, left: 0, right: 0,
    textAlign: 'center',
    fontSize: 10,
    color: 'rgba(0,0,0,0.18)',
    fontFamily: 'Inter_400Regular',
    zIndex: 2,
  },
});
