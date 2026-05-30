import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { isDemoMode } from '@lib/demo';
import type { SeasonalRecap, Season } from '@types/models';

const KEYS = {
  myRecaps: (uid: string) => ['seasonal-recaps', uid] as const,
  recap: (id: string) => ['seasonal-recap', id] as const,
};

function mapRecap(r: any): SeasonalRecap {
  return {
    id: r.id,
    userId: r.user_id,
    season: r.season as Season,
    year: r.year,
    label: r.label,
    photoUrls: Array.isArray(r.photo_urls) ? r.photo_urls : [],
    participantIds: Array.isArray(r.participant_ids) ? r.participant_ids : [],
    isOpened: r.is_opened,
    openedAt: r.opened_at ?? null,
    createdAt: r.created_at,
  };
}

async function fetchMyRecaps(userId: string): Promise<SeasonalRecap[]> {
  const { data, error } = await supabase
    .from('seasonal_recaps')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRecap);
}

async function fetchRecap(recapId: string): Promise<SeasonalRecap | null> {
  const { data, error } = await supabase
    .from('seasonal_recaps')
    .select('*')
    .eq('id', recapId)
    .single();

  if (error) throw error;
  return data ? mapRecap(data) : null;
}

export function useMySeasonalRecaps() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: KEYS.myRecaps(userId ?? ''),
    enabled: !!userId && !isDemoMode(),
    staleTime: 60_000,
    queryFn: () => fetchMyRecaps(userId!),
  });

  return {
    recaps: query.data ?? [],
    unopenedCount: (query.data ?? []).filter((r) => !r.isOpened).length,
    isLoading: query.isLoading,
  };
}

export function useSeasonalRecap(recapId: string) {
  const query = useQuery({
    queryKey: KEYS.recap(recapId),
    enabled: !!recapId && !isDemoMode(),
    staleTime: 30_000,
    queryFn: () => fetchRecap(recapId),
  });

  return { recap: query.data ?? null, isLoading: query.isLoading };
}

export function useOpenRecap() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (recapId: string) => {
      const { error } = await supabase
        .from('seasonal_recaps')
        .update({ is_opened: true, opened_at: new Date().toISOString() })
        .eq('id', recapId);
      if (error) throw error;
    },
    onSuccess: (_data, recapId) => {
      qc.invalidateQueries({ queryKey: KEYS.recap(recapId) });
      if (userId) qc.invalidateQueries({ queryKey: KEYS.myRecaps(userId) });
    },
  });
}
