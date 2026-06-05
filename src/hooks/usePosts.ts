import { generateId } from '@lib/uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { supabase } from '@lib/supabase';
import { uploadPostPhoto } from '@lib/storage';
import { queryKeys } from '@lib/queryClient';
import { useAuthStore } from '@stores/auth.store';
import { useCameraStore } from '@stores/camera.store';
import type { MoodType } from '@types/database';
import type { DevelopmentDelay } from '@stores/camera.store';

export interface CreatePostInput {
  imageUri: string;
  note?: string;
  mood?: MoodType | null;
  recipientIds: string[];
  developmentDelay: DevelopmentDelay;
}

export interface ReceivedPost {
  recipientRowId: string;
  postId: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  storagePath: string;
  note: string | null;
  mood: string | null;
  developmentStatus: 'developing' | 'developed';
  developedAt: string;       // ISO — when the post becomes visible
  createdAt: string;         // ISO — when sent
  viewedAt: string | null;
  reactedAt: string | null;
  senderUsername: string;
  senderDisplayName: string | null;
  senderAvatarEmoji: string | null;
}

function delayToMinutes(delay: DevelopmentDelay): number {
  if (delay === 'overnight') {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return Math.round((tomorrow.getTime() - now.getTime()) / 60000);
  }
  return delay;
}

// ─── useCreatePost ────────────────────────────────────────────────────────────

export function useCreatePost() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  const setUploadProgress = useCameraStore((s) => s.setUploadProgress);
  const reset = useCameraStore((s) => s.reset);

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!userId) throw new Error('Not authenticated');

      const postId = generateId();
      const delayMins = delayToMinutes(input.developmentDelay);

      const { originalUrl, thumbnailUrl, path } = await uploadPostPhoto(
        userId,
        postId,
        input.imageUri,
        setUploadProgress,
      );

      const { error: postError } = await supabase.from('posts').insert({
        id: postId,
        user_id: userId,
        image_url: originalUrl,
        thumbnail_url: thumbnailUrl,
        storage_path: path,
        note: input.note || null,
        mood: input.mood || null,
        development_status: 'developing',
        development_delay_mins: delayMins,
      });
      if (postError) throw new Error(postError.message);

      if (input.recipientIds.length > 0) {
        const { error: recipError } = await supabase.from('post_recipients').insert(
          input.recipientIds.map((rid) => ({
            post_id: postId,
            recipient_id: rid,
            development_delay_mins: delayMins,
          })),
        );
        if (recipError) throw new Error(recipError.message);
      }

      return { postId, delayMins };
    },
    onSuccess: () => {
      // Close the composer and reset camera so the user is back at the viewfinder
      reset();
      queryClient.invalidateQueries({ queryKey: queryKeys.posts(userId ?? '') });
    },
    onError: (err: any) => {
      reset();
      Alert.alert(
        'Could not send',
        err?.message ?? 'Check your connection and try again.',
      );
    },
  });
}

// ─── useIncomingPosts ─────────────────────────────────────────────────────────

export function useIncomingPosts() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: [...queryKeys.posts(userId ?? ''), 'incoming'],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<ReceivedPost[]> => {
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
        .eq('recipient_id', userId!)
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
    },
  });
}

// ─── useMyPosts ───────────────────────────────────────────────────────────────

export function useMyPosts() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: queryKeys.posts(userId ?? ''),
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── useMarkPostViewed ────────────────────────────────────────────────────────

export function useMarkPostViewed() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!userId) return;
      await supabase
        .from('post_recipients')
        .update({ viewed_at: new Date().toISOString() })
        .eq('post_id', postId)
        .eq('recipient_id', userId)
        .is('viewed_at', null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.posts(userId ?? ''), 'incoming'] });
    },
  });
}

// ─── useAddReaction ───────────────────────────────────────────────────────────

export function useAddReaction() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({ postId, emoji }: { postId: string; emoji: string }) => {
      if (!userId) return;
      await supabase
        .from('reactions')
        .upsert({ post_id: postId, user_id: userId, emoji });

      await supabase
        .from('post_recipients')
        .update({ reacted_at: new Date().toISOString() })
        .eq('post_id', postId)
        .eq('recipient_id', userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.posts(userId ?? ''), 'incoming'] });
    },
  });
}
