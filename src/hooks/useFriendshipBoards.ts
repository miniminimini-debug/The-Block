import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { isDemoMode } from '@lib/demo';
import type { FriendshipBoard } from '@types/models';

const KEYS = {
  myBoards: (uid: string) => ['friendship-boards', uid] as const,
  board: (id: string) => ['friendship-board', id] as const,
};

function mapBoard(b: any): FriendshipBoard {
  return {
    id: b.id,
    title: b.title ?? null,
    coverEmoji: b.cover_emoji ?? '🏠',
    createdAt: b.created_at,
    members: (b.members ?? []).map((m: any) => ({
      id: m.id, boardId: b.id, userId: m.user_id, joinedAt: m.joined_at, user: m.user,
    })),
  };
}

async function fetchMyBoards(userId: string): Promise<FriendshipBoard[]> {
  const { data, error } = await supabase
    .from('friendship_board_members')
    .select(`
      board:friendship_boards!friendship_board_members_board_id_fkey (
        id, title, cover_emoji, created_at,
        members:friendship_board_members (
          id, user_id, joined_at,
          user:users!friendship_board_members_user_id_fkey (username, display_name, avatar_emoji)
        )
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map((r: any) => r.board).filter(Boolean).map(mapBoard);
}

async function fetchBoard(boardId: string): Promise<FriendshipBoard | null> {
  const { data, error } = await supabase
    .from('friendship_boards')
    .select(`
      id, title, cover_emoji, created_at,
      members:friendship_board_members (
        id, user_id, joined_at,
        user:users!friendship_board_members_user_id_fkey (username, display_name, avatar_emoji)
      )
    `)
    .eq('id', boardId)
    .single();

  if (error) throw error;
  return data ? mapBoard(data) : null;
}

export function useMyFriendshipBoards() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: KEYS.myBoards(userId ?? ''),
    enabled: !!userId && !isDemoMode(),
    staleTime: 20_000,
    queryFn: () => fetchMyBoards(userId!),
  });

  return { boards: query.data ?? [], isLoading: query.isLoading };
}

export function useFriendshipBoard(boardId: string) {
  const query = useQuery({
    queryKey: KEYS.board(boardId),
    enabled: !!boardId && !isDemoMode(),
    staleTime: 10_000,
    queryFn: () => fetchBoard(boardId),
  });

  return { board: query.data ?? null, isLoading: query.isLoading };
}

// Creates a shared board between the current user and a friend
export function useCreateFriendshipBoard() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({ friendId, title }: { friendId: string; title?: string }) => {
      if (!userId) throw new Error('not authenticated');

      const { data: board, error } = await supabase
        .from('friendship_boards')
        .insert({ title: title ?? null })
        .select('id').single();

      if (error || !board) throw error ?? new Error('failed to create board');

      await supabase.from('friendship_board_members').insert([
        { board_id: board.id, user_id: userId },
        { board_id: board.id, user_id: friendId },
      ]);

      return board.id as string;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myBoards(userId) });
    },
  });
}
