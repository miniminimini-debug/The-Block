-- ═══════════════════════════════════════════════════════════════════════════════
-- YOUR BLOCK — Complete Database Setup
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────

do $$ begin
  create type mood_type as enum (
    'cozy','happy','reflective','adventurous','melancholic',
    'excited','peaceful','anxious','grateful','nostalgic'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type friendship_status as enum ('pending','accepted','blocked');
exception when duplicate_object then null; end $$;

-- ─── users ───────────────────────────────────────────────────────────────────

create table if not exists public.users (
  id                       uuid primary key references auth.users(id) on delete cascade,
  phone_number             text unique,
  username                 text not null unique,
  display_name             text,
  avatar_url               text,
  avatar_emoji             text default '🌙',
  birthday                 date,
  push_token               text,
  bio                      text,
  current_mood             mood_type,
  mood_updated_at          timestamptz,
  is_online                boolean not null default false,
  last_seen_at             timestamptz,
  invite_code              text not null unique default upper(substr(md5(random()::text), 1, 8)),
  timezone                 text not null default 'UTC',
  notification_preferences jsonb not null default '{"posts": true, "reactions": true, "friend_requests": true}',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ─── invite_codes ─────────────────────────────────────────────────────────────

create table if not exists public.invite_codes (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,
  created_by  uuid not null references public.users(id) on delete cascade,
  used_by     uuid references public.users(id) on delete set null,
  used_at     timestamptz,
  use_count   integer not null default 0,
  max_uses    integer not null default 3,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists invite_codes_code_idx on public.invite_codes (code);
create index if not exists invite_codes_creator_idx on public.invite_codes (created_by);

create or replace function public.create_default_invite_code()
returns trigger language plpgsql security definer as $$
declare
  new_code text;
  attempts int := 0;
begin
  loop
    new_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
    exit when not exists (select 1 from public.invite_codes where code = new_code);
    attempts := attempts + 1;
    if attempts > 10 then raise exception 'could not generate unique invite code'; end if;
  end loop;
  insert into public.invite_codes (code, created_by, max_uses) values (new_code, new.id, 3);
  update public.users set invite_code = new_code where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_user_created_invite on public.users;
create trigger on_user_created_invite
  after insert on public.users
  for each row execute function public.create_default_invite_code();

-- ─── friendships ─────────────────────────────────────────────────────────────

create table if not exists public.friendships (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references public.users(id) on delete cascade,
  friend_id            uuid not null references public.users(id) on delete cascade,
  status               friendship_status not null default 'pending',
  friendship_level     integer not null default 1,
  xp_points            integer not null default 0,
  streak_days          integer not null default 0,
  last_interaction_at  timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, friend_id)
);

create index if not exists friendships_user_idx on public.friendships (user_id, status);
create index if not exists friendships_friend_idx on public.friendships (friend_id, status);

drop trigger if exists friendships_updated_at on public.friendships;
create trigger friendships_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();

-- ─── posts ───────────────────────────────────────────────────────────────────

create table if not exists public.posts (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references public.users(id) on delete cascade,
  image_url               text not null,
  thumbnail_url           text,
  storage_path            text not null,
  note                    text,
  mood                    mood_type,
  development_status      text not null default 'developing'
                            check (development_status in ('developing','developed')),
  development_delay_mins  integer not null default 60,
  developed_at            timestamptz,
  reaction_counts         jsonb not null default '{}',
  view_count              integer not null default 0,
  created_at              timestamptz not null default now()
);

create index if not exists posts_user_idx on public.posts (user_id, created_at desc);
create index if not exists posts_status_idx on public.posts (development_status, developed_at);

create or replace function public.schedule_post_development()
returns trigger language plpgsql as $$
begin
  new.developed_at := new.created_at + (new.development_delay_mins || ' minutes')::interval;
  return new;
end;
$$;

drop trigger if exists post_schedule_development on public.posts;
create trigger post_schedule_development
  before insert on public.posts
  for each row execute function public.schedule_post_development();

-- ─── post_recipients ─────────────────────────────────────────────────────────

create table if not exists public.post_recipients (
  id                      uuid primary key default uuid_generate_v4(),
  post_id                 uuid not null references public.posts(id) on delete cascade,
  recipient_id            uuid not null references public.users(id) on delete cascade,
  development_delay_mins  integer not null default 60,
  developed_at            timestamptz,
  viewed_at               timestamptz,
  reacted_at              timestamptz,
  created_at              timestamptz not null default now(),
  unique (post_id, recipient_id)
);

create index if not exists post_recipients_recipient_idx on public.post_recipients (recipient_id, developed_at);
create index if not exists post_recipients_post_idx on public.post_recipients (post_id);

create or replace function public.set_post_recipient_developed_at()
returns trigger language plpgsql as $$
begin
  new.developed_at := new.created_at + (new.development_delay_mins || ' minutes')::interval;
  return new;
end;
$$;

drop trigger if exists post_recipient_developed_at on public.post_recipients;
create trigger post_recipient_developed_at
  before insert on public.post_recipients
  for each row execute function public.set_post_recipient_developed_at();

-- ─── reactions ───────────────────────────────────────────────────────────────

create table if not exists public.reactions (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists reactions_post_idx on public.reactions (post_id);

-- ─── capsules ────────────────────────────────────────────────────────────────

create table if not exists public.capsules (
  id              uuid primary key default gen_random_uuid(),
  creator_id      uuid not null references public.users(id) on delete cascade,
  title           text not null,
  description     text,
  cover_emoji     text not null default '📦',
  unlock_type     text not null default 'date' check (unlock_type in ('date','milestone')),
  unlock_at       timestamptz,
  milestone_label text,
  is_opened       boolean not null default false,
  opened_at       timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists public.capsule_members (
  id            uuid primary key default gen_random_uuid(),
  capsule_id    uuid not null references public.capsules(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  has_submitted boolean not null default false,
  joined_at     timestamptz not null default now(),
  unique (capsule_id, user_id)
);

create table if not exists public.capsule_submissions (
  id            uuid primary key default gen_random_uuid(),
  capsule_id    uuid not null references public.capsules(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  image_url     text,
  thumbnail_url text,
  storage_path  text,
  note          text,
  submitted_at  timestamptz not null default now(),
  unique (capsule_id, user_id)
);

-- ─── desk drops ──────────────────────────────────────────────────────────────

create table if not exists public.desk_drops (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.users(id) on delete cascade,
  recipient_id  uuid not null references public.users(id) on delete cascade,
  image_url     text,
  thumbnail_url text,
  storage_path  text,
  note          text,
  is_discovered boolean not null default false,
  discovered_at timestamptz,
  created_at    timestamptz not null default now()
);

-- ─── camera passes ───────────────────────────────────────────────────────────

create table if not exists public.camera_passes (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references public.users(id) on delete cascade,
  title             text,
  is_complete       boolean not null default false,
  current_holder_id uuid references public.users(id),
  time_limit_hours  integer,
  created_at        timestamptz not null default now()
);

create table if not exists public.pass_participants (
  id           uuid primary key default gen_random_uuid(),
  pass_id      uuid not null references public.camera_passes(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  order_index  integer not null,
  completed    boolean not null default false,
  completed_at timestamptz,
  unique (pass_id, user_id)
);

create table if not exists public.pass_shots (
  id              uuid primary key default gen_random_uuid(),
  pass_id         uuid not null references public.camera_passes(id) on delete cascade,
  photographer_id uuid not null references public.users(id) on delete cascade,
  image_url       text,
  thumbnail_url   text,
  storage_path    text not null,
  note            text,
  order_index     integer not null,
  taken_at        timestamptz not null default now()
);

-- ─── cork boards ─────────────────────────────────────────────────────────────

create table if not exists public.cork_boards (
  id         uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.users(id) on delete cascade,
  title      text not null,
  cover_emoji text default '📌' not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cork_board_members (
  id        uuid primary key default gen_random_uuid(),
  board_id  uuid not null references public.cork_boards(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (board_id, user_id)
);

create table if not exists public.cork_board_items (
  id           uuid primary key default gen_random_uuid(),
  board_id     uuid not null references public.cork_boards(id) on delete cascade,
  creator_id   uuid not null references public.users(id) on delete cascade,
  type         text not null check (type in ('photo', 'note', 'sticker')),
  image_url    text,
  thumbnail_url text,
  storage_path text,
  note_text    text,
  sticker_id   text,
  color        text default '#F5E6A3' not null,
  pos_x        real default 0 not null,
  pos_y        real default 0 not null,
  rotation     real default 0 not null,
  z_index      integer default 1 not null,
  created_at   timestamptz not null default now()
);

-- ─── scrapbooks ──────────────────────────────────────────────────────────────

create table if not exists public.scrapbooks (
  id         uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.users(id) on delete cascade,
  title      text not null,
  cover_emoji text default '📒' not null,
  description text,
  is_finished boolean default false not null,
  created_at  timestamptz default now() not null
);

create table if not exists public.scrapbook_members (
  id           uuid primary key default gen_random_uuid(),
  scrapbook_id uuid not null references public.scrapbooks(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  joined_at    timestamptz default now() not null,
  unique (scrapbook_id, user_id)
);

create table if not exists public.scrapbook_pages (
  id           uuid primary key default gen_random_uuid(),
  scrapbook_id uuid not null references public.scrapbooks(id) on delete cascade,
  page_number  integer not null,
  layout       text check (layout in ('single', 'grid', 'collage')) default 'collage' not null,
  title        text,
  created_at   timestamptz default now() not null,
  unique (scrapbook_id, page_number)
);

create table if not exists public.scrapbook_items (
  id           uuid primary key default gen_random_uuid(),
  page_id      uuid not null references public.scrapbook_pages(id) on delete cascade,
  scrapbook_id uuid not null references public.scrapbooks(id) on delete cascade,
  creator_id   uuid not null references public.users(id) on delete cascade,
  image_url    text,
  thumbnail_url text,
  storage_path text,
  note         text,
  pos_x        real default 0 not null,
  pos_y        real default 0 not null,
  rotation     real default 0 not null,
  scale        real default 1 not null,
  order_index  integer default 0 not null,
  created_at   timestamptz default now() not null
);

-- ─── push notifications log ───────────────────────────────────────────────────

create table if not exists public.push_notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  type       text not null,
  sent_at    timestamptz not null default now(),
  push_token text not null
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.users                enable row level security;
alter table public.invite_codes         enable row level security;
alter table public.friendships          enable row level security;
alter table public.posts                enable row level security;
alter table public.post_recipients      enable row level security;
alter table public.reactions            enable row level security;
alter table public.capsules             enable row level security;
alter table public.capsule_members      enable row level security;
alter table public.capsule_submissions  enable row level security;
alter table public.desk_drops           enable row level security;
alter table public.camera_passes        enable row level security;
alter table public.pass_participants    enable row level security;
alter table public.pass_shots           enable row level security;
alter table public.cork_boards          enable row level security;
alter table public.cork_board_members   enable row level security;
alter table public.cork_board_items     enable row level security;
alter table public.scrapbooks           enable row level security;
alter table public.scrapbook_members    enable row level security;
alter table public.scrapbook_pages      enable row level security;
alter table public.scrapbook_items      enable row level security;
alter table public.push_notifications   enable row level security;

-- Drop existing policies to allow re-run
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ─── Security-definer helpers (break recursive policy chains) ─────────────────
create or replace function public.my_scrapbook_ids()
returns uuid[] language sql security definer stable
set search_path = public as $$
  select array(select scrapbook_id from scrapbook_members where user_id = auth.uid());
$$;

create or replace function public.my_capsule_ids()
returns uuid[] language sql security definer stable
set search_path = public as $$
  select array(select capsule_id from capsule_members where user_id = auth.uid());
$$;

create or replace function public.my_board_ids()
returns uuid[] language sql security definer stable
set search_path = public as $$
  select array(select board_id from cork_board_members where user_id = auth.uid());
$$;

create or replace function public.my_pass_ids()
returns uuid[] language sql security definer stable
set search_path = public as $$
  select array(select pass_id from pass_participants where user_id = auth.uid());
$$;

grant execute on function public.my_scrapbook_ids() to authenticated, anon;
grant execute on function public.my_capsule_ids()   to authenticated, anon;
grant execute on function public.my_board_ids()     to authenticated, anon;
grant execute on function public.my_pass_ids()      to authenticated, anon;

-- users
create policy "users_select"  on public.users for select using (true);
create policy "users_insert"  on public.users for insert with check (auth.uid() = id);
create policy "users_update"  on public.users for update using (auth.uid() = id);
create policy "users_delete"  on public.users for delete using (auth.uid() = id);

-- invite_codes
create policy "invite_codes_select" on public.invite_codes for select using (true);
create policy "invite_codes_insert" on public.invite_codes for insert with check (auth.uid() = created_by);
create policy "invite_codes_update" on public.invite_codes for update using (auth.uid() = created_by or auth.uid() = used_by);

-- friendships
create policy "friendships_select" on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friendships_insert" on public.friendships for insert with check (auth.uid() = user_id);
create policy "friendships_update" on public.friendships for update using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friendships_delete" on public.friendships for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- posts
create policy "posts_all"    on public.posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "posts_select_recipient" on public.posts for select using (
  exists (select 1 from public.post_recipients pr where pr.post_id = id and pr.recipient_id = auth.uid())
);

-- post_recipients
create policy "post_recipients_insert" on public.post_recipients for insert with check (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
);
create policy "post_recipients_select" on public.post_recipients for select using (recipient_id = auth.uid() or exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
create policy "post_recipients_update" on public.post_recipients for update using (recipient_id = auth.uid());

-- reactions
create policy "reactions_select" on public.reactions for select using (auth.uid() = user_id or exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
create policy "reactions_insert" on public.reactions for insert with check (auth.uid() = user_id);
create policy "reactions_delete" on public.reactions for delete using (auth.uid() = user_id);

-- capsules
create policy "capsules_select" on public.capsules for select using (creator_id = auth.uid() or id = any(public.my_capsule_ids()));
create policy "capsules_insert" on public.capsules for insert with check (creator_id = auth.uid());
create policy "capsules_update" on public.capsules for update using (creator_id = auth.uid());

-- capsule_members
create policy "capsule_members_select" on public.capsule_members for select using (capsule_id = any(public.my_capsule_ids()));
create policy "capsule_members_insert" on public.capsule_members for insert with check (exists (select 1 from public.capsules where id = capsule_id and creator_id = auth.uid()) or user_id = auth.uid());
create policy "capsule_members_update" on public.capsule_members for update using (exists (select 1 from public.capsules where id = capsule_id and creator_id = auth.uid()) or user_id = auth.uid());

-- capsule_submissions
create policy "capsule_submissions_select" on public.capsule_submissions for select using (user_id = auth.uid() or exists (select 1 from public.capsules c join public.capsule_members cm on cm.capsule_id = c.id where c.id = capsule_submissions.capsule_id and cm.user_id = auth.uid() and c.is_opened = true));
create policy "capsule_submissions_insert" on public.capsule_submissions for insert with check (user_id = auth.uid() and exists (select 1 from public.capsule_members where capsule_id = capsule_submissions.capsule_id and user_id = auth.uid()));
create policy "capsule_submissions_update" on public.capsule_submissions for update using (user_id = auth.uid());

-- desk_drops
create policy "desk_drops_select" on public.desk_drops for select using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "desk_drops_insert" on public.desk_drops for insert with check (sender_id = auth.uid());
create policy "desk_drops_update" on public.desk_drops for update using (recipient_id = auth.uid());

-- camera_passes
create policy "camera_passes_select" on public.camera_passes for select using (creator_id = auth.uid() or id = any(public.my_pass_ids()));
create policy "camera_passes_insert" on public.camera_passes for insert with check (creator_id = auth.uid());
create policy "camera_passes_update" on public.camera_passes for update using (creator_id = auth.uid() or current_holder_id = auth.uid());

-- pass_participants
create policy "pass_participants_select" on public.pass_participants for select using (pass_id = any(public.my_pass_ids()) or exists (select 1 from public.camera_passes where id = pass_id and creator_id = auth.uid()));
create policy "pass_participants_insert" on public.pass_participants for insert with check (exists (select 1 from public.camera_passes where id = pass_id and creator_id = auth.uid()));

-- pass_shots
create policy "pass_shots_select" on public.pass_shots for select using (pass_id = any(public.my_pass_ids()) or exists (select 1 from public.camera_passes where id = pass_id and creator_id = auth.uid()));
create policy "pass_shots_insert" on public.pass_shots for insert with check (photographer_id = auth.uid() and exists (select 1 from public.camera_passes where id = pass_shots.pass_id and current_holder_id = auth.uid()));

-- cork_boards
create policy "cork_boards_select" on public.cork_boards for select using (id in (select board_id from public.cork_board_members where user_id = auth.uid()) or creator_id = auth.uid());
create policy "cork_boards_insert" on public.cork_boards for insert with check (creator_id = auth.uid());
create policy "cork_boards_update" on public.cork_boards for update using (creator_id = auth.uid());
create policy "cork_boards_delete" on public.cork_boards for delete using (creator_id = auth.uid());

-- cork_board_members
create policy "cork_board_members_select" on public.cork_board_members for select using (board_id = any(public.my_board_ids()));
create policy "cork_board_members_insert" on public.cork_board_members for insert with check (board_id in (select id from public.cork_boards where creator_id = auth.uid()) or user_id = auth.uid());

-- cork_board_items
create policy "cork_board_items_select" on public.cork_board_items for select using (board_id = any(public.my_board_ids()));
create policy "cork_board_items_insert" on public.cork_board_items for insert with check (creator_id = auth.uid() and board_id = any(public.my_board_ids()));
create policy "cork_board_items_update" on public.cork_board_items for update using (board_id = any(public.my_board_ids()));
create policy "cork_board_items_delete" on public.cork_board_items for delete using (creator_id = auth.uid());

-- scrapbooks
create policy "scrapbooks_select" on public.scrapbooks for select using (creator_id = auth.uid() or id = any(public.my_scrapbook_ids()));
create policy "scrapbooks_insert" on public.scrapbooks for insert with check (creator_id = auth.uid());
create policy "scrapbooks_update" on public.scrapbooks for update using (creator_id = auth.uid());

-- scrapbook_members
create policy "scrapbook_members_select" on public.scrapbook_members for select using (scrapbook_id = any(public.my_scrapbook_ids()));
create policy "scrapbook_members_insert" on public.scrapbook_members for insert with check (scrapbook_id in (select id from public.scrapbooks where creator_id = auth.uid()) or user_id = auth.uid());

-- scrapbook_pages
create policy "scrapbook_pages_select" on public.scrapbook_pages for select using (scrapbook_id = any(public.my_scrapbook_ids()));
create policy "scrapbook_pages_insert" on public.scrapbook_pages for insert with check (scrapbook_id = any(public.my_scrapbook_ids()));

-- scrapbook_items
create policy "scrapbook_items_select" on public.scrapbook_items for select using (scrapbook_id = any(public.my_scrapbook_ids()));
create policy "scrapbook_items_insert" on public.scrapbook_items for insert with check (creator_id = auth.uid() and scrapbook_id = any(public.my_scrapbook_ids()));
create policy "scrapbook_items_delete" on public.scrapbook_items for delete using (creator_id = auth.uid());

-- push_notifications (service role only)
create policy "push_notifications_none" on public.push_notifications using (false);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKET
-- ═══════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', false, 10485760,
  array['image/jpeg','image/jpg','image/png','image/webp','image/heic']
)
on conflict (id) do nothing;

-- Drop old storage policies
drop policy if exists "photos: authenticated upload own" on storage.objects;
drop policy if exists "photos: recipients can read" on storage.objects;
drop policy if exists "photos: author can delete own" on storage.objects;

-- Upload: user's folder must appear in path (position 1 OR 2 covers all app upload paths)
create policy "photos_upload" on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Read: author or recipient of a developed post, or own uploads
create policy "photos_read" on storage.objects for select
  using (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = auth.uid()::text
      or exists (
        select 1 from public.post_recipients pr
        join public.posts p on p.id = pr.post_id
        where pr.recipient_id = auth.uid()
          and p.storage_path = name
      )
    )
  );

-- Delete: own files only
create policy "photos_delete" on storage.objects for delete
  using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════════════════════════

alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.post_recipients;
alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.capsule_submissions;
alter publication supabase_realtime add table public.capsule_members;
alter publication supabase_realtime add table public.camera_passes;
alter publication supabase_realtime add table public.desk_drops;
alter publication supabase_realtime add table public.cork_board_items;
alter publication supabase_realtime add table public.scrapbook_items;
alter publication supabase_realtime add table public.scrapbook_pages;

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES for performance
-- ═══════════════════════════════════════════════════════════════════════════════

create index if not exists post_recipients_darkroom_idx
  on public.post_recipients (recipient_id, developed_at, viewed_at)
  where viewed_at is null;
