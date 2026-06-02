import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, ActivityIndicator, TextInput,
  StyleSheet, Dimensions, Modal, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useCapsule, useSubmitToCapsule, useOpenCapsule, useSealCapsule } from '@hooks/useCapsules';
import { useAuthStore } from '@stores/auth.store';
import { CapsuleRevealCeremony } from '@/components/capsule/CapsuleRevealCeremony';
import { ALL_STICKERS } from '@lib/stickers';

const { width: SW, height: SH } = Dimensions.get('window');

const COVER_PALETTES: [string, string, string][] = [
  ['#8B3A3A', '#5A1A1A', '#F5C0A0'],
  ['#3A5A8B', '#1A2A5A', '#A0C0F5'],
  ['#3A6B3A', '#1A401A', '#A0E0A0'],
  ['#7A3A8B', '#4A1A60', '#D0A0F5'],
  ['#8B6A3A', '#5A3A10', '#F5D0A0'],
  ['#3A3A7A', '#1A1A50', '#A0A0F0'],
  ['#8B3A5A', '#5A1A30', '#F5A0C0'],
  ['#3A7A7A', '#1A5050', '#A0E0E0'],
];

function coverPalette(id: string): [string, string, string] {
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return COVER_PALETTES[sum % COVER_PALETTES.length];
}

function useCountdown(unlockAt: string | null) {
  const [diff, setDiff] = useState(() => unlockAt ? new Date(unlockAt).getTime() - Date.now() : 0);
  useEffect(() => {
    if (!unlockAt) return;
    const t = setInterval(() => setDiff(new Date(unlockAt).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [unlockAt]);
  const total = Math.max(0, diff);
  const days  = Math.floor(total / 86400000);
  const hours = Math.floor((total % 86400000) / 3600000);
  const mins  = Math.floor((total % 3600000)  / 60000);
  const secs  = Math.floor((total % 60000)    / 1000);
  return { days, hours, mins, secs, isReady: diff <= 0 };
}

interface CoverSticker { key: string; stickerId: string; x: number; y: number; rot: number }

// ── Sealed book cover ─────────────────────────────────────────────────────────
function SealedCover({
  capsule,
  stickers,
  onAddSticker,
  onRemoveSticker,
  onContribute,
  insetBottom,
}: {
  capsule: any;
  stickers: CoverSticker[];
  onAddSticker: () => void;
  onRemoveSticker: (key: string) => void;
  onContribute: () => void;
  insetBottom: number;
}) {
  const [main, dark, text] = coverPalette(capsule.id);
  const { days, hours, mins, secs } = useCountdown(capsule.unlockAt);

  const members: string[] = (capsule.members ?? []).map(
    (m: any) => m.user?.display_name ?? m.user?.username ?? '?',
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.cover, { backgroundColor: main }]}>
        {Array.from({ length: 18 }).map((_, i) => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * 38, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />
        ))}
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: dark, opacity: 0.6 }} />

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 100 }}
          style={{ alignItems: 'center', paddingHorizontal: 32, marginTop: 20 }}
        >
          <Text style={{ fontFamily: 'Caveat_400Regular', fontSize: 38, color: text, textAlign: 'center', lineHeight: 44 }}>
            {capsule.title}
          </Text>
          {capsule.description ? (
            <Text style={{ fontFamily: 'Caveat_400Regular', fontSize: 18, color: text, opacity: 0.7, textAlign: 'center', marginTop: 6 }}>
              {capsule.description}
            </Text>
          ) : null}
        </MotiView>

        {members.length > 0 && (
          <View style={{ marginTop: 20, alignItems: 'center', gap: 4, paddingHorizontal: 24 }}>
            {members.map((name, i) => (
              <Text key={i} style={{ fontFamily: 'Caveat_400Regular', fontSize: 20, color: text, opacity: 0.65, transform: [{ rotate: `${(i % 3 - 1) * 1.5}deg` }] }}>
                {name}
              </Text>
            ))}
          </View>
        )}

        <View style={{ marginTop: 28, alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: text, opacity: 0.5, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            opens in
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            {days > 0 && (
              <Text style={{ fontFamily: 'Caveat_400Regular', fontSize: 48, color: text, lineHeight: 52 }}>
                {days}<Text style={{ fontSize: 22, opacity: 0.7 }}>d</Text>
              </Text>
            )}
            {days < 30 && (
              <Text style={{ fontFamily: 'Caveat_400Regular', fontSize: 48, color: text, lineHeight: 52 }}>
                {String(hours).padStart(2, '0')}<Text style={{ fontSize: 22, opacity: 0.7 }}>h</Text>
              </Text>
            )}
            {days === 0 && (
              <>
                <Text style={{ fontFamily: 'Caveat_400Regular', fontSize: 48, color: text, lineHeight: 52 }}>
                  {String(mins).padStart(2, '0')}<Text style={{ fontSize: 22, opacity: 0.7 }}>m</Text>
                </Text>
                <Text style={{ fontFamily: 'Caveat_400Regular', fontSize: 48, color: text, lineHeight: 52 }}>
                  {String(secs).padStart(2, '0')}<Text style={{ fontSize: 22, opacity: 0.7 }}>s</Text>
                </Text>
              </>
            )}
          </View>
          {capsule.unlockAt && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: text, opacity: 0.4 }}>
              {new Date(capsule.unlockAt).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
        </View>

        {stickers.map((s) => {
          const sticker = ALL_STICKERS.find((st) => st.id === s.stickerId);
          if (!sticker) return null;
          return (
            <Pressable key={s.key} onLongPress={() => { onRemoveSticker(s.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              style={{ position: 'absolute', left: s.x, top: s.y, transform: [{ rotate: `${s.rot}deg` }] }}>
              <Text style={{ fontSize: 36 }}>{sticker.emoji}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: insetBottom + 10 }}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAddSticker(); }} style={styles.coverBtn}>
          <Text style={{ fontSize: 13, color: '#A99BFF', fontFamily: 'Inter_500Medium' }}>🌸 add sticker</Text>
        </Pressable>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onContribute(); }}
          style={[styles.coverBtn, { flex: 2, backgroundColor: '#1A1240', borderColor: '#6B52E0' }]}>
          <Text style={{ fontSize: 13, color: '#B8AEFF', fontFamily: 'Inter_600SemiBold' }}>+ add to capsule</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── In-X-days picker ──────────────────────────────────────────────────────────
function DurationPicker({ onConfirm, onCancel }: { onConfirm: (iso: string) => void; onCancel: () => void }) {
  const [count, setCount] = useState('7');
  const [unit, setUnit] = useState<'days' | 'months'>('days');

  const previewDate = () => {
    const n = parseInt(count, 10);
    if (!n || n <= 0) return null;
    const d = new Date();
    if (unit === 'days') d.setDate(d.getDate() + n);
    else d.setMonth(d.getMonth() + n);
    return d;
  };

  const handleConfirm = () => {
    const n = parseInt(count, 10);
    if (!n || n <= 0) {
      Alert.alert('Pick a duration', 'Enter a number greater than 0.');
      return;
    }
    const d = new Date();
    if (unit === 'days') d.setDate(d.getDate() + n);
    else d.setMonth(d.getMonth() + n);
    onConfirm(d.toISOString());
  };

  const preview = previewDate();

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_700Bold', textAlign: 'center' }}>when does it open?</Text>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: '#2E2E48', backgroundColor: '#0D0D14', paddingHorizontal: 14, paddingVertical: 12 }}>
          <TextInput
            value={count}
            onChangeText={(v) => setCount(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="7"
            placeholderTextColor="#3D3D5E"
            style={{ fontSize: 24, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', textAlign: 'center', padding: 0 }}
          />
        </View>

        <View style={{ flexDirection: 'row', borderRadius: 12, borderWidth: 1.5, borderColor: '#2E2E48', overflow: 'hidden' }}>
          {(['days', 'months'] as const).map((u) => (
            <Pressable
              key={u}
              onPress={() => { setUnit(u); Haptics.selectionAsync(); }}
              style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: unit === u ? '#6B52E0' : '#0D0D14' }}
            >
              <Text style={{ fontSize: 13, color: unit === u ? '#EEEEF8' : '#5A5A7A', fontFamily: 'Inter_600SemiBold' }}>{u}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {preview && (
        <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
          opens {preview.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1A1A28', borderWidth: 1, borderColor: '#2E2E48' }}>
          <Text style={{ fontSize: 14, color: '#7A7A9A', fontFamily: 'Inter_500Medium' }}>cancel</Text>
        </Pressable>
        <Pressable onPress={handleConfirm} style={{ flex: 2, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#6B52E0' }}>
          <Text style={{ fontSize: 14, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>seal it</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CapsuleScreen() {
  const { capsuleId } = useLocalSearchParams<{ capsuleId: string }>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user.id);

  const { capsule, isLoading } = useCapsule(capsuleId ?? '');
  const { mutateAsync: submitToCapsule, isPending: isSubmitting } = useSubmitToCapsule(capsuleId ?? '');
  const { mutateAsync: openCapsule, isPending: isOpening } = useOpenCapsule();
  const { mutateAsync: sealCapsule, isPending: isSealing } = useSealCapsule();

  const [showCeremony, setShowCeremony] = useState(false);
  const [note, setNote] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showSealPicker, setShowSealPicker] = useState(false);
  const [stickerModalVisible, setStickerModalVisible] = useState(false);
  const [coverStickers, setCoverStickers] = useState<CoverSticker[]>([]);

  const myMembership = capsule?.members?.find((m) => m.userId === userId);
  const hasSubmitted = myMembership?.hasSubmitted ?? false;
  const isCreator = capsule?.creatorId === userId;
  const isCollecting = !capsule?.unlockAt;
  const isLocked = !!capsule?.unlockAt && new Date(capsule.unlockAt).getTime() > Date.now() && !capsule?.isOpened;
  const isReadyToOpen = !!capsule?.unlockAt && new Date(capsule.unlockAt).getTime() <= Date.now() && !capsule?.isOpened;
  const allSubmitted = (capsule?.members ?? []).length > 0 && (capsule?.members ?? []).every((m: any) => m.hasSubmitted);

  const handleAddCoverSticker = (stickerId: string) => {
    const x = 30 + Math.random() * (SW - 120);
    const y = 60 + Math.random() * (SH * 0.45);
    const rot = Math.random() * 30 - 15;
    setCoverStickers((prev) => [...prev, { key: `${Date.now()}`, stickerId, x, y, rot }]);
    setStickerModalVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) setSelectedImageUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await submitToCapsule({ imageUri: selectedImageUri ?? undefined, note: note.trim() || undefined });
      setShowSubmitForm(false);
      setNote('');
      setSelectedImageUri(null);
    } catch (err: any) {
      Alert.alert('Could not submit', err?.message ?? 'Try again.');
    }
  };

  const handleOpen = async () => {
    if (!capsuleId || isOpening) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await openCapsule(capsuleId);
      setShowCeremony(true);
    } catch (err: any) {
      Alert.alert('Could not open capsule', err?.message ?? 'Try again.');
    }
  };

  const handleSeal = async (unlockAt: string) => {
    if (!capsuleId || isSealing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await sealCapsule({ capsuleId, unlockAt });
      setShowSealPicker(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Could not seal capsule', err?.message ?? 'Try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#08080F', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6B52E0" />
      </View>
    );
  }

  if (!capsule) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#08080F' }}>
      <Pressable
        onPress={() => router.back()}
        style={{ position: 'absolute', top: insets.top + 8, left: 16, zIndex: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(8,8,15,0.6)', borderRadius: 12 }}
      >
        <Text style={{ fontSize: 15, color: '#7A7A9A', fontFamily: 'Inter_400Regular' }}>‹ back</Text>
      </Pressable>

      {/* LOCKED (sealed with countdown) */}
      {isLocked ? (
        <View style={{ flex: 1, paddingTop: insets.top + 48 }}>
          <SealedCover
            capsule={capsule}
            stickers={coverStickers}
            onAddSticker={() => setStickerModalVisible(true)}
            onRemoveSticker={(key) => setCoverStickers((prev) => prev.filter((s) => s.key !== key))}
            onContribute={() => setShowSubmitForm(true)}
            insetBottom={insets.bottom}
          />
        </View>
      ) : (
        /* COLLECTING (no unlock date yet) or READY / OPENED */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 20, paddingBottom: insets.bottom + 80, gap: 24 }}
        >
          <Text style={{ fontSize: 22, color: '#EEEEF8', fontFamily: 'Caveat_400Regular', textAlign: 'center' }}>
            {capsule.title}
          </Text>

          {/* Collecting phase label */}
          {isCollecting && (
            <View style={{ backgroundColor: '#0D0D14', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2E2E48', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 }}>
                collecting contributions · seal it once everyone's added their piece
              </Text>
            </View>
          )}

          {/* Open button */}
          {isReadyToOpen && (
            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Pressable
                onPress={handleOpen}
                disabled={isOpening}
                style={{ backgroundColor: '#1A1240', borderWidth: 1.5, borderColor: '#6B52E0', borderRadius: 20, paddingVertical: 20, alignItems: 'center', gap: 6 }}
              >
                {isOpening ? <ActivityIndicator color="#A99BFF" /> : (
                  <>
                    <Text style={{ fontSize: 36 }}>📦</Text>
                    <Text style={{ fontSize: 17, color: '#A99BFF', fontFamily: 'Inter_700Bold' }}>✦ open the capsule</Text>
                  </>
                )}
              </Pressable>
            </MotiView>
          )}

          {capsule.isOpened && (
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 48 }}>📂</Text>
              <Text style={{ fontSize: 18, color: '#6BCB77', fontFamily: 'Inter_600SemiBold' }}>opened</Text>
            </MotiView>
          )}

          {/* Members */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 11, color: '#3D3D5E', fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>contributors</Text>
            {(capsule.members ?? []).map((m: any) => (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#12121C', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: m.hasSubmitted ? '#2A3D2A' : '#2E2E48' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A28', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>{m.user?.avatar_emoji ?? '🌙'}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#A0A0C0', fontFamily: 'Inter_400Regular' }}>
                    {m.user?.display_name ?? m.user?.username ?? '...'}{m.userId === userId && ' (you)'}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: m.hasSubmitted ? '#6BCB77' : '#3D3D5E', fontFamily: 'Inter_500Medium' }}>
                  {m.hasSubmitted ? '✓ added' : 'waiting...'}
                </Text>
              </View>
            ))}
          </View>

          {/* Your contribution */}
          {!hasSubmitted && !capsule.isOpened && (
            <Pressable onPress={() => setShowSubmitForm(true)} style={{ backgroundColor: '#12121C', borderRadius: 18, borderWidth: 1.5, borderColor: '#2E2E48', paddingVertical: 18, alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 20 }}>➕</Text>
              <Text style={{ fontSize: 15, color: '#A0A0C0', fontFamily: 'Inter_500Medium' }}>add your pic & note</Text>
            </Pressable>
          )}

          {hasSubmitted && !capsule.isOpened && !isCollecting && (
            <View style={{ backgroundColor: '#0A1F0A', borderRadius: 18, borderWidth: 1, borderColor: '#2A3D2A', padding: 18, alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 24 }}>✓</Text>
              <Text style={{ fontSize: 15, color: '#6BCB77', fontFamily: 'Inter_600SemiBold' }}>your contribution is in</Text>
            </View>
          )}

          {/* Seal button — only creator, only when all submitted, only in collecting phase */}
          {isCreator && isCollecting && allSubmitted && (
            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 20 }}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setShowSealPicker(true); }}
                style={{ backgroundColor: '#1A1240', borderWidth: 2, borderColor: '#6B52E0', borderRadius: 20, paddingVertical: 20, alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 28 }}>🔒</Text>
                <Text style={{ fontSize: 17, color: '#A99BFF', fontFamily: 'Inter_700Bold' }}>seal the capsule</Text>
                <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>everyone has contributed · set when it opens</Text>
              </Pressable>
            </MotiView>
          )}

          {isCreator && isCollecting && !allSubmitted && (
            <View style={{ backgroundColor: '#12121C', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2E2E48', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                waiting for everyone to add their contribution before you can seal it
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Contribution modal */}
      <Modal visible={showSubmitForm} transparent animationType="slide" onRequestClose={() => setShowSubmitForm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#12121C', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24, gap: 14 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#2E2E48', alignSelf: 'center', marginBottom: 4 }} />
            <Text style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_700Bold', textAlign: 'center' }}>your contribution</Text>

            <Pressable onPress={pickImage} style={{ borderRadius: 14, borderWidth: 1.5, borderColor: selectedImageUri ? '#6B52E0' : '#2E2E48', backgroundColor: '#0D0D14', overflow: 'hidden', height: 140, alignItems: 'center', justifyContent: 'center' }}>
              {selectedImageUri ? (
                <Image source={{ uri: selectedImageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>tap to add a photo</Text>
                </View>
              )}
            </Pressable>

            <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48', backgroundColor: '#0D0D14', paddingHorizontal: 14, paddingVertical: 12 }}>
              <TextInput value={note} onChangeText={setNote} placeholder="a note for the future..." placeholderTextColor="#3D3D5E" maxLength={200} multiline style={{ fontSize: 15, color: '#EEEEF8', fontFamily: 'Inter_400Regular', fontStyle: 'italic', padding: 0, minHeight: 50 }} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setShowSubmitForm(false)} style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1A1A28', borderWidth: 1, borderColor: '#2E2E48' }}>
                <Text style={{ fontSize: 14, color: '#7A7A9A', fontFamily: 'Inter_500Medium' }}>cancel</Text>
              </Pressable>
              <Pressable onPress={handleSubmit} disabled={isSubmitting || (!selectedImageUri && !note.trim())} style={{ flex: 2, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: (selectedImageUri || note.trim()) ? '#6B52E0' : '#2E2E48' }}>
                {isSubmitting ? <ActivityIndicator color="#A99BFF" /> : <Text style={{ fontSize: 14, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>add my piece</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Seal picker modal */}
      <Modal visible={showSealPicker} transparent animationType="slide" onRequestClose={() => setShowSealPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#12121C', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#2E2E48', alignSelf: 'center', marginBottom: 20 }} />
            {isSealing ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator color="#A99BFF" size="large" />
                <Text style={{ color: '#5A5A7A', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 12 }}>sealing...</Text>
              </View>
            ) : (
              <DurationPicker onConfirm={handleSeal} onCancel={() => setShowSealPicker(false)} />
            )}
          </View>
        </View>
      </Modal>

      {/* Sticker picker */}
      <Modal visible={stickerModalVisible} transparent animationType="slide" onRequestClose={() => setStickerModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setStickerModalVisible(false)} />
        <View style={{ backgroundColor: '#12121C', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: insets.bottom + 16 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#2E2E48', alignSelf: 'center', marginBottom: 14 }} />
          <Text style={{ fontSize: 13, color: '#EEEEF8', fontFamily: 'Inter_700Bold', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 14, paddingHorizontal: 20 }}>stickers</Text>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 }}>
            {ALL_STICKERS.map((s) => (
              <Pressable key={s.id} onPress={() => handleAddCoverSticker(s.id)} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14 }}>
                <Text style={{ fontSize: 32 }}>{s.emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Reveal ceremony */}
      <AnimatePresence>
        {showCeremony && capsule.isOpened && (
          <CapsuleRevealCeremony
            key="ceremony"
            title={capsule.title}
            submissions={(capsule.submissions ?? []).map((s: any) => ({
              id: s.id, userId: s.userId,
              imageUrl: s.imageUrl ?? null, note: s.note ?? null, user: s.user,
            }))}
            onClose={() => setShowCeremony(false)}
          />
        )}
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    flex: 1, marginHorizontal: 20, borderRadius: 8, padding: 24,
    shadowColor: '#000', shadowOffset: { width: -4, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 12, overflow: 'hidden',
  },
  coverBtn: {
    flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#1A1A28', borderWidth: 1, borderColor: '#2E2E48',
  },
});
