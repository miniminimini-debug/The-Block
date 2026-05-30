import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { isDemoMode } from '@lib/demo';
import { uploadRollShot } from '@lib/storage';
import type { Roll, RollShot } from '@types/models';

// ─── Query keys ───────────────────────────────────────────────────────────────

const KEYS = {
  myRolls: (uid: string) => ['rolls', uid] as const,
  roll: (id: string) => ['roll', id] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchMyRolls(userId: string): Promise<Roll[]> {
  const { data, error } = await supabase
    .from('roll_members')
    .select(`
      roll:rolls!roll_members_roll_id_fkey (
        id, creator_id, name, description, cover_emoji,
        max_shots, shots_taken, status, developed_at, is_revealed, created_at,
        members:roll_members (
          id, user_id, joined_at,
          user:users!roll_members_user_id_fkey (username, display_name, avatar_emoji)
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? [])
    .map((r: any) => r.roll)
    .filter(Boolean)
    .map(mapRoll);
}

async function fetchRoll(rollId: string): Promise<Roll | null> {
  const { data, error } = await supabase
    .from('rolls')
    .select(`
      id, creator_id, name, description, cover_emoji,
      max_shots, shots_taken, status, developed_at, is_revealed, created_at,
      members:roll_members (
        id, user_id, joined_at,
        user:users!roll_members_user_id_fkey (username, display_name, avatar_emoji)
      ),
      shots:roll_shots (
        id, roll_id, photographer_id, image_url, thumbnail_url,
        storage_path, note, shot_number, taken_at,
        photographer:users!roll_shots_photographer_id_fkey (username, display_name, avatar_emoji)
      )
    `)
    .eq('id', rollId)
    .single();

  if (error) throw error;
  if (!data) return null;
  return {
    ...mapRoll(data),
    shots: ((data as any).shots ?? []).map(mapShot),
  };
}

function mapRoll(r: any): Roll {
  return {
    id: r.id,
    creatorId: r.creator_id,
    name: r.name,
    description: r.description ?? null,
    coverEmoji: r.cover_emoji ?? '🎞',
    maxShots: r.max_shots,
    shotsTaken: r.shots_taken,
    status: r.status,
    developedAt: r.developed_at ?? null,
    isRevealed: r.is_revealed,
    createdAt: r.created_at,
    members: (r.members ?? []).map((m: any) => ({
      id: m.id, rollId: r.id, userId: m.user_id, joinedAt: m.joined_at, user: m.user,
    })),
  };
}

function mapShot(s: any): RollShot {
  return {
    id: s.id,
    rollId: s.roll_id,
    photographerId: s.photographer_id,
    imageUrl: s.image_url ?? null,
    thumbnailUrl: s.thumbnail_url ?? null,
    storagePath: s.storage_path,
    note: s.note ?? null,
    shotNumber: s.shot_number,
    takenAt: s.taken_at,
    photographer: s.photographer,
  };
}

// ─── useMyRolls ───────────────────────────────────────────────────────────────

export function useMyRolls() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: KEYS.myRolls(userId ?? ''),
    enabled: !!userId && !isDemoMode(),
    staleTime: 15_000,
    queryFn: () => fetchMyRolls(userId!),
  });

  return { rolls: query.data ?? [], isLoading: query.isLoading, refetch: query.refetch };
}

// ─── useRoll ──────────────────────────────────────────────────────────────────

export function useRoll(rollId: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: KEYS.roll(rollId),
    enabled: !!rollId && !isDemoMode(),
    staleTime: 10_000,
    queryFn: () => fetchRoll(rollId),
  });

  // Realtime: new shots
  useEffect(() => {
    if (!rollId || isDemoMode()) return;

    const channel = supabase
      .channel(`roll_shots:${rollId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'roll_shots',
        filter: `roll_id=eq.${rollId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: KEYS.roll(rollId) });
        if (userId) qc.invalidateQueries({ queryKey: KEYS.myRolls(userId) });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [rollId, userId, qc]);

  return { roll: query.data ?? null, isLoading: query.isLoading };
}

// ─── useCreateRoll ────────────────────────────────────────────────────────────

export function useCreateRoll() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      name, description, maxShots, coverEmoji, memberIds,
    }: {
      name: string;
      description?: string;
      maxShots: number;
      coverEmoji?: string;
      memberIds: string[];
    }) => {
      if (!userId) throw new Error('not authenticated');

      const { data: roll, error: rollError } = await supabase
        .from('rolls')
        .insert({
          creator_id: userId,
          name,
          description: description ?? null,
          max_shots: maxShots,
          cover_emoji: coverEmoji ?? '🎞',
        })
        .select('id')
        .single();

      if (rollError || !roll) throw rollError ?? new Error('failed to create roll');

      // Add creator + all invited members
      const uniqueIds = Array.from(new Set([userId, ...memberIds]));
      const { error: memberError } = await supabase
        .from('roll_members')
        .insert(uniqueIds.map((uid) => ({ roll_id: roll.id, user_id: uid })));

      if (memberError) throw memberError;
      return roll.id as string;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myRolls(userId) });
    },
  });
}

// ─── useAddShot ───────────────────────────────────────────────────────────────

export function useAddShot(rollId: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      imageUri, note,
    }: {
      imageUri: string;
      note?: string;
    }) => {
      if (!userId) throw new Error('not authenticated');

      // Get current shot count to determine shot number
      const { data: rollData, error: rollError } = await supabase
        .from('rolls')
        .select('shots_taken, max_shots, status')
        .eq('id', rollId)
        .single();

      if (rollError || !rollData) throw rollError ?? new Error('roll not found');
      if (rollData.status !== 'active') throw new Error('roll is no longer active');
      if (rollData.shots_taken >= rollData.max_shots) throw new Error('roll is full');

      const shotId = crypto.randomUUID();
      const shotNumber = rollData.shots_taken + 1;

      const { originalUrl, thumbnailUrl, path } = await uploadRollShot(userId, rollId, shotId, imageUri);

      const { error: shotError } = await supabase.from('roll_shots').insert({
        id: shotId,
        roll_id: rollId,
        photographer_id: userId,
        image_url: originalUrl,
        thumbnail_url: thumbnailUrl,
        storage_path: path,
        note: note ?? null,
        shot_number: shotNumber,
      });

      if (shotError) throw shotError;

      // Increment shots_taken; auto-develop if roll is now full
      const newCount = shotNumber;
      const isDone = newCount >= rollData.max_shots;

      const { error: updateError } = await supabase
        .from('rolls')
        .update({
          shots_taken: newCount,
          ...(isDone ? {
            status: 'developing',
            developed_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          } : {}),
        })
        .eq('id', rollId);

      if (updateError) throw updateError;

      return { shotNumber, isDone };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.roll(rollId) });
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myRolls(userId) });
    },
  });
}

// ─── useDevelopRoll ───────────────────────────────────────────────────────────

export function useDevelopRoll() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (rollId: string) => {
      const { error } = await supabase
        .from('rolls')
        .update({
          status: 'developing',
          developed_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .eq('id', rollId);

      if (error) throw error;
    },
    onSuccess: (_data, rollId) => {
      qc.invalidateQueries({ queryKey: KEYS.roll(rollId) });
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myRolls(userId) });
    },
  });
}

// ─── useRevealRoll (called when developed_at has passed) ──────────────────────

export function useRevealRoll() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (rollId: string) => {
      const { error } = await supabase
        .from('rolls')
        .update({ status: 'developed', is_revealed: true })
        .eq('id', rollId);
      if (error) throw error;
    },
    onSuccess: (_data, rollId) => {
      qc.invalidateQueries({ queryKey: KEYS.roll(rollId) });
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myRolls(userId) });
    },
  });
}
