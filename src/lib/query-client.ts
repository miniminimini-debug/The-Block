import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 min — neighborhood state changes frequently
      gcTime: 1000 * 60 * 10,        // 10 min cache
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query key factory — single source of truth for cache keys
export const queryKeys = {
  user: (id: string) => ['user', id] as const,
  me: () => ['me'] as const,
  neighborhood: (userId: string) => ['neighborhood', userId] as const,
  friendRoom: (friendId: string) => ['room', friendId] as const,
  posts: (userId: string) => ['posts', userId] as const,
  journeys: (userId: string) => ['journeys', userId] as const,
  journey: (id: string) => ['journey', id] as const,
  dailyPrompt: () => ['daily-prompt'] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
} as const;
