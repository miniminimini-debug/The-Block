import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { isDemoMode } from '@lib/demo';
import { uploadCapsuleSubmission } from '@lib/storage';
import type { Capsule, CapsuleSubmission } from '@types/models';

// ─── Query keys ───────────────────────────────────────────────────────────────

const KEYS = {
  myCapsules: (uid: string) => ['capsules', uid] as const,
  capsule: (id: string) => ['capsule', id] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchMyCapsules(userId: string): Promise<Capsule[]> {
  const { data, error } = await supabase
    .from('capsule_members')
    .select(`
      capsule:capsules!capsule_members_capsule_id_fkey (
        id, creator_id, title, description, cover_emoji,
        unlock_type, unlock_at, milestone_label, is_opened, opened_at, created_at,
        member_count:capsule_members(count),
        submission_count:capsule_submissions(count)
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? [])
    .map((r: any) => r.capsule)
    .filter(Boolean)
    .map(mapCapsule);
}

async function fetchCapsule(capsuleId: string): Promise<Capsule | null> {
  const { data, error } = await supabase
    .from('capsules')
    .select(`
      id, creator_id, title, description, cover_emoji,
      unlock_type, unlock_at, milestone_label, is_opened, opened_at, created_at,
      members:capsule_members (
        id, user_id, has_submitted, joined_at,
        user:users!capsule_members_user_id_fkey (username, display_name, avatar_emoji)
      ),
      submissions:capsule_submissions (
        id, user_id, image_url, thumbnail_url, storage_path, note, submitted_at,
        user:users!capsule_submissions_user_id_fkey (username, display_name, avatar_emoji)
      )
    `)
    .eq('id', capsuleId)
    .single();

  if (error) throw error;
  if (!data) return null;

  const capsule = mapCapsule(data);
  capsule.members = ((data as any).members ?? []).map((m: any) => ({
    id: m.id, capsuleId, userId: m.user_id, hasSubmitted: m.has_submitted,
    joinedAt: m.joined_at, user: m.user,
  }));
  capsule.submissions = ((data as any).submissions ?? []).map((s: any): CapsuleSubmission => ({
    id: s.id, capsuleId, userId: s.user_id,
    imageUrl: s.image_url ?? null, thumbnailUrl: s.thumbnail_url ?? null,
    storagePath: s.storage_path ?? null, note: s.note ?? null,
    submittedAt: s.submitted_at, user: s.user,
  }));

  return capsule;
}

function mapCapsule(c: any): Capsule {
  return {
    id: c.id,
    creatorId: c.creator_id,
    title: c.title,
    description: c.description ?? null,
    coverEmoji: c.cover_emoji ?? '📦',
    unlockType: c.unlock_type,
    unlockAt: c.unlock_at ?? null,
    milestoneLabel: c.milestone_label ?? null,
    isOpened: c.is_opened,
    openedAt: c.opened_at ?? null,
    createdAt: c.created_at,
    memberCount: c.member_count?.[0]?.count ?? 0,
    submissionCount: c.submission_count?.[0]?.count ?? 0,
  };
}

// ─── useMyCapsules ────────────────────────────────────────────────────────────

export function useMyCapsules() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: KEYS.myCapsules(userId ?? ''),
    enabled: !!userId && !isDemoMode(),
    staleTime: 15_000,
    queryFn: () => fetchMyCapsules(userId!),
  });

  return { capsules: query.data ?? [], isLoading: query.isLoading, refetch: query.refetch };
}

// ─── useCapsule ───────────────────────────────────────────────────────────────

export function useCapsule(capsuleId: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: KEYS.capsule(capsuleId),
    enabled: !!capsuleId && !isDemoMode(),
    staleTime: 10_000,
    queryFn: () => fetchCapsule(capsuleId),
  });

  useEffect(() => {
    if (!capsuleId || isDemoMode()) return;

    const channel = supabase
      .channel(`capsule_submissions:${capsuleId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'capsule_submissions',
        filter: `capsule_id=eq.${capsuleId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: KEYS.capsule(capsuleId) });
        if (userId) qc.invalidateQueries({ queryKey: KEYS.myCapsules(userId) });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [capsuleId, userId, qc]);

  return { capsule: query.data ?? null, isLoading: query.isLoading };
}

// ─── useCreateCapsule ─────────────────────────────────────────────────────────

export function useCreateCapsule() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      title, description, coverEmoji, unlockType, unlockAt, milestoneLabel, memberIds,
    }: {
      title: string;
      description?: string;
      coverEmoji?: string;
      unlockType: 'date' | 'milestone';
      unlockAt?: string;
      milestoneLabel?: string;
      memberIds: string[];
    }) => {
      if (!userId) throw new Error('not authenticated');

      // Generate ID client-side so we never depend on SELECT-after-INSERT
      const capsuleId = crypto.randomUUID();

      const { error: capsuleError } = await supabase
        .from('capsules')
        .insert({
          id: capsuleId,
          creator_id: userId,
          title,
          description: description ?? null,
          cover_emoji: coverEmoji ?? '📦',
          unlock_type: unlockType,
          unlock_at: unlockAt ?? null,
          milestone_label: milestoneLabel ?? null,
        });

      if (capsuleError) throw capsuleError;

      const uniqueIds = Array.from(new Set([userId, ...memberIds]));
      const { error: memberError } = await supabase
        .from('capsule_members')
        .insert(uniqueIds.map((uid) => ({ capsule_id: capsuleId, user_id: uid })));

      if (memberError) throw memberError;
      return capsuleId;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myCapsules(userId) });
    },
  });
}

// ─── useSubmitToCapsule ───────────────────────────────────────────────────────

export function useSubmitToCapsule(capsuleId: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      imageUri, note,
    }: {
      imageUri?: string;
      note?: string;
    }) => {
      if (!userId) throw new Error('not authenticated');

      let imageUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      let storagePath: string | null = null;

      if (imageUri) {
        const result = await uploadCapsuleSubmission(userId, capsuleId, imageUri);
        imageUrl = result.originalUrl;
        thumbnailUrl = result.thumbnailUrl;
        storagePath = result.path;
      }

      const { error: subError } = await supabase.from('capsule_submissions').upsert({
        capsule_id: capsuleId,
        user_id: userId,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        storage_path: storagePath,
        note: note ?? null,
      });

      if (subError) throw subError;

      // Mark member as submitted
      const { error: memberError } = await supabase
        .from('capsule_members')
        .update({ has_submitted: true })
        .eq('capsule_id', capsuleId)
        .eq('user_id', userId);

      if (memberError) throw memberError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.capsule(capsuleId) });
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myCapsules(userId) });
    },
  });
}

// ─── useSealCapsule ───────────────────────────────────────────────────────────

export function useSealCapsule() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({ capsuleId, unlockAt }: { capsuleId: string; unlockAt: string }) => {
      const { error } = await supabase
        .from('capsules')
        .update({ unlock_at: unlockAt })
        .eq('id', capsuleId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.capsule(vars.capsuleId) });
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myCapsules(userId) });
    },
  });
}

// ─── useOpenCapsule ───────────────────────────────────────────────────────────

export function useOpenCapsule() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (capsuleId: string) => {
      const { error } = await supabase
        .from('capsules')
        .update({ is_opened: true, opened_at: new Date().toISOString() })
        .eq('id', capsuleId);
      if (error) throw error;
    },
    onSuccess: (_data, capsuleId) => {
      qc.invalidateQueries({ queryKey: KEYS.capsule(capsuleId) });
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myCapsules(userId) });
    },
  });
}
