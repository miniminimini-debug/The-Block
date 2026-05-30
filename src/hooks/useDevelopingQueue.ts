import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { useRevealStore } from '@stores/reveal.store';
import { isDemoMode } from '@lib/demo';
import type { ReceivedPost } from '@hooks/usePosts';

const POLL_INTERVAL_MS = 20_000; // tick every 20s while app is foreground

// ─── Query keys ───────────────────────────────────────────────────────────────

export const developingKeys = {
  all: (uid: string) => ['developing', uid] as const,
  darkroom: (uid: string) => ['darkroom', uid] as const,
  feed: (uid: string) => ['feed', uid] as const,
};

// ─── Shared fetcher ───────────────────────────────────────────────────────────

async function fetchIncoming(userId: string): Promise<ReceivedPost[]> {
  const { data, error } = await supabase
    .from('post_recipients')
    .select(`
      id,
      post_id,
      developed_at,
      viewed_at,
      reacted_at,
      post:posts!post_recipients_post_id_fkey (
        id,
        image_url,
        thumbnail_url,
        storage_path,
        note,
        mood,
        development_status,
        developed_at,
        created_at,
        sender:users!posts_user_id_fkey (
          username,
          display_name,
          avatar_emoji
        )
      )
    `)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    recipientRowId: row.id,
    postId: row.post_id,
    imageUrl: row.post?.image_url ?? '',
    thumbnailUrl: row.post?.thumbnail_url ?? null,
    storagePath: row.post?.storage_path ?? '',
    note: row.post?.note ?? null,
    mood: row.post?.mood ?? null,
    developmentStatus: row.post?.development_status ?? 'developing',
    developedAt: row.developed_at ?? row.post?.developed_at ?? '',
    createdAt: row.post?.created_at ?? '',
    viewedAt: row.viewed_at ?? null,
    reactedAt: row.reacted_at ?? null,
    senderUsername: row.post?.sender?.username ?? '',
    senderDisplayName: row.post?.sender?.display_name ?? null,
    senderAvatarEmoji: row.post?.sender?.avatar_emoji ?? null,
  }));
}

// ─── useAllIncoming (base query) ──────────────────────────────────────────────

function useAllIncoming() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const qc = useQueryClient();

  // Single base query — developing/darkroom/feed are derived views of this
  const demo = isDemoMode();

  const query = useQuery({
    queryKey: ['incoming-posts', userId ?? ''],
    enabled: !!userId && !demo,
    staleTime: 10_000,
    queryFn: () => fetchIncoming(userId!),
  });

  // Supabase Realtime subscription — skip in demo mode
  useEffect(() => {
    if (!userId || demo) return;

    const channel = supabase
      .channel(`post_recipients:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_recipients',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['incoming-posts', userId] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, qc, demo]);

  // Foreground polling — skip in demo mode
  useEffect(() => {
    if (!userId || demo) return;

    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['incoming-posts', userId] });
    }, POLL_INTERVAL_MS);

    // Also refetch on app foreground
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        qc.invalidateQueries({ queryKey: ['incoming-posts', userId] });
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [userId, qc]);

  return query;
}

// ─── useDeveloping ────────────────────────────────────────────────────────────
// Posts currently developing (developed_at > now)

export function useDeveloping() {
  const { data: all = [], isLoading } = useAllIncoming();
  const now = Date.now();

  const developing = all.filter(
    (p) => p.developedAt && new Date(p.developedAt).getTime() > now,
  );

  return { developing, isLoading };
}

// ─── useDarkroom ──────────────────────────────────────────────────────────────
// Ready to view (developed_at <= now, viewed_at IS NULL)

export function useDarkroom() {
  const { data: all = [], isLoading } = useAllIncoming();
  const setCount = useRevealStore((s) => s.setDarkroomCount);
  const now = Date.now();

  const darkroom = all.filter(
    (p) =>
      p.developedAt &&
      new Date(p.developedAt).getTime() <= now &&
      p.viewedAt === null,
  );

  // Keep the badge count in sync
  useEffect(() => {
    setCount(darkroom.length);
  }, [darkroom.length, setCount]);

  return { darkroom, isLoading };
}

// ─── useFeed ──────────────────────────────────────────────────────────────────
// Already viewed posts (the main photo feed)

export function useFeed() {
  const { data: all = [], isLoading } = useAllIncoming();
  const now = Date.now();

  const feed = all.filter(
    (p) =>
      p.developedAt &&
      new Date(p.developedAt).getTime() <= now &&
      p.viewedAt !== null,
  );

  return { feed, isLoading };
}

// ─── useCountdown ─────────────────────────────────────────────────────────────
// Returns live { label, progress } for a single post's development timer

export function useCountdown(developedAt: string): { label: string; progress: number } {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const compute = useCallback(() => {
    const now = Date.now();
    const target = new Date(developedAt).getTime();
    const diffMs = target - now;

    if (diffMs <= 0) {
      if (userId) qc.invalidateQueries({ queryKey: ['incoming-posts', userId] });
      return { label: 'ready ✦', progress: 1 };
    }

    const totalMs = target - (target - diffMs); // relative — we need original delay
    const diffMins = Math.ceil(diffMs / 60_000);

    let label: string;
    if (diffMins < 60) label = `${diffMins}m`;
    else if (diffMins < 1440) label = `${Math.ceil(diffMins / 60)}h`;
    else label = `${Math.ceil(diffMins / 1440)}d`;

    // Progress = 0 (just started) → 1 (ready). We don't know total so use rough heuristic.
    const progress = Math.max(0, Math.min(1, 1 - diffMs / (240 * 60_000)));

    return { label, progress };
  }, [developedAt, userId, qc]);

  // We return synchronous value — consumer calls this in render or useEffect
  return compute();
}
