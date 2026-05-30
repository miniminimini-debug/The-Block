import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@stores/auth.store';

const USERNAME_RE = /^[a-z0-9_]+$/;
const STEP_INDICATOR = '2 of 5';

export default function UsernameScreen() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const setPendingOnboarding = useAuthStore((s) => s.setPendingOnboarding);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const trimmed = username.trim().toLowerCase();
  const isValid = trimmed.length >= 2 && trimmed.length <= 30 && USERNAME_RE.test(trimmed);

  const handleSubmit = () => {
    setError(null);
    if (!isValid) {
      setError('2–30 chars · letters, numbers, underscores only');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingOnboarding({ username: trimmed });
    router.push('/(auth)/onboarding/avatar');
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
              what should we call you?
            </Text>
            <Text className="text-base text-block-silver" style={{ fontFamily: 'Inter_400Regular', lineHeight: 24 }}>
              this is your username on the block
            </Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150, delay: 80 }}
          >
            <MotiView
              animate={{ borderColor: error ? '#FF6B6B' : isValid && trimmed.length > 0 ? '#4ADE80' : '#2E2E48' }}
              transition={{ type: 'timing', duration: 150 }}
              style={{
                borderRadius: 16,
                borderWidth: 1.5,
                backgroundColor: '#1A1A28',
                paddingHorizontal: 16,
                paddingVertical: 18,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text className="text-base text-block-mist" style={{ fontFamily: 'Inter_400Regular', marginRight: 2 }}>
                @
              </Text>
              <TextInput
                ref={inputRef}
                value={username}
                onChangeText={(v) => {
                  setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  setError(null);
                }}
                placeholder="your_username"
                placeholderTextColor="#3D3D5E"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                maxLength={30}
                style={{
                  flex: 1,
                  fontSize: 17,
                  color: '#EEEEF8',
                  fontFamily: 'Inter_400Regular',
                  padding: 0,
                }}
              />
              {isValid && trimmed.length > 0 && (
                <Text className="text-block-success text-base" style={{ fontFamily: 'Inter_600SemiBold' }}>✓</Text>
              )}
            </MotiView>

            {error ? (
              <Text className="text-sm text-block-error mt-2 ml-1" style={{ fontFamily: 'Inter_400Regular' }}>
                {error}
              </Text>
            ) : (
              <Text className="text-xs text-block-ash mt-2 ml-1" style={{ fontFamily: 'Inter_400Regular' }}>
                {username.length}/30 · visible to your neighbors
              </Text>
            )}
          </MotiView>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!isValid}
          style={{
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: 'center',
            backgroundColor: !isValid ? '#2E2E48' : '#6B52E0',
          }}
        >
          <Text className="text-lg text-block-snow" style={{ fontFamily: 'Inter_600SemiBold' }}>
            next
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
