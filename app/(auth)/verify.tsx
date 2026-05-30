import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@stores/auth.store';

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const pendingPhone = useAuthStore((s) => s.pendingPhone);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);

  // Resend cooldown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    const code = otp.join('');
    if (code.length === OTP_LENGTH && !otp.includes('')) {
      handleVerify(code);
    }
  }, [otp]);

  const handleVerify = async (code: string) => {
    if (!pendingPhone || isVerifying) return;
    setIsVerifying(true);
    setError(null);

    const { error: verifyError, hasProfile } = await verifyOtp(pendingPhone, code);

    if (verifyError) {
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setError("that code didn't work. try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsVerifying(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (hasProfile) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/onboarding/invite');
      }
    }
  };

  const handleDigitChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError(null);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!pendingPhone || resendCooldown > 0) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    setError(null);
    setResendCooldown(30);
    await sendOtp(pendingPhone);
    inputRefs.current[0]?.focus();
  };

  const masked = pendingPhone
    ? `${pendingPhone.slice(0, -4).replace(/\d/g, '·')}${pendingPhone.slice(-4)}`
    : '';

  const filledCount = otp.filter(Boolean).length;

  return (
    <View className="flex-1 bg-block-ink px-6 pt-16 pb-10">
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
        className="mb-10 gap-2"
      >
        <Text className="text-3xl text-block-snow" style={{ fontFamily: 'Inter_700Bold', letterSpacing: -0.8 }}>
          check your texts
        </Text>
        <Text className="text-base text-block-silver" style={{ fontFamily: 'Inter_400Regular', lineHeight: 24 }}>
          we sent a 6-digit code to{' '}
          <Text className="text-block-snow" style={{ fontFamily: 'Inter_500Medium' }}>{masked}</Text>
        </Text>
      </MotiView>

      {/* OTP Boxes */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 400, delay: 150 }}
        className="flex-row gap-2 justify-center mb-6"
      >
        {otp.map((digit, i) => {
          const isActive = i === filledCount && !isVerifying;
          const isFilled = !!digit;
          return (
            <View
              key={i}
              style={{
                width: 52,
                height: 64,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: isActive
                  ? '#8B76F0'
                  : isFilled
                  ? '#6B52E0'
                  : '#2E2E48',
                backgroundColor: isActive
                  ? '#1A1240'
                  : isFilled
                  ? '#241860'
                  : '#1A1A28',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TextInput
                ref={(ref) => { inputRefs.current[i] = ref; }}
                value={digit}
                onChangeText={(v) => handleDigitChange(v, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={i === 0}
                selectTextOnFocus
                caretHidden
                style={{
                  width: '100%',
                  height: '100%',
                  textAlign: 'center',
                  fontSize: 24,
                  color: '#EEEEF8',
                  fontFamily: 'Inter_700Bold',
                }}
              />
            </View>
          );
        })}
      </MotiView>

      {/* Error */}
      {error && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 200 }}
          className="mb-4"
        >
          <Text className="text-sm text-block-error text-center" style={{ fontFamily: 'Inter_400Regular' }}>
            {error}
          </Text>
        </MotiView>
      )}

      {/* Verify button */}
      <Pressable
        onPress={() => handleVerify(otp.join(''))}
        disabled={filledCount < OTP_LENGTH || isVerifying}
        className={`rounded-2xl py-5 items-center mb-5 ${
          filledCount < OTP_LENGTH || isVerifying ? 'bg-block-slate' : 'bg-block-lavender'
        }`}
      >
        <Text className="text-lg text-block-snow" style={{ fontFamily: 'Inter_600SemiBold' }}>
          {isVerifying ? 'verifying...' : 'verify'}
        </Text>
      </Pressable>

      {/* Resend */}
      <Pressable onPress={handleResend} disabled={resendCooldown > 0} className="items-center">
        <Text
          className={`text-sm ${resendCooldown > 0 ? 'text-block-ash' : 'text-block-lavender-light'}`}
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          {resendCooldown > 0 ? `resend in ${resendCooldown}s` : 'resend code'}
        </Text>
      </Pressable>
    </View>
  );
}
