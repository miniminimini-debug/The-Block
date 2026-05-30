import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuthStore } from '@stores/auth.store';
import { useRevealStore } from '@stores/reveal.store';
import { isDemoMode } from '@lib/demo';
import {
  registerForPushNotifications,
  savePushToken,
  getNotificationPostId,
  setBadgeCount,
} from '@lib/notifications';

export function usePushNotifications() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const darkroomCount = useRevealStore((s) => s.darkroomCount);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Register token on first mount
  useEffect(() => {
    if (!userId || isDemoMode()) return;

    registerForPushNotifications().then((token) => {
      if (token) savePushToken(userId, token);
    });
  }, [userId]);

  // Sync badge with darkroom count
  useEffect(() => {
    if (isDemoMode()) return;
    setBadgeCount(darkroomCount);
  }, [darkroomCount]);

  // Handle notification tap → navigate to memories tab
  useEffect(() => {
    if (isDemoMode()) return;

    // Notification received while app is foregrounded
    const foregroundSub = Notifications.addNotificationReceivedListener(() => {
      // Invalidation handled by realtime subscription in useDevelopingQueue
    });

    // Notification tapped (background or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const postId = getNotificationPostId(response.notification);
        if (postId) {
          // Navigate to memories tab — the darkroom will show the post
          router.navigate('/(tabs)/memories');
        }
      },
    );

    // Handle notification that launched the app from killed state
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const postId = getNotificationPostId(response.notification);
      if (postId) {
        // Small delay to let the navigator mount
        setTimeout(() => router.navigate('/(tabs)/memories'), 500);
      }
    });

    return () => {
      foregroundSub.remove();
      responseListener.current?.remove();
    };
  }, []);
}
