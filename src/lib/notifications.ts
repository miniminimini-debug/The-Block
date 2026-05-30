import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@lib/supabase';

// Configure how notifications appear when the app is foregrounded (native only)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}

// ─── Push token registration ──────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  // Emulator / web — skip
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  return token ?? null;
}

export async function savePushToken(userId: string, token: string) {
  await supabase
    .from('users')
    .update({ push_token: token })
    .eq('id', userId);
}

// ─── Local notification scheduling ───────────────────────────────────────────
// Called right after a post is created so the sender sees "your photo is ready"
// and each recipient gets a local notification if they're on the same device (unlikely,
// but useful in dev/testing). Real push notifications come from the Edge Function.

export async function schedulePostDevelopedNotification(
  postId: string,
  developsAt: Date,
  recipientName: string,
): Promise<string> {
  // Cancel any existing notification for this post
  await cancelPostNotification(postId);

  const id = await Notifications.scheduleNotificationAsync({
    identifier: `post-developed-${postId}`,
    content: {
      title: '📷 something developed',
      body: `a photo from ${recipientName} is ready to reveal`,
      data: { postId, type: 'post_developed' },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: developsAt,
    },
  });

  return id;
}

export async function cancelPostNotification(postId: string) {
  await Notifications.cancelScheduledNotificationAsync(`post-developed-${postId}`);
}

export async function cancelAllPostNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const postNotifs = scheduled.filter((n) => n.identifier.startsWith('post-developed-'));
  await Promise.all(postNotifs.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

// ─── Notification tap routing ─────────────────────────────────────────────────
// Returns the notification data if it was a post_developed notification

export function getNotificationPostId(
  notification: Notifications.Notification,
): string | null {
  const data = notification.request.content.data;
  if (data?.type === 'post_developed' && data?.postId) {
    return data.postId as string;
  }
  return null;
}

// Badge management
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}
