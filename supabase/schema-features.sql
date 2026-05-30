-- ============================================================
-- YOUR BLOCK — Feature Systems Schema
-- Run after schema.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- DISPOSABLE CAMERA ROLLS
-- ────────────────────────────────────────────────────────────

create table if not exists rolls (
  id          uuid    primary key default gen_random_uuid(),
  creator_id  uuid    not null references users(id) on delete cascade,
  name        text    not null,
  description text,
  cover_emoji text    not null default '🎞',
  max_shots   integer not null default 24,
  shots_taken integer not null default 0,
  status      text    not null default 'active'
              check (status in ('active','developing','developed')),
  developed_at timestamptz,
  is_revealed  boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists roll_members (
  id        uuid primary key default gen_random_uuid(),
  roll_id   uuid not null references rolls(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (roll_id, user_id)
);

create table if not exists roll_shots (
  id              uuid primary key default gen_random_uuid(),
  roll_id         uuid not null references rolls(id) on delete cascade,
  photographer_id uuid not null references users(id) on delete cascade,
  image_url       text,
  thumbnail_url   text,
  storage_path    text not null,
  note            text,
  shot_number     integer not null,
  taken_at        timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- TIME CAPSULES
-- ────────────────────────────────────────────────────────────

create table if not exists capsules (
  id              uuid primary key default gen_random_uuid(),
  creator_id      uuid not null references users(id) on delete cascade,
  title           text not null,
  description     text,
  cover_emoji     text not null default '📦',
  unlock_type     text not null default 'date'
                  check (unlock_type in ('date','milestone')),
  unlock_at       timestamptz,
  milestone_label text,
  is_opened       boolean not null default false,
  opened_at       timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists capsule_members (
  id            uuid primary key default gen_random_uuid(),
  capsule_id    uuid not null references capsules(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  has_submitted boolean not null default false,
  joined_at     timestamptz not null default now(),
  unique (capsule_id, user_id)
);

create table if not exists capsule_submissions (
  id            uuid primary key default gen_random_uuid(),
  capsule_id    uuid not null references capsules(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  image_url     text,
  thumbnail_url text,
  storage_path  text,
  note          text,
  submitted_at  timestamptz not null default now(),
  unique (capsule_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- CAMERA PASSES (PASS THE CAMERA)
-- ────────────────────────────────────────────────────────────

create table if not exists camera_passes (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references users(id) on delete cascade,
  title             text,
  is_complete       boolean not null default false,
  current_holder_id uuid references users(id),
  time_limit_hours  integer,
  created_at        timestamptz not null default now()
);

create table if not exists pass_participants (
  id           uuid primary key default gen_random_uuid(),
  pass_id      uuid not null references camera_passes(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  order_index  integer not null,
  completed    boolean not null default false,
  completed_at timestamptz,
  unique (pass_id, user_id)
);

create table if not exists pass_shots (
  id              uuid primary key default gen_random_uuid(),
  pass_id         uuid not null references camera_passes(id) on delete cascade,
  photographer_id uuid not null references users(id) on delete cascade,
  image_url       text,
  thumbnail_url   text,
  storage_path    text not null,
  note            text,
  order_index     integer not null,
  taken_at        timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- DESK DROPS  (photo left on your desk)
-- ────────────────────────────────────────────────────────────

create table if not exists desk_drops (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references users(id) on delete cascade,
  recipient_id  uuid not null references users(id) on delete cascade,
  image_url     text,
  thumbnail_url text,
  storage_path  text,
  note          text,
  is_discovered boolean not null default false,
  discovered_at timestamptz,
  created_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- PHOTO BOOTH SESSIONS
-- ────────────────────────────────────────────────────────────

create table if not exists booth_sessions (
  id         uuid    primary key default gen_random_uuid(),
  creator_id uuid    not null references users(id) on delete cascade,
  shot_count integer not null default 4,
  created_at timestamptz not null default now()
);

create table if not exists booth_shots (
  id           uuid    primary key default gen_random_uuid(),
  session_id   uuid    not null references booth_sessions(id) on delete cascade,
  image_url    text    not null,
  storage_path text    not null,
  shot_number  integer not null,
  taken_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- CORK BOARDS  (schema ready — UI TBD)
-- ────────────────────────────────────────────────────────────

create table if not exists cork_boards (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  creator_id uuid not null references users(id) on delete cascade,
  background text not null default 'cork',
  created_at timestamptz not null default now()
);

create table if not exists cork_board_members (
  id       uuid primary key default gen_random_uuid(),
  board_id uuid not null references cork_boards(id) on delete cascade,
  user_id  uuid not null references users(id) on delete cascade,
  unique (board_id, user_id)
);

create table if not exists cork_board_items (
  id           uuid    primary key default gen_random_uuid(),
  board_id     uuid    not null references cork_boards(id) on delete cascade,
  user_id      uuid    not null references users(id) on delete cascade,
  item_type    text    not null check (item_type in ('photo','note','sticker')),
  pos_x        float   not null default 0,
  pos_y        float   not null default 0,
  rotation     float   not null default 0,
  scale        float   not null default 1,
  z_index      integer not null default 0,
  content      text,
  image_url    text,
  storage_path text,
  color        text,
  created_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- FRIENDSHIP BOARDS  (schema ready — UI TBD)
-- ────────────────────────────────────────────────────────────

create table if not exists friendship_boards (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  creator_id  uuid not null references users(id) on delete cascade,
  theme       text not null default 'default',
  description text,
  cover_emoji text default '🏠',
  created_at  timestamptz not null default now()
);

create table if not exists friendship_board_members (
  id       uuid primary key default gen_random_uuid(),
  board_id uuid not null references friendship_boards(id) on delete cascade,
  user_id  uuid not null references users(id) on delete cascade,
  unique (board_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

alter table rolls                    enable row level security;
alter table roll_members             enable row level security;
alter table roll_shots               enable row level security;
alter table capsules                 enable row level security;
alter table capsule_members          enable row level security;
alter table capsule_submissions      enable row level security;
alter table camera_passes            enable row level security;
alter table pass_participants        enable row level security;
alter table pass_shots               enable row level security;
alter table desk_drops               enable row level security;
alter table booth_sessions           enable row level security;
alter table booth_shots              enable row level security;
alter table cork_boards              enable row level security;
alter table cork_board_members       enable row level security;
alter table cork_board_items         enable row level security;
alter table friendship_boards        enable row level security;
alter table friendship_board_members enable row level security;

-- ROLLS
create policy "roll members select" on rolls for select
  using (exists (select 1 from roll_members where roll_id = id and user_id = auth.uid()));
create policy "roll creator insert" on rolls for insert
  with check (creator_id = auth.uid());
create policy "roll creator update" on rolls for update
  using (creator_id = auth.uid());

create policy "roll members select members" on roll_members for select
  using (exists (select 1 from roll_members rm2 where rm2.roll_id = roll_id and rm2.user_id = auth.uid()));
create policy "roll creator add members" on roll_members for insert
  with check (exists (select 1 from rolls where id = roll_id and creator_id = auth.uid()));

create policy "roll members select shots" on roll_shots for select
  using (exists (select 1 from roll_members where roll_id = roll_shots.roll_id and user_id = auth.uid()));
create policy "roll members add shots" on roll_shots for insert
  with check (photographer_id = auth.uid()
    and exists (select 1 from roll_members where roll_id = roll_shots.roll_id and user_id = auth.uid())
    and exists (select 1 from rolls where id = roll_shots.roll_id and status = 'active'));

-- CAPSULES
create policy "capsule members select" on capsules for select
  using (exists (select 1 from capsule_members where capsule_id = id and user_id = auth.uid()));
create policy "capsule creator insert" on capsules for insert
  with check (creator_id = auth.uid());
create policy "capsule creator update" on capsules for update
  using (creator_id = auth.uid());

create policy "capsule members select members" on capsule_members for select
  using (exists (select 1 from capsule_members cm2 where cm2.capsule_id = capsule_id and cm2.user_id = auth.uid()));
create policy "capsule creator add members" on capsule_members for insert
  with check (exists (select 1 from capsules where id = capsule_id and creator_id = auth.uid())
    or user_id = auth.uid());

create policy "capsule members select submissions" on capsule_submissions for select
  using (user_id = auth.uid()
    or exists (
      select 1 from capsules c join capsule_members cm on cm.capsule_id = c.id
      where c.id = capsule_submissions.capsule_id and cm.user_id = auth.uid() and c.is_opened = true
    ));
create policy "capsule members submit" on capsule_submissions for insert
  with check (user_id = auth.uid()
    and exists (select 1 from capsule_members where capsule_id = capsule_submissions.capsule_id and user_id = auth.uid()));

-- CAMERA PASSES
create policy "pass participants select pass" on camera_passes for select
  using (creator_id = auth.uid()
    or exists (select 1 from pass_participants where pass_id = id and user_id = auth.uid()));
create policy "pass creator insert" on camera_passes for insert with check (creator_id = auth.uid());
create policy "pass update" on camera_passes for update
  using (creator_id = auth.uid() or current_holder_id = auth.uid());

create policy "pass participants select" on pass_participants for select
  using (exists (select 1 from camera_passes where id = pass_id
    and (creator_id = auth.uid()
      or exists (select 1 from pass_participants pp2 where pp2.pass_id = pass_id and pp2.user_id = auth.uid()))));
create policy "pass creator add participants" on pass_participants for insert
  with check (exists (select 1 from camera_passes where id = pass_id and creator_id = auth.uid()));

create policy "pass participants select shots" on pass_shots for select
  using (exists (select 1 from pass_participants where pass_id = pass_shots.pass_id and user_id = auth.uid()));
create policy "pass holder add shot" on pass_shots for insert
  with check (photographer_id = auth.uid()
    and exists (select 1 from camera_passes where id = pass_shots.pass_id and current_holder_id = auth.uid()));

-- DESK DROPS
create policy "desk drop parties select" on desk_drops for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "desk drop sender insert" on desk_drops for insert with check (sender_id = auth.uid());
create policy "desk drop recipient update" on desk_drops for update using (recipient_id = auth.uid());

-- BOOTH
create policy "own booth sessions" on booth_sessions for select using (creator_id = auth.uid());
create policy "own booth sessions insert" on booth_sessions for insert with check (creator_id = auth.uid());
create policy "own booth shots" on booth_shots for select
  using (exists (select 1 from booth_sessions where id = session_id and creator_id = auth.uid()));
create policy "own booth shots insert" on booth_shots for insert
  with check (exists (select 1 from booth_sessions where id = session_id and creator_id = auth.uid()));

-- ────────────────────────────────────────────────────────────
-- REALTIME SUBSCRIPTIONS
-- ────────────────────────────────────────────────────────────

alter publication supabase_realtime add table roll_shots;
alter publication supabase_realtime add table capsule_submissions;
alter publication supabase_realtime add table capsule_members;
alter publication supabase_realtime add table pass_shots;
alter publication supabase_realtime add table camera_passes;
alter publication supabase_realtime add table desk_drops;
