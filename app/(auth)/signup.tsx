import { useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@stores/auth.store';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);
  const setUser    = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  const [username, setUsername] = useState('');
  const [phone,    setPhone]    = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');

  const usernameClean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const phoneClean    = phone.replace(/\s/g, '');
  const confirmClean  = confirmPhone.replace(/\s/g, '');

  const validate = (): string | null => {
    if (usernameClean.length < 3)     return 'handle must be at least 3 characters';
    if (phoneClean.length < 7)        return 'enter a valid phone number';
    if (phoneClean !== confirmClean)  return 'phone numbers do not match';
    if (password.length < 4)          return 'password must be at least 4 characters';
    if (password !== confirm)         return 'passwords do not match';
    return null;
  };

  const canSubmit =
    usernameClean.length >= 3 &&
    phoneClean.length >= 7 &&
    phoneClean === confirmClean &&
    password.length >= 4 &&
    password === confirm;

  const handleCreate = () => {
    const err = validate();
    if (err) { setError(err); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSession({ user: { id: `user-${usernameClean}` } } as any);
    setUser({
      id: `user-${usernameClean}`,
      username: usernameClean,
      display_name: usernameClean,
      avatar_url: null,
      avatar_emoji: '🌙',
      room_type: 'cozy',
      room_theme: {},
      current_mood: 'peaceful',
      invite_code: 'BLOCK' + Math.floor(1000 + Math.random() * 9000),
      phone_number: phoneClean,
      created_at: new Date().toISOString(),
    } as any);
    setLoading(false);
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { placeholder?: string; secure?: boolean; keyboard?: 'default' | 'phone-pad' | 'email-address'; prefix?: string },
  ) => (
    <View>
      <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48', backgroundColor: '#12121C', paddingHorizontal: 16 }}>
        {opts?.prefix ? (
          <Text style={{ fontSize: 16, color: '#5A5A7A', fontFamily: 'Inter_400Regular', marginRight: 4 }}>{opts.prefix}</Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={(v) => { onChange(v); setError(''); }}
          placeholder={opts?.placeholder ?? label.toLowerCase()}
          placeholderTextColor="#3D3D5E"
          secureTextEntry={opts?.secure}
          keyboardType={opts?.keyboard ?? 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, fontSize: 16, color: '#EEEEF8', fontFamily: 'Inter_400Regular', paddingVertical: 16, padding: 0 }}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#08080F' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#08080F', '#0D0D14', '#1A1240']} locations={[0, 0.5, 1]} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 24, paddingBottom: insets.bottom + 100, gap: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontSize: 15, color: '#7A7A9A', fontFamily: 'Inter_400Regular' }}>cancel</Text>
          </Pressable>
          <Text style={{ fontSize: 17, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>create account</Text>
          <View style={{ width: 52 }} />
        </View>

        {field('handle', usernameClean || username, (v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, '')), { placeholder: 'your_handle', prefix: '@' })}

        {field('phone number', phone, setPhone, { placeholder: '+1 234 567 8900', keyboard: 'phone-pad' })}
        {field('confirm phone', confirmPhone, setConfirmPhone, { placeholder: 'repeat phone number', keyboard: 'phone-pad' })}

        {field('password', password, setPassword, { secure: true, placeholder: 'at least 4 characters' })}
        {field('confirm password', confirm, setConfirm, { secure: true, placeholder: 'repeat password' })}

        {error ? (
          <Text style={{ fontSize: 13, color: '#C84B4B', fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 4 }}>{error}</Text>
        ) : null}
      </ScrollView>

      {/* Create button */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: insets.bottom + 16, paddingTop: 16, backgroundColor: '#08080F', borderTopWidth: 1, borderTopColor: '#1A1A28' }}>
        <Pressable
          onPress={handleCreate}
          disabled={!canSubmit}
          style={{ borderRadius: 20, overflow: 'hidden', opacity: canSubmit ? 1 : 0.4 }}
        >
          <LinearGradient colors={['#8B76F0', '#4C32C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 18, alignItems: 'center' }}>
            <Text style={{ fontSize: 17, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>create my account</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
