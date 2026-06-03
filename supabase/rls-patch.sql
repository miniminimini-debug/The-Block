-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS PATCH v2 — drop ALL policies on affected tables then recreate correctly
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- (Safe to re-run; all drops use IF EXISTS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Security-definer helpers (returns uuid[] so = any() works in policies) ───
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

-- Grant execute to the roles Supabase uses for API requests
grant execute on function public.my_scrapbook_ids() to authenticated, anon;
grant execute on function public.my_capsule_ids()   to authenticated, anon;
grant execute on function public.my_board_ids()     to authenticated, anon;
grant execute on function public.my_pass_ids()      to authenticated, anon;

-- ─── Drop EVERY policy on affected tables (handles any naming convention) ─────
-- Multiple schema files created policies with different names; this clears all.
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'capsules', 'capsule_members', 'capsule_submissions',
        'camera_passes', 'pass_participants', 'pass_shots',
        'scrapbooks', 'scrapbook_members', 'scrapbook_pages', 'scrapbook_items',
        'cork_boards', 'cork_board_members', 'cork_board_items'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ─── Capsules ─────────────────────────────────────────────────────────────────
create policy "capsules_select" on public.capsules for select using (
  creator_id = auth.uid() or id = any(public.my_capsule_ids())
);
create policy "capsules_insert" on public.capsules for insert with check (creator_id = auth.uid());
create policy "capsules_update" on public.capsules for update using (creator_id = auth.uid());

create policy "capsule_members_select" on public.capsule_members for select using (
  user_id = auth.uid()
  or capsule_id = any(public.my_capsule_ids())
);
create policy "capsule_members_insert" on public.capsule_members for insert with check (
  exists (select 1 from public.capsules where id = capsule_id and creator_id = auth.uid())
  or user_id = auth.uid()
);
create policy "capsule_members_update" on public.capsule_members for update using (
  exists (select 1 from public.capsules where id = capsule_id and creator_id = auth.uid())
  or user_id = auth.uid()
);

create policy "capsule_submissions_select" on public.capsule_submissions for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.capsules c
    join public.capsule_members cm on cm.capsule_id = c.id
    where c.id = capsule_submissions.capsule_id
      and cm.user_id = auth.uid()
      and c.is_opened = true
  )
);
create policy "capsule_submissions_insert" on public.capsule_submissions for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.capsule_members where capsule_id = capsule_submissions.capsule_id and user_id = auth.uid())
);
create policy "capsule_submissions_update" on public.capsule_submissions for update using (user_id = auth.uid());

-- ─── Camera Passes ────────────────────────────────────────────────────────────
create policy "camera_passes_select" on public.camera_passes for select using (
  creator_id = auth.uid() or id = any(public.my_pass_ids())
);
create policy "camera_passes_insert" on public.camera_passes for insert with check (creator_id = auth.uid());
create policy "camera_passes_update" on public.camera_passes for update using (
  creator_id = auth.uid() or current_holder_id = auth.uid()
);

create policy "pass_participants_select" on public.pass_participants for select using (
  pass_id = any(public.my_pass_ids())
  or exists (select 1 from public.camera_passes where id = pass_id and creator_id = auth.uid())
);
create policy "pass_participants_insert" on public.pass_participants for insert with check (
  exists (select 1 from public.camera_passes where id = pass_id and creator_id = auth.uid())
);

create policy "pass_shots_select" on public.pass_shots for select using (
  pass_id = any(public.my_pass_ids())
  or exists (select 1 from public.camera_passes where id = pass_id and creator_id = auth.uid())
);
create policy "pass_shots_insert" on public.pass_shots for insert with check (
  photographer_id = auth.uid()
  and exists (select 1 from public.camera_passes where id = pass_shots.pass_id and current_holder_id = auth.uid())
);

-- ─── Scrapbooks ───────────────────────────────────────────────────────────────
create policy "scrapbooks_select" on public.scrapbooks for select using (
  creator_id = auth.uid() or id = any(public.my_scrapbook_ids())
);
create policy "scrapbooks_insert" on public.scrapbooks for insert with check (creator_id = auth.uid());
create policy "scrapbooks_update" on public.scrapbooks for update using (creator_id = auth.uid());

create policy "scrapbook_members_select" on public.scrapbook_members for select using (
  user_id = auth.uid()
  or scrapbook_id = any(public.my_scrapbook_ids())
);
create policy "scrapbook_members_insert" on public.scrapbook_members for insert with check (
  scrapbook_id in (select id from public.scrapbooks where creator_id = auth.uid())
  or user_id = auth.uid()
);

create policy "scrapbook_pages_select" on public.scrapbook_pages for select using (
  scrapbook_id = any(public.my_scrapbook_ids())
);
create policy "scrapbook_pages_insert" on public.scrapbook_pages for insert with check (
  scrapbook_id = any(public.my_scrapbook_ids())
);

create policy "scrapbook_items_select" on public.scrapbook_items for select using (
  scrapbook_id = any(public.my_scrapbook_ids())
);
create policy "scrapbook_items_insert" on public.scrapbook_items for insert with check (
  creator_id = auth.uid() and scrapbook_id = any(public.my_scrapbook_ids())
);
create policy "scrapbook_items_delete" on public.scrapbook_items for delete using (
  creator_id = auth.uid()
);

-- ─── Cork Boards ──────────────────────────────────────────────────────────────
create policy "cork_boards_select" on public.cork_boards for select using (
  creator_id = auth.uid() or id = any(public.my_board_ids())
);
create policy "cork_boards_insert" on public.cork_boards for insert with check (creator_id = auth.uid());
create policy "cork_boards_update" on public.cork_boards for update using (creator_id = auth.uid());
create policy "cork_boards_delete" on public.cork_boards for delete using (creator_id = auth.uid());

create policy "cork_board_members_select" on public.cork_board_members for select using (
  user_id = auth.uid()
  or board_id = any(public.my_board_ids())
);
create policy "cork_board_members_insert" on public.cork_board_members for insert with check (
  board_id in (select id from public.cork_boards where creator_id = auth.uid())
  or user_id = auth.uid()
);

create policy "cork_board_items_select" on public.cork_board_items for select using (
  board_id = any(public.my_board_ids())
);
create policy "cork_board_items_insert" on public.cork_board_items for insert with check (
  board_id = any(public.my_board_ids())
);
create policy "cork_board_items_update" on public.cork_board_items for update using (
  board_id = any(public.my_board_ids())
);
create policy "cork_board_items_delete" on public.cork_board_items for delete using (true);
