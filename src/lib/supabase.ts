import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@types/database';

// AsyncStorage is used here instead of MMKV so the app runs in Expo Go.
// Swap back to MMKV for production builds — it's faster and can encrypt.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// On web with static output, AsyncStorage isn't available during SSR — use
// localStorage as a fallback so session persistence still works in the browser.
const storage = Platform.OS === 'web'
  ? typeof window !== 'undefined' ? AsyncStorage : undefined
  : AsyncStorage;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export const db = supabase;

export const from = <T extends keyof Database['public']['Tables']>(table: T) =>
  supabase.from(table);
