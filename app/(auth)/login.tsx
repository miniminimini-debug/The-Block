import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@stores/auth.store';

export default function LoginScreen() {
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLocalLoading] = useState(false);

  const DEMO_ACCOUNTS: Record<string, { id: string; username: string; display_name: string; avatar_emoji: string }> = {
    'demo':  { id: 'demo-user',   username: 'demo',  display_name: 'Demo',   avatar_emoji: '🌙' },
    'demo2': { id: 'demo-user-2', username: 'demo2', display_name: 'Demo 2', avatar_emoji: '⭐' },
  };

  const handleLogin = () => {
    setError('');
    const key = username.trim().toLowerCase();
    const account = DEMO_ACCOUNTS[key];
    if (!account || password !== key) {
      setError('wrong username or password');
      return;
    }
    setLocalLoading(true);
    setSession({ user: { id: account.id } } as any);
    setUser({
      id: account.id,
      username: account.username,
      display_name: account.display_name,
      avatar_url: null,
      avatar_emoji: account.avatar_emoji,
      room_type: 'cozy',
      room_theme: {},
      current_mood: 'peaceful',
      invite_code: 'BLOCK2025',
      phone_number: null,
      created_at: new Date().toISOString(),
    } as any);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#08080F' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#08080F', '#0D0D14', '#1A1240']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      />

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
          style={{ gap: 28 }}
        >
          {/* Title */}
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 36, color: '#EEEEF8', fontFamily: 'Inter_700Bold', letterSpacing: -1 }}>
              welcome back
            </Text>
            <Text style={{ fontSize: 14, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
              sign in to your block
            </Text>
          </View>

          {/* Fields */}
          <View style={{ gap: 12 }}>
            <View style={{
              borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48',
              backgroundColor: '#12121C', paddingHorizontal: 16,
            }}>
              <TextInput
                value={username}
                onChangeText={(t) => { setUsername(t); setError(''); }}
                placeholder="username"
                placeholderTextColor="#3D3D5E"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  fontSize: 16, color: '#EEEEF8', fontFamily: 'Inter_400Regular',
                  paddingVertical: 16, padding: 0,
                }}
              />
            </View>

            <View style={{
              borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48',
              backgroundColor: '#12121C', paddingHorizontal: 16,
            }}>
              <TextInput
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                placeholder="password"
                placeholderTextColor="#3D3D5E"
                secureTextEntry
                style={{
                  fontSize: 16, color: '#EEEEF8', fontFamily: 'Inter_400Regular',
                  paddingVertical: 16, padding: 0,
                }}
              />
            </View>

            {error ? (
              <Text style={{ fontSize: 13, color: '#C84B4B', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                {error}
              </Text>
            ) : null}
          </View>

          {/* Button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading || !username.trim() || !password}
            style={{ borderRadius: 20, overflow: 'hidden', opacity: (!username.trim() || !password) ? 0.5 : 1 }}
          >
            <LinearGradient
              colors={['#8B76F0', '#4C32C0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 18, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 17, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>
                sign in
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Back */}
          <Pressable onPress={() => router.back()} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#3D3D5E', fontFamily: 'Inter_400Regular' }}>
              back
            </Text>
          </Pressable>
        </MotiView>
      </View>
    </KeyboardAvoidingView>
  );
}
