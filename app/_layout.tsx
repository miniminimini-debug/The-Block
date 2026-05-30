import '../global.css';

import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Caveat_400Regular,
  Caveat_700Bold,
} from '@expo-google-fonts/caveat';
import * as SplashScreen from 'expo-splash-screen';

import { queryClient } from '@lib/queryClient';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { isDemoMode } from '@lib/demo';
import { ToastContainer } from '@ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { usePushNotifications } from '@hooks/usePushNotifications';
import { registerBackgroundFetch } from '@lib/backgroundFetch';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Caveat_400Regular,
    Caveat_700Bold,
  });


  // Auth bootstrap
  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (isDemoMode()) return; // demo login already handled auth
        setSession(session);
        if (session) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) setUser(profile as any);
        }
      })
      .catch((err) => console.error('[auth] getSession failed:', err))
      .finally(() => { if (!isDemoMode()) setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (isDemoMode()) return; // don't override demo session
        setSession(session);
        if (!session) {
          setUser(null);
          setLoading(false);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // Background fetch (graceful — no-ops if package not installed)
  useEffect(() => {
    registerBackgroundFetch();
  }, []);

  useEffect(() => {
    if (fontsLoaded && Platform.OS !== 'web') SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded && Platform.OS !== 'web') return <View style={{ flex: 1, backgroundColor: '#08080F' }} />;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#08080F' }}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <RootNavigator />
          <ToastContainer />
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function RootNavigator() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const segments = useSegments();
  const router = useRouter();

  usePushNotifications();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    const authenticated = !!session && !!user;

    // Only redirect when crossing the auth boundary:
    // - authenticated user stuck on an auth screen → send to app
    // - unauthenticated user on any non-auth screen → send to welcome
    if (authenticated && inAuth) {
      router.replace('/(tabs)');
    } else if (!authenticated && !inAuth) {
      router.replace('/(auth)/welcome');
    }
  }, [isLoading, session, user, segments]);

  if (isLoading) return <View style={{ flex: 1, backgroundColor: '#08080F' }} />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="room/[userId]"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="post/[postId]"
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="friends"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="settings"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
