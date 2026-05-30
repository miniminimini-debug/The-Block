import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCreatePass } from '@hooks/useCameraPass';
import { useFriends } from '@hooks/useFriendships';
import { Avatar } from '@ui/Avatar';
import type { FriendSummary } from '@types/models';

export default function NewPassScreen() {
  const insets = useSafeAreaInsets();
  const { friends } = useFriends();
  const { mutateAsync: createPass, isPending } = useCreatePass();

  const [title, setTitle] = useState('');
  const [orderedFriends, setOrderedFriends] = useState<FriendSummary[]>([]);
  const [timeLimitHours, setTimeLimitHours] = useState<number | null>(24);

  const canCreate = orderedFriends.length > 0;

  const addFriend = (friend: FriendSummary) => {
    if (orderedFriends.find((f) => f.friendId === friend.friendId)) return;
    setOrderedFriends((prev) => [...prev, friend]);
    Haptics.selectionAsync();
  };

  const removeFriend = (id: string) => {
    setOrderedFriends((prev) => prev.filter((f) => f.friendId !== id));
    Haptics.selectionAsync();
  };

  const handleCreate = async () => {
    if (!canCreate || isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const passId = await createPass({
      title: title.trim() || undefined,
      orderedFriendIds: orderedFriends.map((f) => f.friendId),
      timeLimitHours: timeLimitHours ?? undefined,
    });
    router.replace(`/pass/${passId}`);
  };

  const availableFriends = friends.filter((f) => !orderedFriends.find((of) => of.friendId === f.friendId));

  return (
    <View style={{ flex: 1, backgroundColor: '#08080F', paddingTop: insets.top }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 120 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <Pressable onPress={() => router.back()}>
              <Text style={{ fontSize: 15, color: '#7A7A9A', fontFamily: 'Inter_400Regular' }}>cancel</Text>
            </Pressable>
            <Text style={{ fontSize: 17, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>pass the camera</Text>
            <View style={{ width: 52 }} />
          </View>

          {/* Title */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>theme (optional)</Text>
            <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48', backgroundColor: '#12121C', paddingHorizontal: 14, paddingVertical: 14 }}>
              <TextInput value={title} onChangeText={setTitle} placeholder="a night out, road trip, last day..." placeholderTextColor="#3D3D5E" maxLength={40} style={{ fontSize: 16, color: '#EEEEF8', fontFamily: 'Inter_400Regular', padding: 0 }} />
            </View>
          </View>

          {/* Pass order */}
          <View style={{ marginBottom: 24, gap: 10 }}>
            <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              pass order (you go first)
            </Text>

            {/* You (creator) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#12121C', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#2E2E48' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1240', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#6B52E0' }}>
                <Text style={{ fontSize: 18 }}>📷</Text>
              </View>
              <Text style={{ fontSize: 14, color: '#A99BFF', fontFamily: 'Inter_600SemiBold' }}>you</Text>
              <Text style={{ fontSize: 12, color: '#3D3D5E', fontFamily: 'Inter_400Regular', marginLeft: 'auto' }}>1st</Text>
            </View>

            {/* Ordered friends */}
            {orderedFriends.map((f, i) => (
              <View key={f.friendId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#12121C', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#2E2E48' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A28', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{f.avatarEmoji ?? '🌙'}</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#A0A0C0', fontFamily: 'Inter_400Regular', flex: 1 }}>{f.username}</Text>
                <Text style={{ fontSize: 12, color: '#3D3D5E', fontFamily: 'Inter_400Regular' }}>{i + 2}nd</Text>
                <Pressable onPress={() => removeFriend(f.friendId)} style={{ padding: 4 }}>
                  <Text style={{ color: '#5A5A7A', fontSize: 16 }}>✕</Text>
                </Pressable>
              </View>
            ))}

            {/* Add friends */}
            {availableFriends.length > 0 && (
              <View>
                <Text style={{ fontSize: 11, color: '#3D3D5E', fontFamily: 'Inter_500Medium', marginBottom: 8 }}>add to chain</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {availableFriends.map((friend) => (
                    <Pressable key={friend.friendId} onPress={() => addFriend(friend)} style={{ alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1A28', borderWidth: 1.5, borderColor: '#2E2E48', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20 }}>{friend.avatarEmoji ?? '🌙'}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>{friend.username}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Time limit */}
          <View>
            <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>time per person</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[{ h: null, label: 'no limit' }, { h: 12, label: '12 hrs' }, { h: 24, label: '24 hrs' }, { h: 48, label: '2 days' }].map((opt) => {
                const isSel = timeLimitHours === opt.h;
                return (
                  <Pressable key={String(opt.h)} onPress={() => { setTimeLimitHours(opt.h); Haptics.selectionAsync(); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: isSel ? '#6B52E0' : '#2E2E48', backgroundColor: isSel ? '#1A1240' : '#12121C', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: isSel ? '#A99BFF' : '#7A7A9A', fontFamily: 'Inter_500Medium' }}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Create button */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 36, paddingTop: 16, backgroundColor: '#08080F', borderTopWidth: 1, borderTopColor: '#1A1A28' }}>
          <Pressable onPress={handleCreate} disabled={!canCreate || isPending} style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', backgroundColor: canCreate ? '#6B52E0' : '#2E2E48' }}>
            {isPending ? <ActivityIndicator color="#A99BFF" /> : <Text style={{ fontSize: 17, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>📷 start the pass</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
