import { QueryClient, MutationCache } from '@tanstack/react-query';
import { Alert } from 'react-native';

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error: any) => {
      const msg = error?.message ?? error?.error_description ?? JSON.stringify(error);
      Alert.alert('Something went wrong', msg);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: false,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
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
