import { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@stores/auth.store';
import { useFriends } from '@hooks/useFriendships';
import { useDarkroom, useDeveloping } from '@hooks/useDevelopingQueue';
import { useRevealStore } from '@stores/reveal.store';
import { useMyDeskDrops } from '@hooks/useDeskDrops';
import { useMyPasses } from '@hooks/useCameraPass';
import { RevealCeremony } from '@/components/polaroid/RevealCeremony';
import { Avatar } from '@ui/Avatar';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@hooks/useTheme';
import { type TimeOfDay } from '@lib/theme';
import { Image } from 'expo-image';

// Small countdown label for still-developing letters
function IncomingCountdown({ developedAt }: { developedAt: string }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = new Date(developedAt).getTime() - Date.now();
      if (diff <= 0) { setLabel('ready'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [developedAt]);
  return (
    <View style={{ backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ fontSize: 11, color: '#6B5A48', fontFamily: 'Inter_500Medium' }}>{label}</Text>
    </View>
  );
}

const SKY_GRADIENTS: Record<TimeOfDay, readonly [string, string, string]> = {
  night: ['#06060E', '#0C0C20', '#1A1445'],
  dawn:  ['#1C1008', '#4A2810', '#8A5028'],
  day:   ['#1A3A5C', '#2E6090', '#4A8FBF'],  // light blue sky top → brighter blue
  dusk:  ['#10061A', '#3A1040', '#6A1858'],
};

const STARS = Array.from({ length: 40 }, (_, i) => ({
  x:       `${(Math.sin(i * 137.508) * 0.5 + 0.5) * 95}%`,
  y:       `${(Math.cos(i * 137.508) * 0.5 + 0.5) * 55}%`,
  size:    (Math.sin(i * 23.1) * 0.5 + 0.5) * 2 + 0.5,
  opacity: (Math.sin(i * 57.3) * 0.5 + 0.5) * 0.5 + 0.1,
}));

// ── Shared screen dimensions ─────────────────────────────────────────────────
const { width: _SW, height: _SH } = Dimensions.get('window');

// ── Dawn & dusk atmospheric glows ────────────────────────────────────────────

// Dawn: sun centred just above the horizon, warm amber light rising upward
const _DAWN_SX = _SW * 0.50;
const _DAWN_SY = _SH * 0.60;

// Layered halo: filled glows + thin ring outlines for a realistic 22°-style halo
// ring: true → renders as a border-only circle (the actual halo ring)
// ring: false → soft filled disc (glow/atmosphere)
const DAWN_HALOS: { r: number; color: string; blur: number; ring?: boolean; ringW?: number }[] = [
  // Far diffuse outer atmosphere
  { r: 190, color: 'rgba(255,115,30,0.04)',  blur: 0 },
  // Outer halo ring — thin, slightly violet outer edge (like real 22° halo)
  { r: 152, color: 'rgba(220,160,255,0.14)', blur: 0, ring: true, ringW: 1.5 },
  // Outer glow fill
  { r: 128, color: 'rgba(255,140,40,0.07)',  blur: 0 },
  // Second halo ring — warm orange-white
  { r: 96,  color: 'rgba(255,210,130,0.22)', blur: 0, ring: true, ringW: 2 },
  // Mid soft glow
  { r: 74,  color: 'rgba(255,185,70,0.13)',  blur: 0 },
  // Inner halo ring — richer orange, more defined
  { r: 56,  color: 'rgba(255,160,55,0.38)',  blur: 0, ring: true, ringW: 2.5 },
  // Inner glow corona
  { r: 36,  color: 'rgba(255,215,90,0.20)',  blur: 0 },
  // Sun core — bright, glowing
  { r: 18,  color: 'rgba(255,248,160,0.97)', blur: 22 },
];

function DawnGlow() {
  return (
    <>
      {/* Warm horizon gradient rising from bottom */}
      <LinearGradient
        colors={['rgba(255,160,60,0.30)', 'rgba(255,190,80,0.14)', 'transparent']}
        start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: _SH * 0.52 }}
        pointerEvents="none"
      />
      {/* Layered halo rings + glows */}
      {DAWN_HALOS.map((o, i) => (
        <View key={`d${i}`} pointerEvents="none" style={{
          position: 'absolute',
          left: _DAWN_SX - o.r,
          top:  _DAWN_SY - o.r,
          width: o.r * 2, height: o.r * 2, borderRadius: o.r,
          backgroundColor: o.ring ? 'transparent' : o.color,
          borderWidth:  o.ring ? (o.ringW ?? 2) : 0,
          borderColor:  o.ring ? o.color : undefined,
          shadowColor: o.color,
          shadowRadius: o.blur,
          shadowOpacity: o.blur > 0 ? 0.9 : 0,
          shadowOffset: { width: 0, height: 0 },
        }} />
      ))}
    </>
  );
}

// Dusk: sun setting at lower-right, intense warm glow + short flare trail
const _DUSK_SX = _SW * 0.74;
const _DUSK_SY = _SH * 0.52;
const _DUSK_DX = _SW * 0.5 - _DUSK_SX;
const _DUSK_DY = _SH * 0.42 - _DUSK_SY;

const DUSK_SUN_ORBS = [
  { r: 22,  color: 'rgba(255,185,60,0.95)',  blur: 24 },
  { r: 50,  color: 'rgba(255,120,35,0.22)',  blur: 0  },
  { r: 95,  color: 'rgba(255,70,30,0.12)',   blur: 0  },
  { r: 150, color: 'rgba(200,30,80,0.07)',   blur: 0  },
];

const DUSK_FLARES = [
  { t: 0.12, r: 8,  color: 'rgba(255,160,50,0.6)',  blur: 9  },
  { t: 0.22, r: 14, color: 'rgba(255,100,40,0.45)', blur: 14 },
  { t: 0.32, r: 6,  color: 'rgba(255,140,60,0.55)', blur: 6  },
  { t: 0.44, r: 18, color: 'rgba(220,60,100,0.35)', blur: 16 },
  { t: 0.55, r: 10, color: 'rgba(255,80,120,0.42)', blur: 10 },
  { t: 0.66, r: 7,  color: 'rgba(180,60,220,0.45)', blur: 7  },
  { t: 0.78, r: 14, color: 'rgba(120,60,255,0.32)', blur: 13 },
];

function DuskGlow() {
  return (
    <>
      {/* Warm horizon gradient */}
      <LinearGradient
        colors={['rgba(200,40,100,0.18)', 'rgba(255,90,40,0.14)', 'transparent']}
        start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: _SH * 0.48 }}
        pointerEvents="none"
      />
      {/* Setting sun disc + halos */}
      {DUSK_SUN_ORBS.map((o, i) => (
        <View key={`ds${i}`} pointerEvents="none" style={{
          position: 'absolute',
          left: _DUSK_SX - o.r, top: _DUSK_SY - o.r,
          width: o.r * 2, height: o.r * 2, borderRadius: o.r,
          backgroundColor: o.color,
          shadowColor: o.color,
          shadowRadius: o.blur,
          shadowOpacity: o.blur > 0 ? 0.9 : 0,
          shadowOffset: { width: 0, height: 0 },
        }} />
      ))}
      {/* Flare trail toward upper-left */}
      {DUSK_FLARES.map((s, i) => {
        const cx = _DUSK_SX + s.t * _DUSK_DX * 2;
        const cy = _DUSK_SY + s.t * _DUSK_DY * 2;
        return (
          <View key={`df${i}`} pointerEvents="none" style={{
            position: 'absolute',
            left: cx - s.r, top: cy - s.r,
            width: s.r * 2, height: s.r * 2, borderRadius: s.r,
            backgroundColor: s.color,
            shadowColor: s.color,
            shadowRadius: s.blur,
            shadowOpacity: 0.9,
            shadowOffset: { width: 0, height: 0 },
          }} />
        );
      })}
    </>
  );
}

// ── Lens flare (day only) ─────────────────────────────────────────────────────
// Sun sits at upper-right; flare orbs trail diagonally toward lower-left,
// shifting from warm yellow → cool blue/purple as they move away from source.
const _SX = _SW * 0.78;          // sun X
const _SY = _SH * 0.11;          // sun Y
const _DX = _SW * 0.50 - _SX;    // vector from sun toward screen centre
const _DY = _SH * 0.42 - _SY;

const FLARE_SPOTS = [
  // Sun core + corona halos
  { t: 0,    r: 26, color: 'rgba(255,248,150,0.95)', blur: 28 },
  { t: 0,    r: 52, color: 'rgba(255,235,100,0.14)', blur: 0  },
  { t: 0,    r: 88, color: 'rgba(255,220,80,0.06)',  blur: 0  },
  // Warm near-sun orbs
  { t: 0.09, r: 9,  color: 'rgba(255,215,70,0.65)',  blur: 10 },
  { t: 0.18, r: 16, color: 'rgba(255,175,55,0.48)',  blur: 15 },
  { t: 0.26, r: 6,  color: 'rgba(255,200,90,0.6)',   blur: 7  },
  // Mid orbs — transitioning orange
  { t: 0.36, r: 20, color: 'rgba(255,140,45,0.32)',  blur: 18 },
  { t: 0.46, r: 5,  color: 'rgba(255,195,75,0.55)',  blur: 5  },
  { t: 0.54, r: 13, color: 'rgba(255,255,170,0.3)',  blur: 13 },
  // Cool far orbs — blue / violet
  { t: 0.64, r: 13, color: 'rgba(120,195,255,0.42)', blur: 12 },
  { t: 0.73, r: 8,  color: 'rgba(155,115,255,0.48)', blur: 8  },
  { t: 0.83, r: 18, color: 'rgba(75,165,255,0.30)',  blur: 16 },
  { t: 0.91, r: 5,  color: 'rgba(195,95,255,0.45)',  blur: 5  },
];

function LensFlare() {
  return (
    <>
      {FLARE_SPOTS.map((s, i) => {
        const cx = _SX + s.t * _DX * 2;
        const cy = _SY + s.t * _DY * 2;
        return (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: cx - s.r,
              top:  cy - s.r,
              width:  s.r * 2,
              height: s.r * 2,
              borderRadius: s.r,
              backgroundColor: s.color,
              shadowColor: s.color,
              shadowRadius: s.blur,
              shadowOpacity: s.blur > 0 ? 0.9 : 0,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        );
      })}
    </>
  );
}

// ── Photo-booth strip icon ────────────────────────────────────────────────────
// Four stacked frames on black film stock, just like the real thing.
const STRIP_COLORS = ['#786860', '#607868', '#706080', '#786050'] as const;

function PhotoBoothStrip() {
  return (
    <View style={strip.outer}>
      {/* sprocket holes down each side */}
      <View style={[strip.sprockets, { left: 1.5 }]}>
        {[0,1,2,3,4,5].map(i => <View key={i} style={strip.hole} />)}
      </View>
      <View style={{ gap: 2, flex: 1, paddingVertical: 3 }}>
        {STRIP_COLORS.map((c, i) => (
          <View key={i} style={[strip.frame, { backgroundColor: c }]} />
        ))}
      </View>
      <View style={[strip.sprockets, { right: 1.5 }]}>
        {[0,1,2,3,4,5].map(i => <View key={i} style={strip.hole} />)}
      </View>
    </View>
  );
}

const strip = StyleSheet.create({
  outer: {
    width: 42, height: 80,
    backgroundColor: '#080808',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 6,
  },
  sprockets: {
    position: 'absolute', top: 0, bottom: 0,
    width: 7, justifyContent: 'space-evenly', alignItems: 'center',
    zIndex: 1,
  },
  hole: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  frame: {
    height: 16, borderRadius: 1, marginHorizontal: 8, opacity: 0.85,
  },
});

// ── Minimalist lock icon ─────────────────────────────────────────────────────
function CapsuleIcon({ color, dimColor }: { color: string; dimColor: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 72 }}>
      {/* Shackle — thin U arch */}
      <View style={{
        width: 20, height: 12,
        borderTopLeftRadius: 10, borderTopRightRadius: 10,
        borderWidth: 2, borderColor: color,
        borderBottomWidth: 0,
        marginBottom: -1,
      }} />
      {/* Body — clean rectangle */}
      <View style={{
        width: 28, height: 20,
        borderRadius: 5,
        backgroundColor: dimColor,
        borderWidth: 1.5, borderColor: color,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Single dot keyhole */}
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color, opacity: 0.7 }} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const theme  = useTheme();
  const { friends }   = useFriends();
  const { darkroom }  = useDarkroom();
  const { developing } = useDeveloping();
  const ceremonyPost  = useRevealStore((s) => s.ceremonyPost);
  const userId        = useAuthStore((s) => s.session?.user.id);
  const qc            = useQueryClient();
  const { drops }     = useMyDeskDrops();
  const { passes }    = useMyPasses();

  const hasActivity  = darkroom.length + developing.length > 0;
  const myTurnPasses = passes.filter((p) => p.currentHolderId === userId && !p.isComplete);

  const handleRefresh = () => {
    if (userId) qc.invalidateQueries({ queryKey: ['incoming-posts', userId] });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* ── Time-of-day sky ──────────────────────────────────────────────── */}
      <LinearGradient
        colors={SKY_GRADIENTS[theme.timeOfDay]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {theme.timeOfDay === 'dawn' && <DawnGlow />}
      {theme.timeOfDay === 'dusk' && <DuskGlow />}
      {theme.timeOfDay === 'day'  && <LensFlare />}

      {/* Stars — night only */}
      {theme.timeOfDay === 'night' && STARS.map((star, i) => (
        <MotiView
          key={i}
          from={{ opacity: 0 }}
          animate={{ opacity: star.opacity }}
          transition={{ type: 'timing', duration: 1000, delay: i * 40 }}
          style={{
            position: 'absolute',
            left: star.x as any,
            top:  star.y as any,
            width: star.size, height: star.size,
            borderRadius: star.size,
            backgroundColor: '#C8C8E0',
          }}
        />
      ))}


      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={theme.accent} />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 22, color: theme.text, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
            your block
          </Text>
          <MotiView
            from={{ opacity: 0.4 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ type: 'timing', duration: 2000, loop: true }}
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.success }}
          />
        </View>

        {/* Incoming polaroids — letter cards with blurred photos */}
        <AnimatePresence>
          {hasActivity && (
            <MotiView
              key="queue"
              from={{ opacity: 0, translateY: -8 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -8 }}
              transition={{ type: 'spring', damping: 22, stiffness: 200 }}
              style={{ paddingHorizontal: 20, marginBottom: 20 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>
                  incoming
                </Text>
                <Pressable onPress={() => router.navigate('/(tabs)/memories')}>
                  <Text style={{ fontSize: 12, color: theme.accent, fontFamily: 'Inter_500Medium' }}>see all</Text>
                </Pressable>
              </View>

              {[...darkroom.map((p) => ({ post: p, ready: true })), ...developing.map((p) => ({ post: p, ready: false }))].map(({ post, ready }, i) => (
                <MotiView
                  key={post.postId}
                  from={{ opacity: 0, translateY: 6 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: i * 60, type: 'spring', damping: 22 }}
                  style={{ marginBottom: 10 }}
                >
                  <Pressable
                    onPress={() => {
                      if (!ready) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      useRevealStore.getState().openCeremony(post);
                    }}
                  >
                    <View style={{ backgroundColor: '#F5F0E6', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}>
                      {/* Envelope flap */}
                      <View style={{ height: 24, backgroundColor: '#EDE8DC', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
                        <View style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderLeftWidth: 0, borderRightWidth: 90, borderBottomWidth: 24, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#EDE8DC' }} />
                        <View style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderRightWidth: 0, borderLeftWidth: 90, borderBottomWidth: 24, borderRightColor: 'transparent', borderLeftColor: 'transparent', borderBottomColor: '#EDE8DC' }} />
                        <View style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.05)' }} />
                      </View>

                      {/* Body */}
                      <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {/* Blurred photo thumbnail */}
                        <View style={{ width: 54, height: 54, borderRadius: 6, overflow: 'hidden', backgroundColor: '#C5B89A' }}>
                          {(post.thumbnailUrl || post.imageUrl) ? (
                            <Image
                              source={{ uri: post.thumbnailUrl ?? post.imageUrl }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                              blurRadius={ready ? 6 : 26}
                            />
                          ) : (
                            <View style={{ flex: 1, backgroundColor: '#C5B89A' }} />
                          )}
                          {!ready && (
                            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#C9A96E', opacity: 0.4 }} />
                          )}
                          {ready && (
                            <MotiView
                              from={{ opacity: 0 }} animate={{ opacity: [0, 0.35, 0] }}
                              transition={{ type: 'timing', duration: 1800, loop: true }}
                              style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.accent }}
                            />
                          )}
                        </View>

                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={{ fontSize: 14, color: '#1A1208', fontFamily: 'Inter_600SemiBold' }}>
                            {post.senderDisplayName ?? post.senderUsername}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6B5A48', fontFamily: 'Inter_400Regular' }}>
                            {ready ? 'polaroid ready to open' : 'still developing...'}
                          </Text>
                        </View>

                        {ready ? (
                          <View style={{ backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                            <Text style={{ fontSize: 12, color: theme.accentLight, fontFamily: 'Inter_600SemiBold' }}>open</Text>
                          </View>
                        ) : (
                          <IncomingCountdown developedAt={post.developedAt} />
                        )}
                      </View>
                    </View>
                  </Pressable>
                </MotiView>
              ))}
            </MotiView>
          )}
        </AnimatePresence>

        {/* Desk drops */}
        <AnimatePresence>
          {drops.length > 0 && (
            <MotiView
              key="drops"
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 200 }}
              style={{ paddingHorizontal: 20, marginBottom: 20 }}
            >
              <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                on your desk
              </Text>
              {drops.map((drop, i) => (
                <MotiView
                  key={drop.id}
                  from={{ opacity: 0, translateY: 6 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: i * 70, type: 'spring', damping: 22, stiffness: 200 }}
                  style={{ marginBottom: 10 }}
                >
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/drop/${drop.id}`); }}
                  >
                    {/* Envelope card */}
                    <View style={{ backgroundColor: '#F5F0E6', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}>
                      {/* Envelope flap (V shape via border trick) */}
                      <View style={{ height: 28, backgroundColor: '#EDE8DC', alignItems: 'center', justifyContent: 'flex-start', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
                        {/* V fold lines */}
                        <View style={{ width: '100%', height: 28, overflow: 'hidden' }}>
                          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28 }}>
                            {/* Left flap half */}
                            <View style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderLeftWidth: 0, borderRightWidth: 90, borderBottomWidth: 28, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#EDE8DC' }} />
                            {/* Right flap half */}
                            <View style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderRightWidth: 0, borderLeftWidth: 90, borderBottomWidth: 28, borderRightColor: 'transparent', borderLeftColor: 'transparent', borderBottomColor: '#EDE8DC' }} />
                            {/* Divider line down middle */}
                            <View style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: 28, backgroundColor: 'rgba(0,0,0,0.06)' }} />
                          </View>
                        </View>
                      </View>

                      {/* Envelope body */}
                      <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {/* Sender avatar */}
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.accentDim, borderWidth: 1.5, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 20 }}>{drop.sender?.avatar_emoji ?? '🌙'}</Text>
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontSize: 14, color: '#1A1208', fontFamily: 'Inter_600SemiBold' }}>
                            {drop.sender?.display_name ?? drop.sender?.username ?? '...'}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6B5A48', fontFamily: 'Inter_400Regular' }}>
                            {drop.note ? `"${drop.note}"` : 'sent you something'}
                          </Text>
                        </View>

                        {/* Pulsing seal dot */}
                        <MotiView
                          from={{ scale: 0.8, opacity: 0.6 }}
                          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.6, 1, 0.6] }}
                          transition={{ type: 'timing', duration: 1600, loop: true }}
                          style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent }}
                        />
                      </View>

                      {/* Bottom strip */}
                      <View style={{ paddingHorizontal: 14, paddingBottom: 12, alignItems: 'flex-end' }}>
                        <View style={{ backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 }}>
                          <Text style={{ fontSize: 12, color: theme.accentLight, fontFamily: 'Inter_600SemiBold' }}>open letter</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </MotiView>
              ))}
            </MotiView>
          )}
        </AnimatePresence>

        {/* Pass alerts */}
        <AnimatePresence>
          {myTurnPasses.length > 0 && (
            <MotiView
              key="passes"
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 200 }}
              style={{ paddingHorizontal: 20, marginBottom: 20 }}
            >
              <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                camera's in your hands
              </Text>
              {myTurnPasses.map((pass, i) => (
                <MotiView key={pass.id} from={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 60, type: 'spring', damping: 22, stiffness: 200 }} style={{ marginBottom: 8 }}>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/pass/${pass.id}`); }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1.5, borderColor: theme.borderActive, padding: 14, gap: 12 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 22 }}>📷</Text>
                      <View style={{ gap: 2 }}>
                        <Text style={{ fontSize: 14, color: theme.text, fontFamily: 'Inter_600SemiBold' }}>{pass.title ?? 'camera pass'}</Text>
                        <Text style={{ fontSize: 12, color: theme.accentLight, fontFamily: 'Inter_400Regular' }}>it's your turn to shoot</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, color: theme.accent, fontFamily: 'Inter_600SemiBold' }}>take it ›</Text>
                  </Pressable>
                </MotiView>
              ))}
            </MotiView>
          )}
        </AnimatePresence>

        {/* Your people */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>your people</Text>
            {friends.length > 0 && (
              <Pressable onPress={() => router.push('/friends')}>
                <Text style={{ fontSize: 12, color: theme.accent, fontFamily: 'Inter_500Medium' }}>see all</Text>
              </Pressable>
            )}
          </View>
          {friends.length === 0 ? (
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 400 }}
              style={{ backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 24, alignItems: 'center', gap: 12 }}
            >
              <Text style={{ fontSize: 32 }}>📷</Text>
              <Text style={{ fontSize: 15, color: theme.textSub, fontFamily: 'Inter_500Medium', textAlign: 'center' }}>no one here yet</Text>
              <Text style={{ fontSize: 13, color: theme.textDim, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 }}>
                invite your first friends to{'\n'}start sharing polaroids
              </Text>
              <Pressable onPress={() => { Haptics.selectionAsync(); router.push('/friends'); }}
                style={{ marginTop: 4, backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.border, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10 }}
              >
                <Text style={{ fontSize: 13, color: theme.accentLight, fontFamily: 'Inter_600SemiBold' }}>invite a friend</Text>
              </Pressable>
            </MotiView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 6 }}>
              {friends.slice(0, 8).map((friend, i) => {
                const tilt = ((i % 5) - 2) * 1.4;
                const name = friend.displayName ?? friend.username;
                return (
                  <MotiView key={friend.friendId} from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 200, delay: i * 50 }}>
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/board/user/[userId]', params: { userId: friend.friendId, name } } as any); }}
                      style={{ transform: [{ rotate: `${tilt}deg` }] }}
                    >
                      <View style={{
                        width: 72, backgroundColor: '#F5F0E8',
                        padding: 5, paddingBottom: 0, borderRadius: 3,
                        shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 1, height: 3 }, shadowRadius: 6, elevation: 4,
                      }}>
                        <View style={{ width: 62, height: 62, backgroundColor: '#E0D8CC', overflow: 'hidden', borderRadius: 1 }}>
                          {friend.avatarUrl ? (
                            <Image source={{ uri: friend.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 28 }}>{friend.avatarEmoji ?? '🌙'}</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ height: 24, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 9, color: '#2A1F0F', fontFamily: 'Inter_400Regular', fontStyle: 'italic' }} numberOfLines={1}>
                            {name}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </MotiView>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Start something — photo booth + time capsule */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            start something
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>

            {/* Photo booth — looks like an actual film strip */}
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push('/roll/new'); }}
              style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.border, paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center', gap: 10 }}
            >
              <PhotoBoothStrip />
              <Text style={{ fontSize: 12, color: theme.textSub, fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>
                photo booth
              </Text>
            </Pressable>

            {/* Time capsule — minimalist capsule */}
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push('/capsule/new'); }}
              style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.border, paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center', gap: 10 }}
            >
              <View style={{ height: 80, justifyContent: 'center' }}>
                <CapsuleIcon color={theme.accent} dimColor={theme.accentDim} />
              </View>
              <Text style={{ fontSize: 12, color: theme.textSub, fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>
                time capsule
              </Text>
            </Pressable>

          </View>
        </View>
      </ScrollView>

      <AnimatePresence>
        {ceremonyPost && <RevealCeremony key="ceremony" />}
      </AnimatePresence>
    </View>
  );
}
