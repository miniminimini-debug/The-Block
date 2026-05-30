-- ─────────────────────────────────────────────────────────────────────────────
-- Schema additions for the photo developing system
-- Run after schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── pg_cron: auto-develop posts every minute ─────────────────────────────────
-- Enable pg_cron in Supabase: Dashboard → Database → Extensions → pg_cron
-- Enable pg_net  in Supabase: Dashboard → Database → Extensions → pg_net

-- Replace <project-ref> and <service-role-key> with your actual values
-- Found in: Supabase Dashboard → Settings → API

select cron.schedule(
  'develop-posts-cron',
  '* * * * *',          -- every minute
  $$
    select net.http_post(
      url     := 'https://<project-ref>.supabase.co/functions/v1/develop-posts',
      headers := jsonb_build_object(
                   'Authorization', 'Bearer <service-role-key>',
                   'Content-Type', 'application/json'
                 ),
      body    := '{}'::jsonb
    );
  $$
);

-- ─── Realtime: also update post_recipients.developed_at when post is marked developed ──

create or replace function public.sync_recipient_development()
returns trigger language plpgsql security definer as $$
begin
  if new.development_status = 'developed' and old.development_status = 'developing' then
    -- Realtime will broadcast this change to subscribers automatically
    -- No action needed — post_recipients already has correct developed_at
    null;
  end if;
  return new;
end;
$$;

create trigger post_development_sync
  after update of development_status on public.posts
  for each row execute function public.sync_recipient_development();

-- ─── Index for efficient darkroom queries ─────────────────────────────────────

create index if not exists post_recipients_darkroom_idx
  on public.post_recipients (recipient_id, developed_at, viewed_at)
  where viewed_at is null;

create index if not exists posts_development_status_idx
  on public.posts (development_status, developed_at)
  where development_status = 'developing';

-- ─── View: darkroom_inbox (for RPC or direct query) ───────────────────────────

create or replace view public.darkroom_inbox as
select
  pr.id as recipient_row_id,
  pr.post_id,
  pr.recipient_id,
  pr.developed_at,
  pr.viewed_at,
  pr.reacted_at,
  p.image_url,
  p.thumbnail_url,
  p.note,
  p.mood,
  p.created_at,
  u.username as sender_username,
  u.display_name as sender_display_name,
  u.avatar_emoji as sender_avatar_emoji
from public.post_recipients pr
join public.posts p on p.id = pr.post_id
join public.users u on u.id = p.user_id
where pr.developed_at <= now()
  and pr.viewed_at is null;

-- ─── Notification log table (optional, for dedup / analytics) ────────────────

create table if not exists public.push_notifications (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users(id) on delete cascade,
  post_id       uuid references public.posts(id) on delete cascade,
  type          text not null,
  sent_at       timestamptz not null default now(),
  push_token    text not null
);

create index on public.push_notifications (post_id, user_id);

alter table public.push_notifications enable row level security;
create policy "push_notifications: no direct access" on public.push_notifications
  using (false);
