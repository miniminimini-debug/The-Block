import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '@lib/supabase';
import type { Session } from '@supabase/supabase-js';

export interface BlockUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_emoji: string | null;
  room_type: string;
  room_theme: Record<string, unknown>;
  current_mood: string | null;
  invite_code: string;
  phone_number: string | null;
  push_token: string | null;
  birthday: string | null;
  created_at: string;
}

export interface PendingOnboarding {
  username: string;
  displayName: string;
  avatarEmoji: string;
  inviteCode: string;
  birthday: string;
}

interface AuthState {
  session: Session | null;
  user: BlockUser | null;
  isLoading: boolean;
  pendingPhone: string | null;
  pendingOnboarding: PendingOnboarding | null;

  setSession: (session: Session | null) => void;
  setUser: (user: BlockUser | null) => void;
  setLoading: (loading: boolean) => void;
  setPendingOnboarding: (data: Partial<PendingOnboarding> | null) => void;

  sendOtp: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null; hasProfile: boolean }>;
  validateInviteCode: (code: string) => Promise<{ valid: boolean; inviterId: string | null; error: string | null }>;
  completeOnboarding: (roomType: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  immer((set, get) => ({
    session: null,
    user: null,
    isLoading: true,
    pendingPhone: null,
    pendingOnboarding: null,

    setSession: (session) => set((s) => { s.session = session; }),
    setUser: (user) => set((s) => { s.user = user as BlockUser | null; }),
    setLoading: (loading) => set((s) => { s.isLoading = loading; }),

    setPendingOnboarding: (data) =>
      set((s) => {
        if (data === null) {
          s.pendingOnboarding = null;
        } else if (!s.pendingOnboarding) {
          s.pendingOnboarding = {
            username: '',
            displayName: '',
            avatarEmoji: '🌙',
            inviteCode: '',
            birthday: '',
            ...data,
          };
        } else {
          Object.assign(s.pendingOnboarding, data);
        }
      }),

    sendOtp: async (phone) => {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: 'sms' },
      });
      if (error) return { error: error.message };
      set((s) => { s.pendingPhone = phone; });
      return { error: null };
    },

    verifyOtp: async (phone, token) => {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (error || !data.session) {
        return { error: error?.message ?? 'verification failed', hasProfile: false };
      }
      set((s) => {
        s.session = data.session;
        s.pendingPhone = null;
      });

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      if (profile) {
        set((s) => { s.user = profile as BlockUser; });
        return { error: null, hasProfile: true };
      }
      return { error: null, hasProfile: false };
    },

    validateInviteCode: async (code) => {
      const trimmed = code.trim().toUpperCase();
      const { data, error } = await supabase
        .from('invite_codes')
        .select('id, created_by, use_count, max_uses, expires_at')
        .eq('code', trimmed)
        .single();

      if (error || !data) return { valid: false, inviterId: null, error: 'invite code not found' };
      if (data.use_count >= data.max_uses) return { valid: false, inviterId: null, error: 'this code has already been used' };
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { valid: false, inviterId: null, error: 'this invite code has expired' };
      }
      return { valid: true, inviterId: data.created_by, error: null };
    },

    completeOnboarding: async (roomType) => {
      const { session, pendingOnboarding } = get();
      if (!session) return { error: 'no session found' };
      if (!pendingOnboarding) return { error: 'onboarding data missing' };

      const userId = session.user.id;

      // 1. Upsert user profile
      const { error: profileError } = await supabase.from('users').upsert({
        id: userId,
        username: pendingOnboarding.username,
        display_name: pendingOnboarding.displayName || pendingOnboarding.username,
        avatar_emoji: pendingOnboarding.avatarEmoji,
        room_type: roomType,
        room_theme: {},
        birthday: pendingOnboarding.birthday || null,
      });
      if (profileError) return { error: profileError.message };

      // 2. Mark invite code as used
      const code = pendingOnboarding.inviteCode.trim().toUpperCase();
      const { data: inviteData } = await supabase
        .from('invite_codes')
        .select('id, created_by, use_count')
        .eq('code', code)
        .single();

      if (inviteData) {
        await supabase
          .from('invite_codes')
          .update({ used_by: userId, used_at: new Date().toISOString(), use_count: inviteData.use_count + 1 })
          .eq('code', code);

        // 3. Create mutual friendship between inviter and new user
        const inviterId = inviteData.created_by;
        if (inviterId && inviterId !== userId) {
          await supabase.from('friendships').upsert([
            { user_id: inviterId, friend_id: userId, status: 'accepted' },
            { user_id: userId, friend_id: inviterId, status: 'accepted' },
          ]);
        }
      }

      // 4. Load and store the completed profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        set((s) => {
          s.user = profile as BlockUser;
          s.pendingOnboarding = null;
        });
      }
      return { error: null };
    },

    signOut: async () => {
      await supabase.auth.signOut();
      set((s) => {
        s.session = null;
        s.user = null;
        s.pendingPhone = null;
        s.pendingOnboarding = null;
        s.isLoading = false;
      });
    },

    refreshUser: async () => {
      const session = get().session;
      if (!session) return;
      const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      if (data) set((s) => { s.user = data as BlockUser; });
    },
  }))
);
