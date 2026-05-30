import { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@stores/auth.store';

const STEP_INDICATOR = '4 of 5';

function isValidDate(month: number, day: number, year: number): boolean {
  if (year < 1900 || year > new Date().getFullYear() - 13) return false;
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
}

export default function BirthdayScreen() {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const setPendingOnboarding = useAuthStore((s) => s.setPendingOnboarding);

  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  const isValid = month.length > 0 && day.length > 0 && year.length === 4 && isValidDate(m, d, y);

  const handleSubmit = () => {
    if (!isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const formatted = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingOnboarding({ birthday: formatted });
    router.push('/(auth)/onboarding/room');
  };

  const monthError = month.length === 2 && (m < 1 || m > 12);
  const dayError = day.length === 2 && (d < 1 || d > 31);
  const yearError = year.length === 4 && !isValid;

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
              when's your birthday?
            </Text>
            <Text className="text-base text-block-silver" style={{ fontFamily: 'Inter_400Regular', lineHeight: 24 }}>
              shown on your polaroid, nothing else
            </Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150, delay: 80 }}
          >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              {/* Month */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: '#5A5A7A', fontFamily: 'Inter_500Medium', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
                  month
                </Text>
                <MotiView
                  animate={{ borderColor: monthError ? '#FF6B6B' : month.length === 2 && !monthError ? '#4ADE80' : '#2E2E48' }}
                  transition={{ type: 'timing', duration: 150 }}
                  style={{ borderRadius: 16, borderWidth: 1.5, backgroundColor: '#1A1A28', paddingHorizontal: 12, paddingVertical: 18 }}
                >
                  <TextInput
                    value={month}
                    onChangeText={(v) => {
                      const clean = v.replace(/\D/g, '').slice(0, 2);
                      setMonth(clean);
                      if (clean.length === 2) dayRef.current?.focus();
                    }}
                    placeholder="MM"
                    placeholderTextColor="#3D3D5E"
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{ fontSize: 22, color: '#EEEEF8', fontFamily: 'Inter_400Regular', padding: 0, textAlign: 'center' }}
                  />
                </MotiView>
              </View>

              <Text style={{ color: '#3D3D5E', fontSize: 22, paddingBottom: 18 }}>/</Text>

              {/* Day */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: '#5A5A7A', fontFamily: 'Inter_500Medium', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
                  day
                </Text>
                <MotiView
                  animate={{ borderColor: dayError ? '#FF6B6B' : day.length === 2 && !dayError ? '#4ADE80' : '#2E2E48' }}
                  transition={{ type: 'timing', duration: 150 }}
                  style={{ borderRadius: 16, borderWidth: 1.5, backgroundColor: '#1A1A28', paddingHorizontal: 12, paddingVertical: 18 }}
                >
                  <TextInput
                    ref={dayRef}
                    value={day}
                    onChangeText={(v) => {
                      const clean = v.replace(/\D/g, '').slice(0, 2);
                      setDay(clean);
                      if (clean.length === 2) yearRef.current?.focus();
                    }}
                    placeholder="DD"
                    placeholderTextColor="#3D3D5E"
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{ fontSize: 22, color: '#EEEEF8', fontFamily: 'Inter_400Regular', padding: 0, textAlign: 'center' }}
                  />
                </MotiView>
              </View>

              <Text style={{ color: '#3D3D5E', fontSize: 22, paddingBottom: 18 }}>/</Text>

              {/* Year */}
              <View style={{ flex: 2 }}>
                <Text style={{ fontSize: 10, color: '#5A5A7A', fontFamily: 'Inter_500Medium', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
                  year
                </Text>
                <MotiView
                  animate={{ borderColor: yearError ? '#FF6B6B' : year.length === 4 && !yearError ? '#4ADE80' : '#2E2E48' }}
                  transition={{ type: 'timing', duration: 150 }}
                  style={{ borderRadius: 16, borderWidth: 1.5, backgroundColor: '#1A1A28', paddingHorizontal: 12, paddingVertical: 18 }}
                >
                  <TextInput
                    ref={yearRef}
                    value={year}
                    onChangeText={(v) => setYear(v.replace(/\D/g, '').slice(0, 4))}
                    placeholder="YYYY"
                    placeholderTextColor="#3D3D5E"
                    keyboardType="number-pad"
                    maxLength={4}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    style={{ fontSize: 22, color: '#EEEEF8', fontFamily: 'Inter_400Regular', padding: 0, textAlign: 'center' }}
                  />
                </MotiView>
              </View>
            </View>

            {yearError && (
              <Text style={{ fontSize: 12, color: '#FF6B6B', fontFamily: 'Inter_400Regular', marginTop: 8 }}>
                must be 13 or older
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
