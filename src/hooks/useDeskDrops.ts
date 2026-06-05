import { generateId } from '@lib/uuid';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { isDemoMode } from '@lib/demo';
import { uploadDeskDrop } from '@lib/storage';
import type { DeskDrop } from '@types/models';

// ─── Query keys ───────────────────────────────────────────────────────────────

const KEYS = {
  myDrops: (uid: string) => ['desk-drops', uid] as const,
};

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchMyDrops(userId: string): Promise<DeskDrop[]> {
  const { data, error } = await supabase
    .from('desk_drops')
    .select(`
      id, sender_id, recipient_id, image_url, thumbnail_url,
      storage_path, note, is_discovered, discovered_at, created_at,
      sender:users!desk_drops_sender_id_fkey (username, display_name, avatar_emoji)
    `)
    .eq('recipient_id', userId)
    .eq('is_discovered', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((d: any): DeskDrop => ({
    id: d.id,
    senderId: d.sender_id,
    recipientId: d.recipient_id,
    imageUrl: d.image_url ?? null,
    thumbnailUrl: d.thumbnail_url ?? null,
    storagePath: d.storage_path ?? null,
    note: d.note ?? null,
    isDiscovered: d.is_discovered,
    discoveredAt: d.discovered_at ?? null,
    createdAt: d.created_at,
    sender: d.sender,
  }));
}

// ─── useMyDeskDrops ───────────────────────────────────────────────────────────

export function useMyDeskDrops() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEYS.myDrops(userId ?? ''),
    enabled: !!userId && !isDemoMode(),
    staleTime: 20_000,
    queryFn: () => fetchMyDrops(userId!),
  });

  // Realtime: new drops arrive
  useEffect(() => {
    if (!userId || isDemoMode()) return;

    const channel = supabase
      .channel(`desk_drops:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'desk_drops',
        filter: `recipient_id=eq.${userId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: KEYS.myDrops(userId) });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);

  return {
    drops: query.data ?? [],
    hasDrops: (query.data?.length ?? 0) > 0,
    isLoading: query.isLoading,
  };
}

// ─── useSendDeskDrop ──────────────────────────────────────────────────────────

export function useSendDeskDrop() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      recipientId, imageUri, note,
    }: {
      recipientId: string;
      imageUri?: string;
      note?: string;
    }) => {
      if (!userId) throw new Error('not authenticated');

      let imageUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      let storagePath: string | null = null;

      if (imageUri) {
        const dropId = generateId();
        const result = await uploadDeskDrop(userId, dropId, imageUri);
        imageUrl = result.originalUrl;
        thumbnailUrl = result.thumbnailUrl;
        storagePath = result.path;
      }

      const { error } = await supabase.from('desk_drops').insert({
        sender_id: userId,
        recipient_id: recipientId,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        storage_path: storagePath,
        note: note ?? null,
      });

      if (error) throw error;
    },
  });
}

// ─── useDrop (single) ────────────────────────────────────────────────────────

export function useDrop(dropId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['drop', dropId] as const,
    enabled: !!dropId && !isDemoMode(),
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('desk_drops')
        .select(`
          id, sender_id, recipient_id, image_url, thumbnail_url,
          storage_path, note, is_discovered, discovered_at, created_at,
          sender:users!desk_drops_sender_id_fkey (username, display_name, avatar_emoji)
        `)
        .eq('id', dropId)
        .single();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        senderId: (data as any).sender_id,
        recipientId: (data as any).recipient_id,
        imageUrl: (data as any).image_url ?? null,
        thumbnailUrl: (data as any).thumbnail_url ?? null,
        storagePath: (data as any).storage_path ?? null,
        note: (data as any).note ?? null,
        isDiscovered: (data as any).is_discovered,
        discoveredAt: (data as any).discovered_at ?? null,
        createdAt: (data as any).created_at,
        sender: (data as any).sender,
      } as import('@types/models').DeskDrop;
    },
  });

  return { drop: query.data ?? null, isLoading: query.isLoading };
}

// ─── useDiscoverDrop ──────────────────────────────────────────────────────────

export function useDiscoverDrop() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (dropId: string) => {
      const { error } = await supabase
        .from('desk_drops')
        .update({ is_discovered: true, discovered_at: new Date().toISOString() })
        .eq('id', dropId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myDrops(userId) });
    },
  });
}
