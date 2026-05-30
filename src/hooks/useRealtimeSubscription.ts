import { useEffect, useRef } from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@lib/supabase';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions<T extends Record<string, unknown>> {
  table: string;
  event?: PostgresEvent;
  filter?: string;
  schema?: string;
  onData: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription<T extends Record<string, unknown>>({
  table,
  event = '*',
  filter,
  schema = 'public',
  onData,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    if (!enabled) return;

    const channelName = `${schema}:${table}:${filter ?? 'all'}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          onDataRef.current(payload);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [table, event, filter, schema, enabled]);

  return {
    unsubscribe: () => channelRef.current?.unsubscribe(),
  };
}

// Presence hook for "who's online in the neighborhood"
interface UsePresenceOptions {
  channelName: string;
  userId: string;
  meta?: Record<string, unknown>;
  onSync?: (state: Record<string, unknown[]>) => void;
  enabled?: boolean;
}

export function usePresence({
  channelName,
  userId,
  meta = {},
  onSync,
  enabled = true,
}: UsePresenceOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Record<string, unknown>>();
        onSync?.(state as Record<string, unknown[]>);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, ...meta, onlineAt: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      channel.unsubscribe();
    };
  }, [channelName, userId, enabled]);
}
