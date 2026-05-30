import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useSendDeskDrop } from '@hooks/useDeskDrops';
import { useFriends } from '@hooks/useFriendships';
import { useTheme } from '@hooks/useTheme';
import type { FriendSummary } from '@types/models';

export default function SendDropScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { recipientId } = useLocalSearchParams<{ recipientId?: string }>();
  const { friends } = useFriends();
  const { mutateAsync: sendDrop, isPending } = useSendDeskDrop();

  const [selectedFriend, setSelectedFriend] = useState<FriendSummary | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (recipientId && friends.length > 0) {
      const preselected = friends.find((f) => f.friendId === recipientId) ?? null;
      if (preselected) setSelectedFriend(preselected);
    }
  }, [recipientId, friends]);

  // Photo is required
  const canSend = !!selectedFriend && !!imageUri;

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSend = async () => {
    if (!canSend || isPending || !selectedFriend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await sendDrop({
      recipientId: selectedFriend.friendId,
      imageUri: imageUri!,
      note: note.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
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
            <Text style={{ fontSize: 17, color: theme.text, fontFamily: 'Inter_700Bold' }}>leave on their desk</Text>
            <View style={{ width: 52 }} />
          </View>

          {/* Description */}
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ fontSize: 13, color: theme.textSub, fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
              take an instant polaroid and leave it on their desk. they'll find it next time they open the app.
            </Text>
          </View>

          {/* Pick recipient */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
              leave it for
            </Text>
            {friends.length === 0 ? (
              <View style={{ backgroundColor: theme.surface, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 13, color: theme.textDim, fontFamily: 'Inter_400Regular' }}>add friends first</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {friends.map((friend, i) => {
                  const isSelected = selectedFriend?.friendId === friend.friendId;
                  return (
                    <MotiView
                      key={friend.friendId}
                      from={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 40, type: 'spring', damping: 22 }}
                    >
                      <Pressable
                        onPress={() => { setSelectedFriend(isSelected ? null : friend); Haptics.selectionAsync(); }}
                        style={{ alignItems: 'center', gap: 6 }}
                      >
                        <View style={{
                          width: 56, height: 56, borderRadius: 28,
                          backgroundColor: isSelected ? theme.accentDim : theme.surfaceElevated,
                          borderWidth: isSelected ? 2.5 : 1.5,
                          borderColor: isSelected ? theme.accent : theme.border,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 24 }}>{friend.avatarEmoji ?? '🌙'}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: isSelected ? theme.accentLight : theme.textDim, fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular', maxWidth: 56, textAlign: 'center' }} numberOfLines={1}>
                          {friend.username}
                        </Text>
                      </Pressable>
                    </MotiView>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Polaroid camera */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
              polaroid
            </Text>
            <Pressable
              onPress={takePhoto}
              style={{
                height: 200, borderRadius: 16, overflow: 'hidden',
                backgroundColor: theme.surface, borderWidth: 1.5,
                borderColor: imageUri ? theme.accent : theme.border,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {imageUri ? (
                <>
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11, color: '#FFF', fontFamily: 'Inter_500Medium' }}>retake</Text>
                  </View>
                </>
              ) : (
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 40 }}>📷</Text>
                  <Text style={{ fontSize: 14, color: theme.textSub, fontFamily: 'Inter_600SemiBold' }}>take a polaroid</Text>
                  <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'Inter_400Regular' }}>camera only — no gallery</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Note — optional */}
          <View>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
              note <Text style={{ color: theme.textDimmer, textTransform: 'none', letterSpacing: 0 }}>(optional)</Text>
            </Text>
            <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 14, paddingVertical: 14 }}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="thinking of you..."
                placeholderTextColor={theme.textDimmer}
                maxLength={160}
                multiline
                style={{ fontSize: 15, color: theme.text, fontFamily: 'Inter_400Regular', fontStyle: 'italic', padding: 0, minHeight: 60 }}
              />
            </View>
          </View>
        </ScrollView>

        {/* Send button */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingHorizontal: 24, paddingBottom: insets.bottom + 20, paddingTop: 16,
          backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border,
        }}>
          {!imageUri && (
            <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 10 }}>
              take a polaroid first
            </Text>
          )}
          <Pressable
            onPress={handleSend}
            disabled={!canSend || isPending}
            style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', backgroundColor: canSend ? theme.accent : theme.border }}
          >
            {isPending
              ? <ActivityIndicator color={theme.text} />
              : <Text style={{ fontSize: 17, color: theme.text, fontFamily: 'Inter_600SemiBold' }}>📮 leave it on their desk</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
