import { generateId } from '@lib/uuid';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { isDemoMode } from '@lib/demo';
import { uploadPhoto } from '@lib/storage';
import type { CorkBoard, CorkBoardItem } from '@types/models';

const KEYS = {
  myBoards: (uid: string) => ['cork-boards', uid] as const,
  board: (id: string) => ['cork-board', id] as const,
};

function mapBoard(b: any): CorkBoard {
  return {
    id: b.id,
    creatorId: b.creator_id,
    title: b.title,
    coverEmoji: b.cover_emoji ?? '📌',
    createdAt: b.created_at,
    members: (b.members ?? []).map((m: any) => ({
      id: m.id, boardId: b.id, userId: m.user_id, joinedAt: m.joined_at, user: m.user,
    })),
    items: (b.items ?? []).map(mapItem),
  };
}

function mapItem(i: any): CorkBoardItem {
  return {
    id: i.id,
    boardId: i.board_id,
    creatorId: i.creator_id,
    type: i.type,
    imageUrl: i.image_url ?? null,
    thumbnailUrl: i.thumbnail_url ?? null,
    storagePath: i.storage_path ?? null,
    noteText: i.note_text ?? null,
    color: i.color ?? '#F5E6A3',
    posX: i.pos_x ?? 0,
    posY: i.pos_y ?? 0,
    rotation: i.rotation ?? 0,
    zIndex: i.z_index ?? 1,
    createdAt: i.created_at,
    creator: i.creator,
  };
}

async function fetchMyBoards(userId: string): Promise<CorkBoard[]> {
  const { data, error } = await supabase
    .from('cork_board_members')
    .select(`
      board:cork_boards!cork_board_members_board_id_fkey (
        id, creator_id, title, cover_emoji, created_at,
        members:cork_board_members (
          id, user_id, joined_at,
          user:users!cork_board_members_user_id_fkey (username, display_name, avatar_emoji)
        )
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map((r: any) => r.board).filter(Boolean).map(mapBoard);
}

async function fetchBoard(boardId: string): Promise<CorkBoard | null> {
  const { data, error } = await supabase
    .from('cork_boards')
    .select(`
      id, creator_id, title, cover_emoji, created_at,
      members:cork_board_members (
        id, user_id, joined_at,
        user:users!cork_board_members_user_id_fkey (username, display_name, avatar_emoji)
      ),
      items:cork_board_items (
        id, board_id, creator_id, type,
        image_url, thumbnail_url, storage_path,
        note_text, color, pos_x, pos_y, rotation, z_index, created_at,
        creator:users!cork_board_items_creator_id_fkey (username, display_name, avatar_emoji)
      )
    `)
    .eq('id', boardId)
    .single();

  if (error) throw error;
  return data ? mapBoard(data) : null;
}

// ─── useMyBoards ──────────────────────────────────────────────────────────────

export function useMyBoards() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: KEYS.myBoards(userId ?? ''),
    enabled: !!userId && !isDemoMode(),
    staleTime: 15_000,
    queryFn: () => fetchMyBoards(userId!),
  });

  return { boards: query.data ?? [], isLoading: query.isLoading };
}

// ─── useCorkBoard ─────────────────────────────────────────────────────────────

export function useCorkBoard(boardId: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: KEYS.board(boardId),
    enabled: !!boardId && !isDemoMode(),
    staleTime: 8_000,
    queryFn: () => fetchBoard(boardId),
  });

  useEffect(() => {
    if (!boardId || isDemoMode()) return;
    const channel = supabase
      .channel(`cork_board_items:${boardId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'cork_board_items',
        filter: `board_id=eq.${boardId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: KEYS.board(boardId) });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [boardId, qc]);

  return { board: query.data ?? null, isLoading: query.isLoading };
}

// ─── useCorkBoardByCreatorId ─────────────────────────────────────────────────

export function useCorkBoardByCreatorId(creatorId: string) {
  const query = useQuery({
    queryKey: ['cork-board-creator', creatorId],
    enabled: !!creatorId && !isDemoMode(),
    staleTime: 15_000,
    queryFn: async (): Promise<CorkBoard | null> => {
      const { data, error } = await supabase
        .from('cork_boards')
        .select(`
          id, creator_id, title, cover_emoji, created_at,
          items:cork_board_items (
            id, board_id, creator_id, type,
            image_url, thumbnail_url, storage_path,
            note_text, color, pos_x, pos_y, rotation, z_index, created_at,
            creator:users!cork_board_items_creator_id_fkey (username, display_name, avatar_emoji)
          )
        `)
        .eq('creator_id', creatorId)
        .limit(1)
        .single();
      if (error) return null;
      return data ? mapBoard(data) : null;
    },
  });
  return { board: query.data ?? null, isLoading: query.isLoading };
}

// ─── useCreateBoard ───────────────────────────────────────────────────────────

export function useCreateBoard() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      title, coverEmoji, memberIds,
    }: {
      title: string;
      coverEmoji?: string;
      memberIds: string[];
    }) => {
      if (!userId) throw new Error('not authenticated');

      const { data: board, error } = await supabase
        .from('cork_boards')
        .insert({ creator_id: userId, title, cover_emoji: coverEmoji ?? '📌' })
        .select('id').single();

      if (error || !board) throw error ?? new Error('failed to create board');

      const uniqueIds = Array.from(new Set([userId, ...memberIds]));
      await supabase.from('cork_board_members').insert(
        uniqueIds.map((uid) => ({ board_id: board.id, user_id: uid })),
      );

      return board.id as string;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myBoards(userId) });
    },
  });
}

// ─── useAddBoardItem ──────────────────────────────────────────────────────────

export function useAddBoardItem(boardId: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      type, imageUri, noteText, color, posX, posY, rotation,
    }: {
      type: 'photo' | 'note';
      imageUri?: string;
      noteText?: string;
      color?: string;
      posX?: number;
      posY?: number;
      rotation?: number;
    }) => {
      if (!userId) throw new Error('not authenticated');

      let imageUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      let storagePath: string | null = null;

      if (type === 'photo' && imageUri) {
        const itemId = generateId();
        const result = await uploadPhoto({
          userId,
          bucket: 'photos',
          path: `boards/${boardId}/${itemId}`,
          uri: imageUri,
        });
        imageUrl = result.originalUrl;
        thumbnailUrl = result.thumbnailUrl;
        storagePath = result.path;
      }

      const { error } = await supabase.from('cork_board_items').insert({
        board_id: boardId,
        creator_id: userId,
        type,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        storage_path: storagePath,
        note_text: noteText ?? null,
        color: color ?? '#F5E6A3',
        pos_x: posX ?? Math.random() * 200,
        pos_y: posY ?? Math.random() * 200,
        rotation: rotation ?? (Math.random() * 20 - 10),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.board(boardId) });
    },
  });
}

// ─── useUpdateItemPosition ────────────────────────────────────────────────────

export function useUpdateItemPosition(boardId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, posX, posY }: { itemId: string; posX: number; posY: number }) => {
      const { error } = await supabase
        .from('cork_board_items')
        .update({ pos_x: posX, pos_y: posY })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.board(boardId) });
    },
  });
}

// ─── useDeleteBoardItem ───────────────────────────────────────────────────────

export function useDeleteBoardItem(boardId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('cork_board_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.board(boardId) });
    },
  });
}
