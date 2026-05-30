import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';

export function useMyInviteCode() {
  const user = useAuthStore((s) => s.user);
  return user?.invite_code ?? null;
}

export function useShareInvite() {
  const user = useAuthStore((s) => s.user);

  const share = async () => {
    if (!user?.invite_code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `join me on the block 🏠\n\nuse my invite code: ${user.invite_code}`,
      title: 'join the block',
    }).catch(() => {});
  };

  return { share, code: user?.invite_code ?? null };
}

// Uses RN Share sheet as the "copy" mechanism — works on both iOS and Android
// without any extra native module. iOS share sheet has a native "Copy" action.
export function useCopyInviteCode() {
  const user = useAuthStore((s) => s.user);
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<boolean> => {
    if (!user?.invite_code) return false;

    // Try expo-clipboard if installed, otherwise fall back to Share
    try {
      // Dynamic require so bundler doesn't fail if package is absent
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Clipboard = require('expo-clipboard');
      await Clipboard.setStringAsync(user.invite_code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      // expo-clipboard not installed — open share sheet instead
      await Share.share({ message: user.invite_code });
      return true;
    }
  };

  return { copy, code: user?.invite_code ?? null, copied };
}

export function useCreateInviteCode() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('not authenticated');
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

      const { data, error } = await supabase
        .from('invite_codes')
        .insert({ code, created_by: userId, max_uses: 1, use_count: 0 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-invite-codes'] }),
  });
}

export function useMyInviteCodes() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['my-invite-codes', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('id, code, use_count, max_uses, expires_at, created_at, used_at')
        .eq('created_by', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
