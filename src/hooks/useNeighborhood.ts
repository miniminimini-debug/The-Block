import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { queryKeys } from '@lib/query-client';
import { useAuthStore } from '@stores/auth.store';
import { useNeighborhoodStore } from '@stores/neighborhood.store';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import type { FriendRoom } from '@types/models';

function assignRoomPositions(rooms: FriendRoom[]): FriendRoom[] {
  // Simple circular layout for the neighborhood map
  // In production this would be more sophisticated (grid, clustering, etc.)
  const centerX = 0;
  const centerY = 0;
  const radius = 200;

  return rooms.map((room, i) => {
    const angle = (i / rooms.length) * 2 * Math.PI - Math.PI / 2;
    return {
      ...room,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
    };
  });
}

export function useNeighborhood() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const setRooms = useNeighborhoodStore((s) => s.setRooms);
  const updateRoom = useNeighborhoodStore((s) => s.updateRoom);
  const rooms = useNeighborhoodStore((s) => s.rooms);
  const isLoaded = useNeighborhoodStore((s) => s.isLoaded);
  const queryClient = useQueryClient();

  const { isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.neighborhood(userId ?? ''),
    queryFn: async () => {
      if (!userId) throw new Error('No user');
      const { data, error } = await supabase.rpc('get_neighborhood', { user_id: userId });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    onSuccess: (data) => {
      const mapped: FriendRoom[] = (data ?? []).map((row: any) => ({
        friendId: row.friend_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        roomType: row.room_type,
        roomTheme: row.room_theme,
        currentMood: row.current_mood,
        isOnline: row.is_online,
        lastSeenAt: row.last_seen_at,
        latestPostAt: row.latest_post_at,
        hasNewPost: row.has_new_post,
        friendshipLevel: row.friendship_level,
      }));
      setRooms(assignRoomPositions(mapped));
    },
  } as any);

  // Realtime: when a friend posts, light up their room window
  useRealtimeSubscription({
    table: 'posts',
    event: 'INSERT',
    enabled: !!userId,
    onData: (payload) => {
      const post = payload.new as { user_id: string };
      const isMyFriend = rooms.some((r) => r.friendId === post.user_id);
      if (isMyFriend) {
        updateRoom(post.user_id, { hasNewPost: true });
        queryClient.invalidateQueries({ queryKey: queryKeys.neighborhood(userId!) });
      }
    },
  });

  // Realtime: online status changes
  useRealtimeSubscription({
    table: 'users',
    event: 'UPDATE',
    enabled: !!userId,
    onData: (payload) => {
      const user = payload.new as { id: string; is_online: boolean; current_mood: string };
      const isMyFriend = rooms.some((r) => r.friendId === user.id);
      if (isMyFriend) {
        updateRoom(user.id, {
          isOnline: user.is_online,
          currentMood: user.current_mood as any,
        });
      }
    },
  });

  return { rooms, isLoading, isLoaded, error, refetch };
}
