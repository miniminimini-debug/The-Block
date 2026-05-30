import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@stores/auth.store';

export default function InviteScreen() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const validateInviteCode = useAuthStore((s) => s.validateInviteCode);
  const setPendingOnboarding = useAuthStore((s) => s.setPendingOnboarding);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const formatted = code.trim().toUpperCase();
  const canSubmit = formatted.length >= 4 && !isValidating;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setIsValidating(true);

    const { valid, error: valError } = await validateInviteCode(formatted);
    setIsValidating(false);

    if (!valid) {
      setError(valError ?? 'invalid invite code');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsValid(false);
      return;
    }

    setIsValid(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPendingOnboarding({ inviteCode: formatted });

    setTimeout(() => router.push('/(auth)/onboarding/username'), 300);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-block-ink"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 pt-16 pb-10 justify-between">
        <View>
          <Pressable onPress={() => router.back()} className="mb-10">
            <Text className="text-base text-block-silver" style={{ fontFamily: 'Inter_400Regular' }}>
              ← back
            </Text>
          </Pressable>

          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            className="mb-8"
          >
            <Text className="text-3xl text-block-snow mb-2" style={{ fontFamily: 'Inter_700Bold', letterSpacing: -0.8 }}>
              you need an invite
            </Text>
            <Text className="text-base text-block-silver" style={{ fontFamily: 'Inter_400Regular', lineHeight: 24 }}>
              the block is invite-only.{'\n'}ask a friend for their code.
            </Text>
          </MotiView>

          {/* Invite code input */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150, delay: 80 }}
          >
            <MotiView
              animate={{
                borderColor: error ? '#FF6B6B' : isValid ? '#4ADE80' : '#2E2E48',
              }}
              transition={{ type: 'timing', duration: 150 }}
              style={{
                borderRadius: 16,
                borderWidth: 1.5,
                backgroundColor: '#1A1A28',
                paddingHorizontal: 20,
                paddingVertical: 20,
                alignItems: 'center',
              }}
            >
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(v) => {
                  setCode(v.replace(/[^a-zA-Z0-9]/g, ''));
                  setError(null);
                  setIsValid(false);
                }}
                placeholder="ENTER CODE"
                placeholderTextColor="#3D3D5E"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                maxLength={12}
                style={{
                  fontSize: 28,
                  color: isValid ? '#4ADE80' : '#EEEEF8',
                  fontFamily: 'Inter_700Bold',
                  letterSpacing: 4,
                  textAlign: 'center',
                  padding: 0,
                  width: '100%',
                }}
              />
            </MotiView>

            {error ? (
              <MotiView
                from={{ opacity: 0, translateY: -4 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 200 }}
                className="mt-3"
              >
                <Text className="text-sm text-block-error text-center" style={{ fontFamily: 'Inter_400Regular' }}>
                  {error}
                </Text>
              </MotiView>
            ) : isValid ? (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                className="mt-3"
              >
                <Text className="text-sm text-block-success text-center" style={{ fontFamily: 'Inter_500Medium' }}>
                  ✓ invite accepted — welcome to the block
                </Text>
              </MotiView>
            ) : null}
          </MotiView>

          {/* What is the block */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 600, delay: 400 }}
            className="mt-8"
          >
            <LinearGradient
              colors={['#1A1240', '#12121C']}
              style={{ borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#241860' }}
            >
              <Text className="text-xs text-block-lavender-light mb-3" style={{ fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>
                what is the block?
              </Text>
              {[
                '✦  no strangers, only your people',
                '✦  photos develop slowly, like film',
                '✦  no likes, no counts, no pressure',
                '✦  your cozy corner of the internet',
              ].map((line, i) => (
                <Text key={i} className="text-sm text-block-silver mb-1.5" style={{ fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
                  {line}
                </Text>
              ))}
            </LinearGradient>
          </MotiView>
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 130, delay: 200 }}
        >
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={{
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              backgroundColor: !canSubmit ? '#2E2E48' : '#6B52E0',
            }}
          >
            <Text className="text-lg text-block-snow" style={{ fontFamily: 'Inter_600SemiBold' }}>
              {isValidating ? 'checking...' : 'continue'}
            </Text>
          </Pressable>
        </MotiView>
      </View>
    </KeyboardAvoidingView>
  );
}
