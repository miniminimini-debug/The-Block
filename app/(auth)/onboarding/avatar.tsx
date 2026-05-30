import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@stores/auth.store';

const AVATAR_EMOJIS = [
  '🌙', '✨', '🌿', '🕯️', '🌊', '🍂', '☁️', '🌸',
  '🦋', '🌻', '🎞️', '📷', '🎨', '🌈', '🌺', '🪐',
];

const STEP_INDICATOR = '3 of 5';

export default function AvatarScreen() {
  const pendingOnboarding = useAuthStore((s) => s.pendingOnboarding);
  const setPendingOnboarding = useAuthStore((s) => s.setPendingOnboarding);

  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(AVATAR_EMOJIS[0]);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingOnboarding({
      displayName: displayName.trim() || pendingOnboarding?.username || '',
      avatarEmoji: selectedEmoji,
    });
    router.push('/(auth)/onboarding/birthday');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-block-ink"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 pt-16 pb-10 justify-between">
        <View>
          <View className="flex-row justify-between items-center mb-10">
            <Pressable onPress={() => router.back()}>
              <Text className="text-base text-block-silver" style={{ fontFamily: 'Inter_400Regular' }}>
                ← back
              </Text>
            </Pressable>
            <Text className="text-sm text-block-ash" style={{ fontFamily: 'Inter_400Regular' }}>
              {STEP_INDICATOR}
            </Text>
          </View>

          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            className="mb-8"
          >
            <Text className="text-3xl text-block-snow mb-2" style={{ fontFamily: 'Inter_700Bold', letterSpacing: -0.8 }}>
              make it yours
            </Text>
            <Text className="text-base text-block-silver" style={{ fontFamily: 'Inter_400Regular', lineHeight: 24 }}>
              pick an icon and a display name
            </Text>
          </MotiView>

          {/* Preview */}
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150, delay: 60 }}
            className="items-center mb-8"
          >
            <View style={{
              width: 88, height: 88, borderRadius: 44,
              backgroundColor: '#1A1240',
              borderWidth: 2, borderColor: '#6B52E0',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#6B52E0', shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4, shadowRadius: 12,
            }}>
              <Text style={{ fontSize: 44 }}>{selectedEmoji}</Text>
            </View>
            {(displayName || pendingOnboarding?.username) ? (
              <Text className="text-base text-block-silver mt-3" style={{ fontFamily: 'Inter_500Medium' }}>
                {displayName.trim() || pendingOnboarding?.username}
              </Text>
            ) : null}
          </MotiView>

          {/* Emoji grid */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150, delay: 100 }}
            className="mb-6"
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {AVATAR_EMOJIS.map((emoji, i) => {
                const isSelected = emoji === selectedEmoji;
                return (
                  <MotiView
                    key={emoji}
                    animate={{ scale: isSelected ? 1.08 : 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 300 }}
                  >
                    <Pressable
                      onPress={() => {
                        setSelectedEmoji(emoji);
                        Haptics.selectionAsync();
                      }}
                      style={{
                        width: 52, height: 52, borderRadius: 16,
                        backgroundColor: isSelected ? '#241860' : '#12121C',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#6B52E0' : '#2E2E48',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>{emoji}</Text>
                    </Pressable>
                  </MotiView>
                );
              })}
            </View>
          </MotiView>

          {/* Display name */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150, delay: 160 }}
          >
            <Text className="text-xs text-block-ash mb-2" style={{ fontFamily: 'Inter_500Medium', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              display name (optional)
            </Text>
            <View style={{
              borderRadius: 16, borderWidth: 1.5, borderColor: '#2E2E48',
              backgroundColor: '#1A1A28', paddingHorizontal: 16, paddingVertical: 18,
            }}>
              <TextInput
                ref={inputRef}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={pendingOnboarding?.username ?? 'your name'}
                placeholderTextColor="#3D3D5E"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                maxLength={50}
                style={{ fontSize: 17, color: '#EEEEF8', fontFamily: 'Inter_400Regular', padding: 0 }}
              />
            </View>
            <Text className="text-xs text-block-ash mt-2" style={{ fontFamily: 'Inter_400Regular' }}>
              shown to neighbors · defaults to your username
            </Text>
          </MotiView>
        </View>

        <Pressable
          onPress={handleContinue}
          style={{ borderRadius: 16, paddingVertical: 18, alignItems: 'center', backgroundColor: '#6B52E0' }}
        >
          <Text className="text-lg text-block-snow" style={{ fontFamily: 'Inter_600SemiBold' }}>
            next
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
