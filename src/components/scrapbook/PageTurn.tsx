import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  runOnJS, interpolate, Extrapolation, Easing,
} from 'react-native-reanimated';
import { ScrapbookPageView } from './ScrapbookPage';
import type { ScrapbookPage } from '@types/models';

interface PageTurnProps {
  pages: ScrapbookPage[];
  currentPage: number;
  onPageChange: (page: number) => void;
  onSlotPress?: (pageId: string, slotIndex: number) => void;
  onItemMove?: (pageId: string, itemId: string, posX: number, posY: number) => void;
  bgColor?: string;
  photoRows?: 2 | 3;
}

const { width: SW } = Dimensions.get('window');
// Full phone width — no horizontal margin so the cream page fills edge-to-edge
export const PAGE_WIDTH = Math.min(SW, 430);

export function PageTurn({
  pages,
  currentPage,
  onPageChange,
  onSlotPress,
  onItemMove,
  bgColor,
  photoRows,
}: PageTurnProps) {
  const [frontIdx, setFrontIdx] = useState(currentPage);
  const [behindIdx, setBehindIdx] = useState<number | null>(null);
  const flippingRef = useRef(false);
  const prevPageRef = useRef(currentPage);

  const rotateY       = useSharedValue(0);
  const isFlipping    = useSharedValue(false);
  const goingForward  = useSharedValue(true);
  // isPhase2: new page settling flat — suppress peel effects so it doesn't
  // look like a second page turning
  const isPhase2      = useSharedValue(false);
  const currentPageSV = useSharedValue(currentPage);
  const pageCountSV   = useSharedValue(pages.length);
  const gestureHasDir = useSharedValue(false);
  const gestureFwd    = useSharedValue(true);

  useEffect(() => { currentPageSV.value = currentPage; }, [currentPage]);
  useEffect(() => { pageCountSV.value = pages.length; },  [pages.length]);

  const setBehindJS     = useCallback((i: number | null) => setBehindIdx(i), []);
  const setFrontJS      = useCallback((i: number)        => setFrontIdx(i),  []);
  const setFlippingDone = useCallback(() => { flippingRef.current = false; }, []);

  useEffect(() => {
    if (currentPage === prevPageRef.current) return;
    const from = prevPageRef.current;
    prevPageRef.current = currentPage;
    const to = currentPage;

    if (flippingRef.current) {
      rotateY.value = 0;
      isFlipping.value = false;
      isPhase2.value = false;
      flippingRef.current = false;
      setFrontIdx(to);
      setBehindIdx(null);
      return;
    }

    const goFwd = to > from;
    goingForward.value = goFwd;
    flippingRef.current = true;
    isFlipping.value = true;
    isPhase2.value = false;
    setBehindIdx(to);

    // Positive rotation = right side comes TOWARD viewer (real book behaviour).
    // unfoldStart matches foldTarget so Phase 2 continues the same arc — no reversal.
    const foldTarget  = goFwd ?  90 : -90;
    const unfoldStart = goFwd ?  90 : -90;

    // Phase 1 — page peels off. Dramatic 3D with paper bow + crease shadow.
    rotateY.value = withTiming(
      foldTarget,
      { duration: 280, easing: Easing.in(Easing.quad) },
      (ok) => {
        'worklet';
        if (!ok) {
          isFlipping.value = false;
          isPhase2.value = false;
          runOnJS(setBehindJS)(null);
          runOnJS(setFlippingDone)();
          return;
        }
        runOnJS(setFrontJS)(to);
        isPhase2.value = true;
        rotateY.value = unfoldStart;
        // Phase 2 — new page drops flat. No bow, no crease — just lands.
        rotateY.value = withTiming(
          0,
          { duration: 160, easing: Easing.out(Easing.quad) },
          () => {
            'worklet';
            isFlipping.value = false;
            isPhase2.value = false;
            runOnJS(setBehindJS)(null);
            runOnJS(setFlippingDone)();
          },
        );
      },
    );
  }, [currentPage]);

  const handleFlipTo = useCallback((idx: number) => onPageChange(idx), [onPageChange]);

  const gesture = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      if (isFlipping.value) return;
      // Only respond to left-swipe (forward). Right-swipe: snap back and ignore.
      if (e.translationX >= 0) {
        if (gestureHasDir.value) {
          gestureHasDir.value = false;
          runOnJS(setBehindJS)(null);
          rotateY.value = 0;
        }
        return;
      }
      goingForward.value = true;

      if (!gestureHasDir.value) {
        gestureHasDir.value = true;
        gestureFwd.value = true;
        const canGo = currentPageSV.value < pageCountSV.value - 1;
        runOnJS(setBehindJS)(canGo ? currentPageSV.value + 1 : null);
      }

      rotateY.value = interpolate(
        e.translationX,
        [-PAGE_WIDTH * 0.65, 0],
        [82, 0],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((e) => {
      if (isFlipping.value) return;
      gestureHasDir.value = false;
      const threshold = PAGE_WIDTH * 0.22;
      if (e.translationX < -threshold && currentPageSV.value < pageCountSV.value - 1) {
        runOnJS(handleFlipTo)(currentPageSV.value + 1);
      } else {
        runOnJS(setBehindJS)(null);
        rotateY.value = withSpring(0, { damping: 20, stiffness: 200, mass: 0.5 });
      }
    });

  const H = PAGE_WIDTH / 2;

  // Front page transform.
  // perspective: 460 — aggressive depth so the far edge shrinks noticeably,
  // giving the illusion of a curved, flexible page rather than a flat board.
  // rotateX: paper bow (only Phase 1 — Phase 2 is a clean flat drop).
  const frontStyle = useAnimatedStyle(() => {
    const absRot = Math.abs(rotateY.value);
    const pivot  = goingForward.value ? H : -H;
    const lift   = isPhase2.value
      ? 0
      : interpolate(absRot, [0, 45, 90], [0, 3.8, 0], Extrapolation.CLAMP);
    return {
      transform: [
        { perspective: 460 },
        { rotateX: `${lift}deg` },
        { translateX: pivot },
        { rotateY: `${rotateY.value}deg` },
        { translateX: -pivot },
      ],
      opacity: interpolate(absRot, [80, 90], [1, 0], Extrapolation.CLAMP),
      zIndex: 2,
    };
  });

  // Fold-crease gradient — only during Phase 1 peel
  const creaseLeftStyle = useAnimatedStyle(() => {
    const absRot = Math.abs(rotateY.value);
    return {
      position: 'absolute' as const,
      top: 0, bottom: 0, left: 0, width: 80,
      opacity: (!isPhase2.value && goingForward.value)
        ? interpolate(absRot, [0, 40, 80], [0, 0.6, 0], Extrapolation.CLAMP)
        : 0,
    };
  });
  const creaseRightStyle = useAnimatedStyle(() => {
    const absRot = Math.abs(rotateY.value);
    return {
      position: 'absolute' as const,
      top: 0, bottom: 0, right: 0, width: 80,
      opacity: (!isPhase2.value && !goingForward.value)
        ? interpolate(absRot, [0, 40, 80], [0, 0.6, 0], Extrapolation.CLAMP)
        : 0,
    };
  });

  // Behind page — scales into view as front peels. Static during Phase 2.
  const behindStyle = useAnimatedStyle(() => {
    const absRot = Math.abs(rotateY.value);
    if (isPhase2.value) return { transform: [{ scale: 1 }], opacity: 1, zIndex: 1 };
    return {
      transform: [{ scale: interpolate(absRot, [0, 90], [0.97, 1.0], Extrapolation.CLAMP) }],
      opacity:   interpolate(absRot, [0, 15, 90], [0.65, 0.85, 1],    Extrapolation.CLAMP),
      zIndex: 1,
    };
  });

  // Cast shadow from turning page onto behind page — only Phase 1
  const behindShadowLeftStyle = useAnimatedStyle(() => {
    const absRot = Math.abs(rotateY.value);
    return {
      position: 'absolute' as const,
      top: 0, bottom: 0, left: 0, width: '55%',
      opacity: (!isPhase2.value && goingForward.value)
        ? interpolate(absRot, [0, 45, 90], [0, 0.4, 0], Extrapolation.CLAMP)
        : 0,
    };
  });
  const behindShadowRightStyle = useAnimatedStyle(() => {
    const absRot = Math.abs(rotateY.value);
    return {
      position: 'absolute' as const,
      top: 0, bottom: 0, right: 0, width: '55%',
      opacity: (!isPhase2.value && !goingForward.value)
        ? interpolate(absRot, [0, 45, 90], [0, 0.4, 0], Extrapolation.CLAMP)
        : 0,
    };
  });

  const frontPage  = pages[frontIdx]  ?? pages[currentPage];
  const behindPage = behindIdx !== null ? (pages[behindIdx] ?? null) : null;
  if (!frontPage) return null;

  const renderPage = (page: ScrapbookPage, idx: number) => (
    <ScrapbookPageView
      page={page}
      pageIndex={idx}
      width={PAGE_WIDTH}
      bgColor={bgColor}
      photoRows={photoRows}
      onSlotPress={onSlotPress ? (si)          => onSlotPress(page.id, si)         : undefined}
      onItemMove ={onItemMove  ? (iid, px, py) => onItemMove(page.id, iid, px, py) : undefined}
    />
  );

  return (
    // flex:1 — fills the full available area between top bar and toolbar.
    // No centering, no fixed height, no dark space.
    <View style={{ flex: 1, alignItems: 'center', overflow: 'visible' }}>
      <View style={{ flex: 1, width: PAGE_WIDTH, overflow: 'visible' }}>

        {/* Behind — next page peeking as front peels off */}
        {behindPage && (
          <Animated.View style={[StyleSheet.absoluteFill, behindStyle]}>
            {renderPage(behindPage, behindIdx!)}
            <Animated.View style={behindShadowLeftStyle} pointerEvents="none">
              <LinearGradient
                colors={['rgba(0,0,0,0.38)', 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Animated.View style={behindShadowRightStyle} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.38)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </Animated.View>
        )}

        {/* Front — peels off then new page drops flat */}
        <GestureDetector gesture={gesture}>
          <Animated.View style={[StyleSheet.absoluteFill, frontStyle, {
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: -4, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
          }]}>
            {renderPage(frontPage, frontIdx)}
            <Animated.View style={creaseLeftStyle} pointerEvents="none">
              <LinearGradient
                colors={['rgba(0,0,0,0.55)', 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Animated.View style={creaseRightStyle} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}
