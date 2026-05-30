import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const queryKeys = {
  me: () => ['me'] as const,
  neighborhood: (userId: string) => ['neighborhood', userId] as const,
  posts: (userId: string) => ['posts', userId] as const,
  journeys: (userId: string) => ['journeys', userId] as const,
  dailyPrompt: () => ['daily-prompt'] as const,
} as const;
