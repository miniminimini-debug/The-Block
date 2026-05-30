/**
 * develop-posts Edge Function
 *
 * Called by a pg_cron job every 60 seconds.
 * 1. Flips posts.development_status = 'developed' where developed_at <= now()
 * 2. Looks up push tokens for recipients
 * 3. Sends Expo Push Notifications
 *
 * Deploy:
 *   supabase functions deploy develop-posts --no-verify-jwt
 *
 * pg_cron setup (run in Supabase SQL editor):
 *   select cron.schedule(
 *     'develop-posts-cron',
 *     '* * * * *',
 *     $$
 *       select net.http_post(
 *         url := 'https://<project-ref>.supabase.co/functions/v1/develop-posts',
 *         headers := '{"Authorization": "Bearer <service-role-key>", "Content-Type": "application/json"}'::jsonb,
 *         body := '{}'::jsonb
 *       );
 *     $$
 *   );
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

async function sendExpoPushBatch(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return;
  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
}

Deno.serve(async (req) => {
  // Only accept requests from our cron job (service role)
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // 1. Find posts that just became developed
    const { data: newlyDeveloped, error: fetchErr } = await supabase
      .from('posts')
      .select('id, user_id, note, mood')
      .eq('development_status', 'developing')
      .lte('developed_at', now)
      .limit(100);

    if (fetchErr) throw fetchErr;
    if (!newlyDeveloped || newlyDeveloped.length === 0) {
      return new Response(JSON.stringify({ developed: 0 }), { status: 200 });
    }

    const postIds = newlyDeveloped.map((p: any) => p.id);

    // 2. Mark them developed
    await supabase
      .from('posts')
      .update({ development_status: 'developed' })
      .in('id', postIds);

    // 3. Find recipients with push tokens
    const { data: recipients } = await supabase
      .from('post_recipients')
      .select(`
        post_id,
        recipient:users!post_recipients_recipient_id_fkey ( push_token, username )
      `)
      .in('post_id', postIds);

    // 4. Build push messages
    const messages: ExpoPushMessage[] = [];
    const senderMap = new Map(
      newlyDeveloped.map((p: any) => [p.id, p]),
    );

    for (const row of (recipients ?? []) as any[]) {
      const token = row.recipient?.push_token;
      if (!token || !token.startsWith('ExponentPushToken[')) continue;

      const post = senderMap.get(row.post_id);
      if (!post) continue;

      // Count unviewed developed posts for this recipient (badge)
      const { count } = await supabase
        .from('post_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', row.recipient_id)
        .lte('developed_at', now)
        .is('viewed_at', null);

      messages.push({
        to: token,
        title: '📷 something developed',
        body: post.note
          ? `"${post.note.substring(0, 60)}"`
          : 'tap to reveal your photo',
        data: { postId: row.post_id, type: 'post_developed' },
        sound: null,
        badge: count ?? 1,
      });
    }

    // 5. Send in batches of 100 (Expo limit)
    for (let i = 0; i < messages.length; i += 100) {
      await sendExpoPushBatch(messages.slice(i, i + 100));
    }

    return new Response(
      JSON.stringify({ developed: postIds.length, notified: messages.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('develop-posts error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
