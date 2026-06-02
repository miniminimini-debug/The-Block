import { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { useCameraStore, type DevelopmentDelay } from '@stores/camera.store';
import { useCreatePost } from '@hooks/usePosts';
import { useFriends } from '@hooks/useFriendships';
import { Avatar } from '@ui/Avatar';
import { PolaroidCard } from '@/components/polaroid/PolaroidCard';

const DELAYS: { value: DevelopmentDelay; label: string; sub: string }[] = [
  { value: 15,        label: '15 min',   sub: 'quick peek'   },
  { value: 60,        label: '1 hour',   sub: 'classic'      },
  { value: 240,       label: '4 hours',  sub: 'slow burn'    },
  { value: 'overnight', label: 'overnight', sub: 'wake-up gift' },
];

export function PostComposer({ isOneShot = false }: { isOneShot?: boolean }) {
  const captureUri       = useCameraStore((s) => s.captureUri);
  const note             = useCameraStore((s) => s.note);
  const activePrompt     = useCameraStore((s) => s.activePrompt);
  const selectedRecipientIds = useCameraStore((s) => s.selectedRecipientIds);
  const developmentDelay = useCameraStore((s) => s.developmentDelay);
  const setNote          = useCameraStore((s) => s.setNote);
  const toggleRecipient  = useCameraStore((s) => s.toggleRecipient);
  const setDelay         = useCameraStore((s) => s.setDelay);
  const reset            = useCameraStore((s) => s.reset);

  const { friends, isLoading: friendsLoading } = useFriends();
  const { mutateAsync: createPost, isPending } = useCreatePost();
  const noteRef = useRef<TextInput>(null);

  const canSend = captureUri && selectedRecipientIds.length > 0 && !isPending;

  const handleDiscard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reset();
  };

  const handleSend = () => {
    if (!captureUri || selectedRecipientIds.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createPost({
      imageUri: captureUri,
      note: note || undefined,
      mood: null,
      recipientIds: selectedRecipientIds,
      developmentDelay,
    });
  };

  if (!captureUri) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 40 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: 40 }}
      transition={{ type: 'spring', damping: 22, stiffness: 200 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#08080F' }}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 120 }}
        >
          {!isOneShot && (
            <Pressable onPress={handleDiscard} style={{ marginBottom: 24 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: '#A0A0C0' }}>
                ✕ discard
              </Text>
            </Pressable>
          )}
          {isOneShot && <View style={{ marginBottom: 24, height: 20 }} />}

          {/* Polaroid preview */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <PolaroidCard
              imageUri={captureUri}
              status="developed"
              note={note || undefined}
              promptSticker={activePrompt ?? undefined}
              size="lg"
              tilt={0}
            />
          </View>

          {/* Note input — max 20 chars, lives on the white strip */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#5A5A7A', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                handwritten note
              </Text>
              <Text style={{ fontSize: 11, color: note.length >= 18 ? '#FF6B6B' : '#3D3D5E', fontFamily: 'Inter_400Regular' }}>
                {note.length}/20
              </Text>
            </View>
            <View style={{
              borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48',
              backgroundColor: '#F5F0E8', paddingHorizontal: 14, paddingVertical: 12,
            }}>
              <TextInput
                ref={noteRef}
                value={note}
                onChangeText={(v) => setNote(v.slice(0, 20))}
                placeholder="write something..."
                placeholderTextColor="#9A8A78"
                maxLength={20}
                style={{
                  fontSize: 18, color: '#2A1F0F',
                  fontFamily: 'Caveat_400Regular',
                  padding: 0,
                }}
              />
            </View>
          </View>

          {/* Recipient selection */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#5A5A7A', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              send to
            </Text>
            {friendsLoading ? (
              <ActivityIndicator color="#6B52E0" />
            ) : friends.length === 0 ? (
              <View style={{ backgroundColor: '#12121C', borderRadius: 14, padding: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
                  invite friends to send photos
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                {friends.map((friend) => {
                  const isSelected = selectedRecipientIds.includes(friend.friendId);
                  return (
                    <Pressable
                      key={friend.friendId}
                      onPress={() => { toggleRecipient(friend.friendId); Haptics.selectionAsync(); }}
                      style={{ alignItems: 'center', gap: 6 }}
                    >
                      <Avatar
                        emoji={friend.avatarEmoji ?? '🌙'}
                        size="md"
                        style={{
                          opacity: isSelected ? 1 : 0.45,
                          borderWidth: isSelected ? 2.5 : 1.5,
                          borderColor: isSelected ? '#8B76F0' : '#2E2E48',
                          borderRadius: 24,
                        }}
                      />
                      <Text style={{
                        fontSize: 11, fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                        color: isSelected ? '#A99BFF' : '#5A5A7A',
                      }}>
                        {friend.username}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Development delay */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#5A5A7A', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              develops in
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DELAYS.map((d) => {
                const isSelected = developmentDelay === d.value;
                return (
                  <Pressable
                    key={String(d.value)}
                    onPress={() => { setDelay(d.value); Haptics.selectionAsync(); }}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 10,
                      borderRadius: 12, borderWidth: 1.5,
                      borderColor: isSelected ? '#8B76F0' : '#2E2E48',
                      backgroundColor: isSelected ? '#1A1240' : '#12121C',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: isSelected ? '#A99BFF' : '#5A5A7A' }}>
                      {d.label}
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: isSelected ? '#6B52E0' : '#3D3D5E', marginTop: 1 }}>
                      {d.sub}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Sticky send button */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingHorizontal: 24, paddingBottom: 36, paddingTop: 16,
          backgroundColor: '#08080F', borderTopWidth: 1, borderTopColor: '#1A1A28',
        }}>
          {isPending ? (
            <View style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', backgroundColor: '#2E2E48' }}>
              <ActivityIndicator color="#A99BFF" />
            </View>
          ) : (
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={{
                borderRadius: 18, paddingVertical: 18, alignItems: 'center',
                backgroundColor: canSend ? '#6B52E0' : '#2E2E48',
                opacity: canSend ? 1 : 0.6,
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#EEEEF8' }}>
                ✦ develop & send
              </Text>
            </Pressable>
          )}
          {selectedRecipientIds.length === 0 && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#5A5A7A', textAlign: 'center', marginTop: 8 }}>
              select someone to send to
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </MotiView>
  );
}
