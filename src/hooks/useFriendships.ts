import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { isDemoMode, DEMO_FRIENDS } from '@lib/demo';
import type { FriendSummary, FriendRequest } from '@types/models';

// ─── Query keys ──────────────────────────────────────────────────────────────

const KEYS = {
  friends: (uid: string) => ['friends', uid] as const,
  requests: (uid: string) => ['friend-requests', uid] as const,
  search: (q: string) => ['user-search', q] as const,
};

// ─── useFriends ───────────────────────────────────────────────────────────────

export function useFriends() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: KEYS.friends(userId ?? ''),
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<FriendSummary[]> => {
      if (isDemoMode()) return DEMO_FRIENDS[userId!] ?? [];
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          friend_id,
          friendship_level,
          streak_days,
          last_interaction_at,
          friend:users!friendships_friend_id_fkey (
            id,
            username,
            display_name,
            avatar_emoji,
            avatar_url,
            is_online,
            last_seen_at,
            current_mood
          )
        `)
        .eq('user_id', userId!)
        .eq('status', 'accepted')
        .order('last_interaction_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        friendId: row.friend_id,
        username: row.friend?.username ?? '',
        displayName: row.friend?.display_name ?? null,
        avatarEmoji: row.friend?.avatar_emoji ?? null,
        avatarUrl: row.friend?.avatar_url ?? null,
        isOnline: row.friend?.is_online ?? false,
        lastSeenAt: row.friend?.last_seen_at ?? null,
        currentMood: row.friend?.current_mood ?? null,
        friendshipLevel: row.friendship_level ?? 1,
        streakDays: row.streak_days ?? 0,
        lastInteractionAt: row.last_interaction_at ?? null,
      }));
    },
  });

  return { friends: data ?? [], isLoading, error, refetch };
}

// ─── useIncomingFriendRequests ────────────────────────────────────────────────

export function useIncomingFriendRequests() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const { data, isLoading } = useQuery({
    queryKey: KEYS.requests(userId ?? ''),
    enabled: !!userId,
    staleTime: 15_000,
    queryFn: async (): Promise<FriendRequest[]> => {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          created_at,
          requester:users!friendships_user_id_fkey (
            id,
            username,
            display_name,
            avatar_emoji
          )
        `)
        .eq('friend_id', userId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        username: row.requester?.username ?? '',
        displayName: row.requester?.display_name ?? null,
        avatarEmoji: row.requester?.avatar_emoji ?? null,
        createdAt: row.created_at,
      }));
    },
  });

  return { requests: data ?? [], isLoading };
}

// ─── useSendFriendRequest ─────────────────────────────────────────────────────

export function useSendFriendRequest() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId) throw new Error('not authenticated');
      if (targetUserId === userId) throw new Error('cannot add yourself');

      const { error } = await supabase.from('friendships').insert({
        user_id: userId,
        friend_id: targetUserId,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEYS.friends(userId) });
    },
  });
}

// ─── useAcceptFriendRequest ───────────────────────────────────────────────────

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({ requestId, requesterId }: { requestId: string; requesterId: string }) => {
      if (!userId) throw new Error('not authenticated');

      // Accept the incoming request
      const { error: acceptError } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      if (acceptError) throw acceptError;

      // Create the reverse friendship (mutual)
      const { error: reverseError } = await supabase.from('friendships').upsert({
        user_id: userId,
        friend_id: requesterId,
        status: 'accepted',
      });
      if (reverseError) throw reverseError;
    },
    onSuccess: () => {
      if (userId) {
        qc.invalidateQueries({ queryKey: KEYS.friends(userId) });
        qc.invalidateQueries({ queryKey: KEYS.requests(userId) });
      }
    },
  });
}

// ─── useDeclineFriendRequest ──────────────────────────────────────────────────

export function useDeclineFriendRequest() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEYS.requests(userId) });
    },
  });
}

// ─── useRemoveFriend ──────────────────────────────────────────────────────────

export function useRemoveFriend() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!userId) throw new Error('not authenticated');
      // Remove both directions
      await Promise.all([
        supabase.from('friendships').delete().eq('user_id', userId).eq('friend_id', friendId),
        supabase.from('friendships').delete().eq('user_id', friendId).eq('friend_id', userId),
      ]);
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEYS.friends(userId) });
    },
  });
}

// ─── useSearchUsers ───────────────────────────────────────────────────────────

export function useSearchUsers(query: string) {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: KEYS.search(query),
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_emoji, avatar_url')
        .ilike('username', `%${query.trim()}%`)
        .neq('id', userId ?? '')
        .limit(15);

      if (error) throw error;
      return data ?? [];
    },
  });
}
