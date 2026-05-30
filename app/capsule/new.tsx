import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCreateCapsule } from '@hooks/useCapsules';
import { useFriends } from '@hooks/useFriendships';
import { Avatar } from '@ui/Avatar';

const UNLOCK_PRESETS = [
  { label: 'in 1 month',  months: 1  },
  { label: 'in 3 months', months: 3  },
  { label: 'in 6 months', months: 6  },
  { label: 'in 1 year',   months: 12 },
  { label: 'custom date', months: null },
];

function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

// Simple date picker — three number inputs: day / month / year
function DatePicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const parsed = value ? new Date(value) : new Date();
  const [day,   setDay]   = useState(String(parsed.getDate()));
  const [month, setMonth] = useState(String(parsed.getMonth() + 1));
  const [year,  setYear]  = useState(String(parsed.getFullYear()));

  const commit = (d: string, m: string, y: string) => {
    const dd = parseInt(d, 10), mm = parseInt(m, 10), yy = parseInt(y, 10);
    if (!dd || !mm || !yy || yy < 2024) return;
    const date = new Date(yy, mm - 1, dd);
    if (!isNaN(date.getTime())) onChange(date.toISOString());
  };

  const field = (
    val: string, set: (v: string) => void,
    placeholder: string, maxLen: number,
    otherDay: string, otherMonth: string, otherYear: string,
  ) => (
    <TextInput
      value={val}
      onChangeText={(v) => { set(v); commit(
        placeholder === 'DD' ? v : otherDay,
        placeholder === 'MM' ? v : otherMonth,
        placeholder === 'YYYY' ? v : otherYear,
      ); }}
      placeholder={placeholder}
      placeholderTextColor="#3D3D5E"
      keyboardType="number-pad"
      maxLength={maxLen}
      style={{
        flex: placeholder === 'YYYY' ? 2 : 1,
        textAlign: 'center',
        fontSize: 18,
        color: '#EEEEF8',
        fontFamily: 'Inter_600SemiBold',
        backgroundColor: '#1A1A28',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#2E2E48',
        paddingVertical: 12,
      }}
    />
  );

  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      {field(day,   setDay,   'DD',   2, day, month, year)}
      <Text style={{ color: '#3D3D5E', fontSize: 18 }}>/</Text>
      {field(month, setMonth, 'MM',   2, day, month, year)}
      <Text style={{ color: '#3D3D5E', fontSize: 18 }}>/</Text>
      {field(year,  setYear,  'YYYY', 4, day, month, year)}
    </View>
  );
}

export default function NewCapsuleScreen() {
  const insets = useSafeAreaInsets();
  const { friends } = useFriends();
  const { mutateAsync: createCapsule, isPending } = useCreateCapsule();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [unlockPreset, setUnlockPreset] = useState<number | null>(6);
  const [customDate, setCustomDate] = useState('');

  const isCustom = unlockPreset === null;
  const canCreate = title.trim().length > 0 && (isCustom ? !!customDate : unlockPreset !== null);

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
    Haptics.selectionAsync();
  };

  const handleCreate = async () => {
    if (!canCreate || isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const unlockAt = isCustom
      ? customDate
      : addMonths(unlockPreset!);

    await createCapsule({
      title: title.trim(),
      description: description.trim() || undefined,
      coverEmoji: '📦',
      unlockType: 'date',
      unlockAt,
      memberIds: selectedFriendIds,
    });

    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#08080F', paddingTop: insets.top }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 120 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <Pressable onPress={() => router.back()}>
              <Text style={{ fontSize: 15, color: '#7A7A9A', fontFamily: 'Inter_400Regular' }}>cancel</Text>
            </Pressable>
            <Text style={{ fontSize: 17, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>new capsule</Text>
            <View style={{ width: 52 }} />
          </View>

          {/* Title */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>name</Text>
            <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48', backgroundColor: '#12121C', paddingHorizontal: 14, paddingVertical: 14 }}>
              <TextInput value={title} onChangeText={setTitle} placeholder="graduation, summer 2026, after we move out..." placeholderTextColor="#3D3D5E" maxLength={60} style={{ fontSize: 16, color: '#EEEEF8', fontFamily: 'Inter_400Regular', padding: 0 }} />
            </View>
          </View>

          {/* Description */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>description (optional)</Text>
            <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48', backgroundColor: '#12121C', paddingHorizontal: 14, paddingVertical: 14 }}>
              <TextInput value={description} onChangeText={setDescription} placeholder="a note for when you open this..." placeholderTextColor="#3D3D5E" maxLength={120} multiline style={{ fontSize: 14, color: '#EEEEF8', fontFamily: 'Inter_400Regular', padding: 0, minHeight: 40 }} />
            </View>
          </View>

          {/* When to open */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>when to open</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {UNLOCK_PRESETS.map((preset) => {
                const isSel = isCustom ? preset.months === null : unlockPreset === preset.months;
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => { Haptics.selectionAsync(); setUnlockPreset(preset.months); }}
                    style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: isSel ? '#6B52E0' : '#2E2E48', backgroundColor: isSel ? '#1A1240' : '#12121C' }}
                  >
                    <Text style={{ fontSize: 13, color: isSel ? '#A99BFF' : '#7A7A9A', fontFamily: isSel ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {isCustom && (
              <View style={{ marginTop: 14 }}>
                <DatePicker
                  value={customDate}
                  onChange={setCustomDate}
                />
              </View>
            )}
          </View>

          {/* Invite friends */}
          <View>
            <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>seal together with</Text>
            {friends.length === 0 ? (
              <View style={{ backgroundColor: '#12121C', borderRadius: 14, padding: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#3D3D5E', fontFamily: 'Inter_400Regular' }}>add friends to invite them</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {friends.map((friend) => {
                  const isSelected = selectedFriendIds.includes(friend.friendId);
                  return (
                    <Pressable key={friend.friendId} onPress={() => toggleFriend(friend.friendId)} style={{ alignItems: 'center', gap: 6 }}>
                      <View style={{ opacity: isSelected ? 1 : 0.45, borderWidth: isSelected ? 2.5 : 1.5, borderColor: isSelected ? '#8B76F0' : '#2E2E48', borderRadius: 24 }}>
                        <Avatar emoji={friend.avatarEmoji ?? '🌙'} size="md" />
                      </View>
                      <Text style={{ fontSize: 10, color: isSelected ? '#A99BFF' : '#5A5A7A', fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>{friend.username}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </ScrollView>

        {/* Seal button */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: insets.bottom + 16, paddingTop: 16, backgroundColor: '#08080F', borderTopWidth: 1, borderTopColor: '#1A1A28' }}>
          <Pressable onPress={handleCreate} disabled={!canCreate || isPending} style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', backgroundColor: canCreate ? '#6B52E0' : '#2E2E48' }}>
            {isPending ? <ActivityIndicator color="#A99BFF" /> : <Text style={{ fontSize: 17, color: canCreate ? '#EEEEF8' : '#5A5A7A', fontFamily: 'Inter_600SemiBold' }}>📦 seal the capsule</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
