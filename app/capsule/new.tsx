import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCreateCapsule } from '@hooks/useCapsules';
import { useFriends } from '@hooks/useFriendships';
import { Avatar } from '@ui/Avatar';

export default function NewCapsuleScreen() {
  const insets = useSafeAreaInsets();
  const { friends } = useFriends();
  const { mutateAsync: createCapsule, isPending } = useCreateCapsule();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const canCreate = title.trim().length > 0;

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
    Haptics.selectionAsync();
  };

  const handleCreate = async () => {
    if (!canCreate || isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const capsuleId = await createCapsule({
        title: title.trim(),
        description: description.trim() || undefined,
        coverEmoji: '📦',
        unlockType: 'date',
        unlockAt: undefined,
        memberIds: selectedFriendIds,
      });
      router.replace(`/capsule/${capsuleId}` as any);
    } catch (err: any) {
      Alert.alert('Could not create capsule', err?.message ?? 'Try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#08080F', paddingTop: insets.top }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 120 }}
        >
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
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="graduation, summer 2026, after we move out..."
                placeholderTextColor="#3D3D5E"
                maxLength={60}
                autoFocus
                style={{ fontSize: 16, color: '#EEEEF8', fontFamily: 'Inter_400Regular', padding: 0 }}
              />
            </View>
          </View>

          {/* Description */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              description <Text style={{ color: '#3D3D5E', textTransform: 'none', letterSpacing: 0 }}>(optional)</Text>
            </Text>
            <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48', backgroundColor: '#12121C', paddingHorizontal: 14, paddingVertical: 14 }}>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="a note for when you open this..."
                placeholderTextColor="#3D3D5E"
                maxLength={120}
                multiline
                style={{ fontSize: 14, color: '#EEEEF8', fontFamily: 'Inter_400Regular', padding: 0, minHeight: 40 }}
              />
            </View>
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
                      <Text style={{ fontSize: 10, color: isSelected ? '#A99BFF' : '#5A5A7A', fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                        {friend.username}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Info note */}
          <View style={{ marginTop: 24, backgroundColor: '#12121C', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2E2E48' }}>
            <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular', lineHeight: 18 }}>
              everyone will be notified to add their pic and note. once all contributions are in, you can seal the capsule and set when it opens.
            </Text>
          </View>
        </ScrollView>

        {/* Create button */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: insets.bottom + 16, paddingTop: 16, backgroundColor: '#08080F', borderTopWidth: 1, borderTopColor: '#1A1A28' }}>
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate || isPending}
            style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', backgroundColor: canCreate ? '#6B52E0' : '#2E2E48', opacity: canCreate ? 1 : 0.6 }}
          >
            {isPending
              ? <ActivityIndicator color="#A99BFF" />
              : <Text style={{ fontSize: 17, color: canCreate ? '#EEEEF8' : '#5A5A7A', fontFamily: 'Inter_600SemiBold' }}>make capsule</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
