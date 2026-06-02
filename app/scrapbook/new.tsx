import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, FlatList, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';
import { useCreateScrapbook } from '@hooks/useScrapbooks';
import { useFriends } from '@hooks/useFriendships';
import type { FriendSummary } from '@types/models';

// ─── Spine colours — photo booth palette (10 colours, near-duplicates removed) ─
const SPINE_COLORS: [string, string, string][] = [
  ['#FFF4B0', '#C8B840', '#5A4A00'], // lemon
  ['#C8EEC0', '#70A868', '#1E5A18'], // sage
  ['#FFD0E4', '#C87898', '#7A1848'], // blush
  ['#C8785A', '#7A3820', '#FFE0C8'], // terracotta
  ['#9078B8', '#4A3878', '#EEE0FF'], // lavender
  ['#C87890', '#7A3850', '#FFE0F0'], // rose
  ['#C8A060', '#7A5820', '#FFF0C8'], // amber
  ['#1E2A4A', '#0A1228', '#90B8F0'], // navy
  ['#2A1A3A', '#100A18', '#C8A0F0'], // violet
  ['#1A3028', '#081810', '#78C898'], // forest
];

const SW = 42;
const SH = 122;

function SpineCard({ idx, selected, label, onPress }: {
  idx: number; selected: boolean; label?: string; onPress: () => void;
}) {
  const [main, dark, textCol] = SPINE_COLORS[idx];
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', paddingHorizontal: 5, paddingTop: 10, paddingBottom: 4 }}>
      <MotiView
        animate={{ scale: selected ? 1.12 : 1, translateY: selected ? -8 : 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 280 }}
      >
        <View style={{
          width: SW, height: SH, backgroundColor: main, borderRadius: 3, overflow: 'hidden',
          borderWidth: selected ? 2.5 : 0, borderColor: '#FFF',
          shadowColor: selected ? main : '#000',
          shadowOpacity: selected ? 0.65 : 0.2,
          shadowRadius: selected ? 12 : 3,
          shadowOffset: { width: 0, height: selected ? 8 : 2 },
          elevation: selected ? 12 : 2,
        }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: dark }} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, backgroundColor: dark }} />
          <View style={{ position: 'absolute', top: Math.round(SH * 0.4), left: 0, right: 0, height: 3, backgroundColor: dark }} />
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: 'rgba(0,0,0,0.35)' }} />
          {label ? (
            <View style={{
              position: 'absolute',
              width: SH - 18, height: SW - 8,
              left: (SW - (SH - 18)) / 2,
              top: (SH - (SW - 8)) / 2,
              transform: [{ rotate: '90deg' }],
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text numberOfLines={1} style={{ fontSize: 7.5, fontFamily: 'Inter_700Bold', color: textCol, letterSpacing: 0.8, textTransform: 'uppercase', width: SH - 18, textAlign: 'center' }}>
                {label}
              </Text>
            </View>
          ) : null}
        </View>
      </MotiView>
      {selected && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#A99BFF', marginTop: 6 }} />}
    </Pressable>
  );
}

type Mode = 'open' | 'daily';
const DAILY_LIMITS = [1, 2, 3, 5];

export default function NewScrapbookScreen() {
  const insets = useSafeAreaInsets();
  const { mutateAsync: createScrapbook, isPending } = useCreateScrapbook();
  const { friends } = useFriends();

  const [colorIdx, setColorIdx] = useState(2);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [mode, setMode] = useState<Mode>('open');
  const [dailyLimit, setDailyLimit] = useState(3);
  const [durationDays, setDurationDays] = useState(14);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);

  const toggleFriend = (id: string) => {
    Haptics.selectionAsync();
    setSelectedFriendIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };

  const handleCreate = async () => {
    if (!title.trim() || isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const meta = JSON.stringify({
        text: desc.trim() || null,
        colorIdx,
        mode,
        ...(mode === 'daily' ? { dailyLimit, durationDays } : {}),
      });
      const id = await createScrapbook({
        title: title.trim(),
        coverEmoji: '📒',
        description: meta,
        memberIds: selectedFriendIds,
      });
      router.replace(`/scrapbook/${id}` as any);
    } catch (err: any) {
      Alert.alert('Could not create scrapbook', err?.message ?? 'Check your connection and try again.');
    }
  };

  const canCreate = title.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#08080F' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        >
          {/* Header */}
          <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <Pressable onPress={() => router.back()}>
              <Text style={{ fontSize: 15, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>←</Text>
            </Pressable>
            <Text style={{ fontSize: 20, color: '#EEEEF8', fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>new scrapbook</Text>
          </View>

          {/* ── Spine colour carousel ───────────────────────────────────── */}
          <View style={{ marginBottom: 30 }}>
            <Text style={[lbl, { paddingHorizontal: 20, marginBottom: 4 }]}>spine colour</Text>
            <FlatList
              data={SPINE_COLORS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ paddingHorizontal: 14, alignItems: 'flex-end' }}
              renderItem={({ index }) => (
                <SpineCard
                  idx={index}
                  selected={colorIdx === index}
                  label={title || undefined}
                  onPress={() => { Haptics.selectionAsync(); setColorIdx(index); }}
                />
              )}
            />
          </View>

          {/* ── Title & description ─────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, gap: 14, marginBottom: 28 }}>
            <View style={{ gap: 8 }}>
              <Text style={lbl}>title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="name your book…"
                placeholderTextColor="#3D3D5E"
                maxLength={40}
                style={inp}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={lbl}>description <Text style={{ color: '#3D3D5E', textTransform: 'none', letterSpacing: 0 }}>(optional)</Text></Text>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="what's this book about…"
                placeholderTextColor="#3D3D5E"
                multiline
                maxLength={160}
                style={[inp, { height: 80, textAlignVertical: 'top', paddingTop: 14 }]}
              />
            </View>
          </View>

          {/* ── Type ────────────────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <Text style={[lbl, { marginBottom: 12 }]}>type</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {([
                ['open',  'open scrapbook',   'add anything, anytime'],
                ['daily', 'daily polaroid',    'cam only · set a daily limit'],
              ] as [Mode, string, string][]).map(([m, heading, sub]) => (
                <Pressable
                  key={m}
                  onPress={() => { Haptics.selectionAsync(); setMode(m); }}
                  style={{
                    flex: 1, borderRadius: 16, padding: 16, gap: 5,
                    backgroundColor: mode === m ? '#1A1240' : '#12121C',
                    borderWidth: 1.5, borderColor: mode === m ? '#6B52E0' : '#2E2E48',
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: mode === m ? '#A99BFF' : '#EEEEF8' }}>{heading}</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#5A5A7A', lineHeight: 16 }}>{sub}</Text>
                </Pressable>
              ))}
            </View>

            <AnimatePresence>
              {mode === 'daily' && (
                <MotiView
                  key="daily-opts"
                  from={{ opacity: 0, translateY: -8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: -8 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 240 }}
                  style={{ marginTop: 18, gap: 18 }}
                >
                  <View style={{ gap: 10 }}>
                    <Text style={lbl}>photos per day</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {DAILY_LIMITS.map((n) => (
                        <Pressable
                          key={n}
                          onPress={() => { Haptics.selectionAsync(); setDailyLimit(n); }}
                          style={{
                            width: 54, height: 54, borderRadius: 27,
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: dailyLimit === n ? '#1A1240' : '#12121C',
                            borderWidth: 1.5, borderColor: dailyLimit === n ? '#6B52E0' : '#2E2E48',
                          }}
                        >
                          <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: dailyLimit === n ? '#A99BFF' : '#5A5A7A' }}>{n}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={{ gap: 10 }}>
                    <Text style={lbl}>duration</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0, backgroundColor: '#12121C', borderRadius: 16, borderWidth: 1.5, borderColor: '#2E2E48', alignSelf: 'flex-start' }}>
                      <Pressable
                        onPress={() => { Haptics.selectionAsync(); setDurationDays((d) => Math.max(1, d - 1)); }}
                        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 22, color: '#A99BFF', fontFamily: 'Inter_400Regular' }}>−</Text>
                      </Pressable>
                      <View style={{ minWidth: 72, alignItems: 'center' }}>
                        <Text style={{ fontSize: 17, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>{durationDays}</Text>
                        <Text style={{ fontSize: 10, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>days</Text>
                      </View>
                      <Pressable
                        onPress={() => { Haptics.selectionAsync(); setDurationDays((d) => Math.min(30, d + 1)); }}
                        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 22, color: '#A99BFF', fontFamily: 'Inter_400Regular' }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </MotiView>
              )}
            </AnimatePresence>
          </View>

          {/* ── Friends ─────────────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
            <Text style={[lbl, { marginBottom: 12 }]}>
              add a friend <Text style={{ color: '#3D3D5E', textTransform: 'none', letterSpacing: 0 }}>(optional)</Text>
            </Text>

            {selectedFriendIds.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {selectedFriendIds.map((fid) => {
                  const f = friends.find((x) => x.friendId === fid);
                  if (!f) return null;
                  return (
                    <Pressable key={fid} onPress={() => toggleFriend(fid)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A1240', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#3A2E70' }}>
                      <Text style={{ fontSize: 14 }}>{f.avatarEmoji ?? '🌙'}</Text>
                      <Text style={{ fontSize: 12, color: '#A99BFF', fontFamily: 'Inter_500Medium' }}>{f.displayName ?? f.username}</Text>
                      <Text style={{ fontSize: 10, color: '#5A5A7A' }}>✕</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              onPress={() => { Haptics.selectionAsync(); setFriendPickerOpen((v) => !v); }}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: pressed ? '#1A1A2E' : '#12121C',
                borderRadius: 14, borderWidth: 1, borderColor: '#2E2E48',
                paddingHorizontal: 16, paddingVertical: 13,
              })}
            >
              <Text style={{ fontSize: 16, color: '#5A5A7A' }}>{friendPickerOpen ? '−' : '+'}</Text>
              <Text style={{ fontSize: 14, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
                {friendPickerOpen ? 'hide' : 'invite someone'}
              </Text>
            </Pressable>

            <AnimatePresence>
              {friendPickerOpen && (
                <MotiView
                  key="picker"
                  from={{ opacity: 0, translateY: -6 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: -6 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 240 }}
                  style={{ marginTop: 10, gap: 8 }}
                >
                  {friends.length === 0 ? (
                    <Text style={{ fontSize: 13, color: '#3D3D5E', fontFamily: 'Inter_400Regular', paddingVertical: 8 }}>no friends yet</Text>
                  ) : (
                    friends.map((f: FriendSummary) => {
                      const picked = selectedFriendIds.includes(f.friendId);
                      return (
                        <Pressable key={f.friendId} onPress={() => toggleFriend(f.friendId)}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 12,
                            backgroundColor: picked ? '#1A1240' : '#0D0D18',
                            borderRadius: 14, borderWidth: 1,
                            borderColor: picked ? '#3A2E70' : '#1E1E30',
                            paddingHorizontal: 14, paddingVertical: 11,
                          }}>
                          <Text style={{ fontSize: 22 }}>{f.avatarEmoji ?? '🌙'}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>{f.displayName ?? f.username}</Text>
                            <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>@{f.username}</Text>
                          </View>
                          <View style={{
                            width: 22, height: 22, borderRadius: 11,
                            backgroundColor: picked ? '#6B52E0' : '#1E1E30',
                            borderWidth: 1.5, borderColor: picked ? '#6B52E0' : '#2E2E48',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {picked && <Text style={{ fontSize: 11, color: '#FFF' }}>✓</Text>}
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </MotiView>
              )}
            </AnimatePresence>
          </View>
        </ScrollView>

        {/* ── Sticky create button ─────────────────────────────────────── */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: insets.bottom + 20, paddingTop: 14, backgroundColor: '#08080F', borderTopWidth: 1, borderTopColor: '#1E1E30' }}>
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate || isPending}
            style={({ pressed }) => ({
              borderRadius: 18, paddingVertical: 17, alignItems: 'center',
              backgroundColor: canCreate ? (pressed ? '#5A40C0' : '#6B52E0') : '#1E1E30',
              opacity: isPending ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: canCreate ? '#EEEEF8' : '#3D3D5E' }}>
              {isPending ? 'creating…' : 'create scrapbook'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const lbl: any = { fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' };
const inp: any = { backgroundColor: '#12121C', borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_400Regular' };
