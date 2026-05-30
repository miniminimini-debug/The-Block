/**
 * Background fetch strategy for "The Block"
 *
 * Architecture:
 * - Primary trigger: Expo Push Notifications from the Edge Function (most reliable)
 * - Secondary trigger: expo-background-fetch as a fallback heartbeat (~15min iOS minimum)
 * - Battery impact: minimal — fetch only checks one lightweight query
 *
 * To enable background fetch, install:
 *   npx expo install expo-background-fetch expo-task-manager
 * Then uncomment the implementation below and add to app.json:
 *   "ios": { "infoPlist": { "UIBackgroundModes": ["fetch", "remote-notification"] } }
 *   "android": { "permissions": ["RECEIVE_BOOT_COMPLETED"] }
 */

export const BACKGROUND_FETCH_TASK = 'check-developed-posts';

export async function registerBackgroundFetch() {
  try {
    // Dynamically import to avoid crash if not installed
    const BackgroundFetch = await import('expo-background-fetch').then((m) => m).catch(() => null);
    const TaskManager = await import('expo-task-manager').then((m) => m).catch(() => null);

    if (!BackgroundFetch || !TaskManager) {
      // Packages not installed — graceful no-op
      return;
    }

    TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
      try {
        const { supabase } = await import('@lib/supabase');
        const { setBadgeCount } = await import('@lib/notifications');

        const session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
        if (!session) return BackgroundFetch.BackgroundFetchResult.NoData;

        const { count } = await supabase
          .from('post_recipients')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', session.user.id)
          .lte('developed_at', new Date().toISOString())
          .is('viewed_at', null);

        if (count && count > 0) {
          await setBadgeCount(count);
          return BackgroundFetch.BackgroundFetchResult.NewData;
        }

        return BackgroundFetch.BackgroundFetchResult.NoData;
      } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // Background fetch not available on this platform — safe to ignore
  }
}

export async function unregisterBackgroundFetch() {
  try {
    const BackgroundFetch = await import('expo-background-fetch').then((m) => m).catch(() => null);
    if (!BackgroundFetch) return;
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
  } catch {
    // Ignore
  }
}
