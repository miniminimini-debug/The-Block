import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCreateBoard } from '@hooks/useCorkBoards';
import { useFriends } from '@hooks/useFriendships';
import { useTheme } from '@hooks/useTheme';

const EMOJI_OPTIONS = ['📌', '🖼', '🎨', '🌿', '⭐', '🌙', '🎭', '🎞', '💌', '🏠'];

export default function NewBoardScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { friends } = useFriends();
  const { mutateAsync: createBoard, isPending } = useCreateBoard();

  const [title, setTitle] = useState('');
  const [coverEmoji, setCoverEmoji] = useState('📌');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const canCreate = title.trim().length > 0;

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
    Haptics.selectionAsync();
  };

  const handleCreate = async () => {
    if (!canCreate || isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const boardId = await createBoard({
      title: title.trim(),
      coverEmoji,
      memberIds: selectedFriendIds,
    });
    router.replace(`/board/${boardId}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 120 }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <Pressable onPress={() => router.back()}>
              <Text style={{ fontSize: 15, color: theme.textSub, fontFamily: 'Inter_400Regular' }}>cancel</Text>
            </Pressable>
            <Text style={{ fontSize: 17, color: theme.text, fontFamily: 'Inter_700Bold' }}>new cork board</Text>
            <View style={{ width: 52 }} />
          </View>

          {/* Emoji picker */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {EMOJI_OPTIONS.map((e) => (
                <Pressable key={e} onPress={() => { setCoverEmoji(e); Haptics.selectionAsync(); }}>
                  <View style={{
                    width: 52, height: 52, borderRadius: 14,
                    backgroundColor: coverEmoji === e ? theme.accentDim : theme.surface,
                    borderWidth: 1.5, borderColor: coverEmoji === e ? theme.accent : theme.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Title */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>board name</Text>
            <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 14, paddingVertical: 14 }}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="summer vibes, road trip ideas..."
                placeholderTextColor={theme.textDimmer}
                maxLength={60}
                style={{ fontSize: 16, color: theme.text, fontFamily: 'Inter_400Regular', padding: 0 }}
              />
            </View>
          </View>

          {/* Invite friends */}
          <View>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>pin together with</Text>
            {friends.length === 0 ? (
              <View style={{ backgroundColor: theme.surface, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 13, color: theme.textDim, fontFamily: 'Inter_400Regular' }}>add friends to invite them</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {friends.map((friend) => {
                  const isSelected = selectedFriendIds.includes(friend.friendId);
                  return (
                    <Pressable key={friend.friendId} onPress={() => toggleFriend(friend.friendId)} style={{ alignItems: 'center', gap: 6 }}>
                      <View style={{
                        width: 52, height: 52, borderRadius: 26,
                        backgroundColor: isSelected ? theme.accentDim : theme.surfaceElevated,
                        borderWidth: isSelected ? 2.5 : 1.5,
                        borderColor: isSelected ? theme.accent : theme.border,
                        alignItems: 'center', justifyContent: 'center',
                        opacity: isSelected ? 1 : 0.55,
                      }}>
                        <Text style={{ fontSize: 24 }}>{friend.avatarEmoji ?? '🌙'}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: isSelected ? theme.accentLight : theme.textDim, fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                        {friend.username}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </ScrollView>

        {/* Create button */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: insets.bottom + 20, paddingTop: 16, backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border }}>
          <Pressable onPress={handleCreate} disabled={!canCreate || isPending} style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', backgroundColor: canCreate ? theme.accent : theme.border }}>
            {isPending ? <ActivityIndicator color={theme.text} /> : <Text style={{ fontSize: 17, color: theme.text, fontFamily: 'Inter_600SemiBold' }}>📌 create the board</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
