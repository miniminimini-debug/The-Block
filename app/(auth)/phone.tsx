import { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@stores/auth.store';

export default function PhoneScreen() {
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendOtp = useAuthStore((s) => s.sendOtp);
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    setError(null);
    const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;

    if (fullPhone.length < 10) {
      setError('enter a valid phone number');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    const { error: sendError } = await sendOtp(fullPhone);
    setIsLoading(false);

    if (sendError) {
      setError(sendError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/(auth)/verify');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-block-ink"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 pt-16 pb-10 justify-between">
        <View>
          {/* Back */}
          <Pressable onPress={() => router.back()} className="mb-10">
            <Text className="text-base text-block-silver" style={{ fontFamily: 'Inter_400Regular' }}>
              ← back
            </Text>
          </Pressable>

          {/* Header */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            className="mb-8 gap-2"
          >
            <Text className="text-3xl text-block-snow" style={{ fontFamily: 'Inter_700Bold', letterSpacing: -0.8 }}>
              what's your number?
            </Text>
            <Text className="text-base text-block-silver" style={{ fontFamily: 'Inter_400Regular' }}>
              we'll text you a code. no spam, ever.
            </Text>
          </MotiView>

          {/* Input */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150, delay: 100 }}
          >
            <View
              className="flex-row rounded-2xl overflow-hidden border border-block-slate bg-block-dusk"
              style={{ borderWidth: 1.5 }}
            >
              {/* Country code */}
              <Pressable
                className="px-4 py-5 border-r border-block-slate justify-center"
                onPress={() => {
                  /* TODO: country picker modal */
                }}
              >
                <Text className="text-base text-block-snow" style={{ fontFamily: 'Inter_400Regular' }}>
                  🇺🇸 {countryCode}
                </Text>
              </Pressable>

              {/* Phone number */}
              <TextInput
                ref={inputRef}
                className="flex-1 px-4 py-5 text-base text-block-snow"
                style={{ fontFamily: 'Inter_400Regular' }}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v.replace(/[^\d\s\-()]/g, ''));
                  setError(null);
                }}
                keyboardType="phone-pad"
                placeholder="(555) 000-0000"
                placeholderTextColor="#7A7A9A"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            {/* Error */}
            {error && (
              <MotiView
                from={{ opacity: 0, translateY: -4 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 200 }}
                className="mt-2 ml-1"
              >
                <Text className="text-sm text-block-error" style={{ fontFamily: 'Inter_400Regular' }}>
                  {error}
                </Text>
              </MotiView>
            )}
          </MotiView>
        </View>

        {/* Bottom actions */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 400, delay: 200 }}
          className="gap-4"
        >
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading || phone.length < 7}
            className={`rounded-2xl py-5 items-center ${
              isLoading || phone.length < 7
                ? 'bg-block-slate'
                : 'bg-block-lavender'
            }`}
          >
            <Text
              className="text-lg text-block-snow"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {isLoading ? 'sending...' : 'send code'}
            </Text>
          </Pressable>

          <Text className="text-sm text-block-ash text-center" style={{ fontFamily: 'Inter_400Regular' }}>
            by continuing you agree to our privacy policy
          </Text>
        </MotiView>
      </View>
    </KeyboardAvoidingView>
  );
}
