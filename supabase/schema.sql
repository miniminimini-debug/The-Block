-- ─────────────────────────────────────────────────────────────────────────────
-- The Block — Complete Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────

create type mood_type as enum (
  'cozy','happy','reflective','adventurous','melancholic',
  'excited','peaceful','anxious','grateful','nostalgic'
);

create type room_type as enum (
  'bedroom','studio','loft','treehouse','rooftop','cabin','basement','van'
);

create type friendship_status as enum ('pending','accepted','blocked');

-- ─── users ───────────────────────────────────────────────────────────────────

create table if not exists public.users (
  id                       uuid primary key references auth.users(id) on delete cascade,
  phone_number             text unique,
  username                 text not null unique,
  display_name             text,
  avatar_url               text,
  avatar_emoji             text default '🌙',
  push_token               text,
  bio                      text,
  room_type                room_type not null default 'bedroom',
  room_theme               jsonb not null default '{}',
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

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

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
  max_uses    integer not null default 1,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index on public.invite_codes (code);
create index on public.invite_codes (created_by);

-- Auto-generate invite code on user creation
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

  insert into public.invite_codes (code, created_by, max_uses)
  values (new_code, new.id, 3);

  -- Also set the user's personal invite_code to the same value
  update public.users set invite_code = new_code where id = new.id;

  return new;
end;
$$;

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
  circle_label         text,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, friend_id)
);

create index on public.friendships (user_id, status);
create index on public.friendships (friend_id, status);

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
  latitude                double precision,
  longitude               double precision,
  location_name           text,
  reaction_counts         jsonb not null default '{}',
  view_count              integer not null default 0,
  created_at              timestamptz not null default now()
);

create index on public.posts (user_id, created_at desc);
create index on public.posts (development_status, developed_at);

-- Auto-schedule development reveal
create or replace function public.schedule_post_development()
returns trigger language plpgsql as $$
begin
  new.developed_at := new.created_at + (new.development_delay_mins || ' minutes')::interval;
  return new;
end;
$$;

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

create index on public.post_recipients (recipient_id, developed_at);
create index on public.post_recipients (post_id);

-- Auto-set developed_at on insert
create or replace function public.set_post_recipient_developed_at()
returns trigger language plpgsql as $$
begin
  new.developed_at := new.created_at + (new.development_delay_mins || ' minutes')::interval;
  return new;
end;
$$;

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

create index on public.reactions (post_id);

-- ─── Views ───────────────────────────────────────────────────────────────────

create or replace view public.friend_rooms as
select
  f.friend_id,
  u.username,
  u.display_name,
  u.avatar_url,
  u.avatar_emoji,
  u.room_type,
  u.room_theme,
  u.current_mood,
  u.is_online,
  u.last_seen_at,
  f.friendship_level,
  f.streak_days,
  (
    select max(pr.created_at)
    from public.post_recipients pr
    join public.posts p on p.id = pr.post_id
    where p.user_id = f.friend_id
      and pr.recipient_id = f.user_id
  ) as latest_post_at,
  exists (
    select 1
    from public.post_recipients pr
    join public.posts p on p.id = pr.post_id
    where p.user_id = f.friend_id
      and pr.recipient_id = f.user_id
      and pr.viewed_at is null
      and pr.developed_at <= now()
  ) as has_new_post
from public.friendships f
join public.users u on u.id = f.friend_id
where f.status = 'accepted';

-- ─── RLS Policies ────────────────────────────────────────────────────────────

-- users
alter table public.users enable row level security;

create policy "users: public read"
  on public.users for select using (true);

create policy "users: own write"
  on public.users for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- invite_codes
alter table public.invite_codes enable row level security;

create policy "invite_codes: anyone can read to validate"
  on public.invite_codes for select using (true);

create policy "invite_codes: owner can insert"
  on public.invite_codes for insert
  with check (auth.uid() = created_by);

create policy "invite_codes: owner can update own codes"
  on public.invite_codes for update
  using (auth.uid() = created_by or auth.uid() = used_by);

-- friendships
alter table public.friendships enable row level security;

create policy "friendships: read own"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships: insert own"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "friendships: update own"
  on public.friendships for update
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships: delete own"
  on public.friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- posts
alter table public.posts enable row level security;

create policy "posts: author can do all"
  on public.posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "posts: recipients can read developed posts"
  on public.posts for select
  using (
    exists (
      select 1 from public.post_recipients pr
      where pr.post_id = id
        and pr.recipient_id = auth.uid()
        and pr.developed_at <= now()
    )
  );

-- post_recipients
alter table public.post_recipients enable row level security;

create policy "post_recipients: author can insert"
  on public.post_recipients for insert
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.user_id = auth.uid()
    )
  );

create policy "post_recipients: recipient can read own"
  on public.post_recipients for select
  using (recipient_id = auth.uid());

create policy "post_recipients: recipient can update viewed_at"
  on public.post_recipients for update
  using (recipient_id = auth.uid());

-- reactions
alter table public.reactions enable row level security;

create policy "reactions: anyone involved can read"
  on public.reactions for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()
    )
  );

create policy "reactions: authenticated insert own"
  on public.reactions for insert
  with check (auth.uid() = user_id);

create policy "reactions: delete own"
  on public.reactions for delete
  using (auth.uid() = user_id);

-- ─── Storage bucket ──────────────────────────────────────────────────────────

-- Run this AFTER creating the bucket named 'photos' in Storage UI

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', false,
  10485760,  -- 10 MB
  array['image/jpeg','image/jpg','image/png','image/webp','image/heic']
)
on conflict (id) do nothing;

create policy "photos: authenticated upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos: recipients can read"
  on storage.objects for select
  using (
    bucket_id = 'photos'
    and (
      -- author
      (storage.foldername(name))[1] = auth.uid()::text
      -- or recipient of a developed post
      or exists (
        select 1
        from public.post_recipients pr
        join public.posts p on p.id = pr.post_id
        where pr.recipient_id = auth.uid()
          and pr.developed_at <= now()
          and p.storage_path = name
      )
    )
  );

create policy "photos: author can delete own"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Realtime ────────────────────────────────────────────────────────────────

-- Enable realtime for these tables in Supabase Dashboard:
-- Database → Replication → enable for: friendships, post_recipients, users (is_online + current_mood columns)
-- Or via SQL:

alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.post_recipients;
alter publication supabase_realtime add table public.users;
