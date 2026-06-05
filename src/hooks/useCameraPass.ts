import { generateId } from '@lib/uuid';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { isDemoMode } from '@lib/demo';
import { uploadPassShot } from '@lib/storage';
import type { CameraPass, PassShot } from '@types/models';

// ─── Query keys ───────────────────────────────────────────────────────────────

const KEYS = {
  myPasses: (uid: string) => ['passes', uid] as const,
  pass: (id: string) => ['pass', id] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchMyPasses(userId: string): Promise<CameraPass[]> {
  const { data, error } = await supabase
    .from('pass_participants')
    .select(`
      pass:camera_passes!pass_participants_pass_id_fkey (
        id, creator_id, title, is_complete, current_holder_id, time_limit_hours, created_at,
        participants:pass_participants (
          id, user_id, order_index, completed, completed_at,
          user:users!pass_participants_user_id_fkey (username, display_name, avatar_emoji)
        )
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? [])
    .map((r: any) => r.pass)
    .filter(Boolean)
    .map(mapPass);
}

async function fetchPass(passId: string): Promise<CameraPass | null> {
  const { data, error } = await supabase
    .from('camera_passes')
    .select(`
      id, creator_id, title, is_complete, current_holder_id, time_limit_hours, created_at,
      participants:pass_participants (
        id, user_id, order_index, completed, completed_at,
        user:users!pass_participants_user_id_fkey (username, display_name, avatar_emoji)
      ),
      shots:pass_shots (
        id, pass_id, photographer_id, image_url, thumbnail_url,
        storage_path, note, order_index, taken_at,
        photographer:users!pass_shots_photographer_id_fkey (username, display_name, avatar_emoji)
      )
    `)
    .eq('id', passId)
    .single();

  if (error) throw error;
  if (!data) return null;

  const pass = mapPass(data);
  pass.shots = ((data as any).shots ?? [])
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .map((s: any): PassShot => ({
      id: s.id, passId, photographerId: s.photographer_id,
      imageUrl: s.image_url ?? null, thumbnailUrl: s.thumbnail_url ?? null,
      storagePath: s.storage_path, note: s.note ?? null,
      orderIndex: s.order_index, takenAt: s.taken_at, photographer: s.photographer,
    }));

  return pass;
}

function mapPass(p: any): CameraPass {
  const participants = ((p.participants ?? []) as any[])
    .sort((a, b) => a.order_index - b.order_index)
    .map((pp) => ({
      id: pp.id, passId: p.id, userId: pp.user_id, orderIndex: pp.order_index,
      completed: pp.completed, completedAt: pp.completed_at ?? null, user: pp.user,
    }));

  return {
    id: p.id,
    creatorId: p.creator_id,
    title: p.title ?? null,
    isComplete: p.is_complete,
    currentHolderId: p.current_holder_id ?? null,
    timeLimitHours: p.time_limit_hours ?? null,
    createdAt: p.created_at,
    participants,
  };
}

// ─── useMyPasses ──────────────────────────────────────────────────────────────

export function useMyPasses() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: KEYS.myPasses(userId ?? ''),
    enabled: !!userId && !isDemoMode(),
    staleTime: 15_000,
    queryFn: () => fetchMyPasses(userId!),
  });

  return { passes: query.data ?? [], isLoading: query.isLoading };
}

// ─── usePass ──────────────────────────────────────────────────────────────────

export function usePass(passId: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: KEYS.pass(passId),
    enabled: !!passId && !isDemoMode(),
    staleTime: 10_000,
    queryFn: () => fetchPass(passId),
  });

  useEffect(() => {
    if (!passId || isDemoMode()) return;

    const channel = supabase
      .channel(`pass_shots:${passId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pass_shots',
        filter: `pass_id=eq.${passId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: KEYS.pass(passId) });
        if (userId) qc.invalidateQueries({ queryKey: KEYS.myPasses(userId) });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'camera_passes',
        filter: `id=eq.${passId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: KEYS.pass(passId) });
        if (userId) qc.invalidateQueries({ queryKey: KEYS.myPasses(userId) });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [passId, userId, qc]);

  return { pass: query.data ?? null, isLoading: query.isLoading };
}

// ─── useCreatePass ────────────────────────────────────────────────────────────

export function useCreatePass() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      title, orderedFriendIds, timeLimitHours,
    }: {
      title?: string;
      orderedFriendIds: string[];  // in order, creator is implicitly first
      timeLimitHours?: number;
    }) => {
      if (!userId) throw new Error('not authenticated');

      // Creator goes first, then friends in order
      const orderedAll = [userId, ...orderedFriendIds.filter((id) => id !== userId)];

      const { data: pass, error: passError } = await supabase
        .from('camera_passes')
        .insert({
          creator_id: userId,
          title: title ?? null,
          current_holder_id: userId,
          time_limit_hours: timeLimitHours ?? null,
        })
        .select('id')
        .single();

      if (passError || !pass) throw passError ?? new Error('failed to create pass');

      const { error: participantError } = await supabase
        .from('pass_participants')
        .insert(orderedAll.map((uid, i) => ({
          pass_id: pass.id, user_id: uid, order_index: i,
        })));

      if (participantError) throw participantError;
      return pass.id as string;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myPasses(userId) });
    },
  });
}

// ─── useTakePassShot ──────────────────────────────────────────────────────────

export function useTakePassShot(passId: string) {
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

      // Get pass + participants to determine current order
      const { data: passData, error: passError } = await supabase
        .from('camera_passes')
        .select(`
          current_holder_id,
          participants:pass_participants (user_id, order_index, completed)
        `)
        .eq('id', passId)
        .single();

      if (passError || !passData) throw passError ?? new Error('pass not found');
      if (passData.current_holder_id !== userId) throw new Error('not your turn');

      const participants = ((passData as any).participants as any[])
        .sort((a, b) => a.order_index - b.order_index);

      const currentIdx = participants.findIndex((p) => p.user_id === userId);
      const orderIndex = currentIdx;

      const shotId = generateId();
      const { originalUrl, thumbnailUrl, path } = await uploadPassShot(userId, passId, shotId, imageUri);

      const { error: shotError } = await supabase.from('pass_shots').insert({
        id: shotId,
        pass_id: passId,
        photographer_id: userId,
        image_url: originalUrl,
        thumbnail_url: thumbnailUrl,
        storage_path: path,
        note: note ?? null,
        order_index: orderIndex,
      });
      if (shotError) throw shotError;

      // Mark this participant as done
      const { error: pError } = await supabase
        .from('pass_participants')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('pass_id', passId)
        .eq('user_id', userId);
      if (pError) throw pError;

      // Find next participant
      const nextParticipant = participants.find((p) => !p.completed && p.user_id !== userId);
      const isComplete = !nextParticipant;

      const { error: passUpdateError } = await supabase
        .from('camera_passes')
        .update({
          current_holder_id: nextParticipant?.user_id ?? null,
          is_complete: isComplete,
        })
        .eq('id', passId);
      if (passUpdateError) throw passUpdateError;

      return { isComplete, nextHolderId: nextParticipant?.user_id ?? null };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.pass(passId) });
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myPasses(userId) });
    },
  });
}

// ─── isMyTurn helper ──────────────────────────────────────────────────────────

export function useIsMyPassTurn(pass: CameraPass | null): boolean {
  const userId = useAuthStore((s) => s.session?.user.id);
  return !!userId && pass?.currentHolderId === userId && !pass?.isComplete;
}
