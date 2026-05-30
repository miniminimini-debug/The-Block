import { useAuthStore } from '@stores/auth.store';
import type { FriendSummary } from '@types/models';

export const DEMO_USER_ID  = 'demo-user';
export const DEMO2_USER_ID = 'demo-user-2';

export const DEMO_IDS = [DEMO_USER_ID, DEMO2_USER_ID] as const;

export const isDemoMode = () =>
  DEMO_IDS.includes(useAuthStore.getState().session?.user.id as any);

// Each demo account sees the other as a friend
export const DEMO_FRIENDS: Record<string, FriendSummary[]> = {
  [DEMO_USER_ID]: [
    {
      id: 'demo-friendship-1',
      friendId: DEMO2_USER_ID,
      username: 'demo2',
      displayName: 'Demo 2',
      avatarEmoji: '⭐',
      avatarUrl: null,
      isOnline: true,
      lastSeenAt: new Date().toISOString(),
      currentMood: null,
      friendshipLevel: 1,
      streakDays: 3,
      lastInteractionAt: new Date().toISOString(),
    },
  ],
  [DEMO2_USER_ID]: [
    {
      id: 'demo-friendship-2',
      friendId: DEMO_USER_ID,
      username: 'demo',
      displayName: 'Demo',
      avatarEmoji: '🌙',
      avatarUrl: null,
      isOnline: true,
      lastSeenAt: new Date().toISOString(),
      currentMood: null,
      friendshipLevel: 1,
      streakDays: 3,
      lastInteractionAt: new Date().toISOString(),
    },
  ],
};
