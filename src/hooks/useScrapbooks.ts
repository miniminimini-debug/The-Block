import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { isDemoMode } from '@lib/demo';
import { uploadScrapbookItem } from '@lib/storage';
import type { Scrapbook, ScrapbookPage, ScrapbookItem } from '@types/models';

const KEYS = {
  myScrapbooks: (uid: string) => ['scrapbooks', uid] as const,
  scrapbook: (id: string) => ['scrapbook', id] as const,
};

function mapScrapbook(s: any): Scrapbook {
  return {
    id: s.id,
    creatorId: s.creator_id,
    title: s.title,
    coverEmoji: s.cover_emoji ?? '📒',
    description: s.description ?? null,
    isFinished: s.is_finished,
    createdAt: s.created_at,
    pageCount: s.page_count?.[0]?.count ?? 0,
    members: (s.members ?? []).map((m: any) => ({
      id: m.id, scrapbookId: s.id, userId: m.user_id, joinedAt: m.joined_at, user: m.user,
    })),
  };
}

function mapPage(p: any): ScrapbookPage {
  return {
    id: p.id,
    scrapbookId: p.scrapbook_id,
    pageNumber: p.page_number,
    layout: p.layout,
    title: p.title ?? null,
    createdAt: p.created_at,
    items: (p.items ?? []).map(mapItem),
  };
}

function mapItem(i: any): ScrapbookItem {
  return {
    id: i.id,
    pageId: i.page_id,
    scrapbookId: i.scrapbook_id,
    creatorId: i.creator_id,
    imageUrl: i.image_url ?? null,
    thumbnailUrl: i.thumbnail_url ?? null,
    storagePath: i.storage_path ?? null,
    note: i.note ?? null,
    posX: i.pos_x ?? 0,
    posY: i.pos_y ?? 0,
    rotation: i.rotation ?? 0,
    scale: i.scale ?? 1,
    orderIndex: i.order_index ?? 0,
    createdAt: i.created_at,
    creator: i.creator,
  };
}

async function fetchMyScrapbooks(userId: string): Promise<Scrapbook[]> {
  const { data, error } = await supabase
    .from('scrapbook_members')
    .select(`
      scrapbook:scrapbooks!scrapbook_members_scrapbook_id_fkey (
        id, creator_id, title, cover_emoji, description, is_finished, created_at,
        page_count:scrapbook_pages(count),
        members:scrapbook_members (
          id, user_id, joined_at,
          user:users!scrapbook_members_user_id_fkey (username, display_name, avatar_emoji)
        )
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map((r: any) => r.scrapbook).filter(Boolean).map(mapScrapbook);
}

async function fetchScrapbook(scrapbookId: string): Promise<Scrapbook & { pages: ScrapbookPage[] } | null> {
  const { data, error } = await supabase
    .from('scrapbooks')
    .select(`
      id, creator_id, title, cover_emoji, description, is_finished, created_at,
      members:scrapbook_members (
        id, user_id, joined_at,
        user:users!scrapbook_members_user_id_fkey (username, display_name, avatar_emoji)
      ),
      pages:scrapbook_pages (
        id, scrapbook_id, page_number, layout, title, created_at,
        items:scrapbook_items (
          id, page_id, scrapbook_id, creator_id,
          image_url, thumbnail_url, storage_path, note,
          pos_x, pos_y, rotation, scale, order_index, created_at,
          creator:users!scrapbook_items_creator_id_fkey (username, display_name, avatar_emoji)
        )
      )
    `)
    .eq('id', scrapbookId)
    .single();

  if (error) throw error;
  if (!data) return null;

  const scrapbook = mapScrapbook(data);
  const pages = ((data as any).pages ?? [])
    .sort((a: any, b: any) => a.page_number - b.page_number)
    .map(mapPage);

  return { ...scrapbook, pages };
}

// ─── useMyScrapbooks ──────────────────────────────────────────────────────────

export function useMyScrapbooks() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: KEYS.myScrapbooks(userId ?? ''),
    enabled: !!userId && !isDemoMode(),
    staleTime: 15_000,
    queryFn: () => fetchMyScrapbooks(userId!),
  });

  return { scrapbooks: query.data ?? [], isLoading: query.isLoading };
}

// ─── useScrapbook ─────────────────────────────────────────────────────────────

export function useScrapbook(scrapbookId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEYS.scrapbook(scrapbookId),
    enabled: !!scrapbookId && !isDemoMode(),
    staleTime: 10_000,
    queryFn: () => fetchScrapbook(scrapbookId),
  });

  useEffect(() => {
    if (!scrapbookId || isDemoMode()) return;
    const channel = supabase
      .channel(`scrapbook_items:${scrapbookId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'scrapbook_items',
        filter: `scrapbook_id=eq.${scrapbookId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: KEYS.scrapbook(scrapbookId) });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [scrapbookId, qc]);

  return { scrapbook: query.data ?? null, isLoading: query.isLoading };
}

// ─── useCreateScrapbook ───────────────────────────────────────────────────────

export function useCreateScrapbook() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      title, coverEmoji, description, memberIds,
    }: {
      title: string;
      coverEmoji?: string;
      description?: string;
      memberIds: string[];
    }) => {
      if (!userId) throw new Error('not authenticated');

      // Generate ID client-side so we never depend on SELECT-after-INSERT
      const bookId = crypto.randomUUID();

      const { error } = await supabase
        .from('scrapbooks')
        .insert({ id: bookId, creator_id: userId, title, cover_emoji: coverEmoji ?? '📒', description: description ?? null });

      if (error) throw error;

      const uniqueIds = Array.from(new Set([userId, ...memberIds]));
      const { error: memberError } = await supabase.from('scrapbook_members').insert(
        uniqueIds.map((uid) => ({ scrapbook_id: bookId, user_id: uid })),
      );
      if (memberError) throw memberError;

      const { error: pageError } = await supabase.from('scrapbook_pages').insert({
        scrapbook_id: bookId, page_number: 1, layout: 'collage',
      });
      if (pageError) throw pageError;

      return bookId;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myScrapbooks(userId) });
    },
  });
}

// ─── useAddScrapbookItem ──────────────────────────────────────────────────────

export function useAddScrapbookItem(scrapbookId: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      pageId, imageUri, note, orderIndex,
    }: {
      pageId: string;
      imageUri?: string;
      note?: string;
      orderIndex?: number;
    }) => {
      if (!userId) throw new Error('not authenticated');

      let imageUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      let storagePath: string | null = null;

      if (imageUri) {
        const itemId = crypto.randomUUID();
        const result = await uploadScrapbookItem(userId, scrapbookId, itemId, imageUri);
        imageUrl = result.originalUrl;
        thumbnailUrl = result.thumbnailUrl;
        storagePath = result.path;
      }

      const { error } = await supabase.from('scrapbook_items').insert({
        page_id: pageId,
        scrapbook_id: scrapbookId,
        creator_id: userId,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        storage_path: storagePath,
        note: note ?? null,
        rotation: (Math.random() * 12 - 6),
        order_index: orderIndex ?? 0,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scrapbook(scrapbookId) });
    },
  });
}

// ─── useAddScrapbookPage ──────────────────────────────────────────────────────

export function useAddScrapbookPage(scrapbookId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ pageNumber, layout }: { pageNumber: number; layout?: 'single' | 'grid' | 'collage' }) => {
      const { error } = await supabase.from('scrapbook_pages').insert({
        scrapbook_id: scrapbookId,
        page_number: pageNumber,
        layout: layout ?? 'collage',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scrapbook(scrapbookId) });
    },
  });
}
