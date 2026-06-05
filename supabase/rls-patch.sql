-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS PATCH v3 — clean rewrite, no helper functions, no recursion
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Drop EVERY policy on affected tables ─────────────────────────────────────
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
-- member_select is just "your own rows" — no subquery, no recursion.
-- capsules_select subqueries capsule_members filtered by user_id = auth.uid(),
-- which trivially satisfies capsule_members_select → no mutual recursion.

create policy "capsule_members_select" on public.capsule_members
  for select using (user_id = auth.uid());

create policy "capsule_members_insert" on public.capsule_members
  for insert with check (
    user_id = auth.uid()
    or exists (select 1 from public.capsules where id = capsule_id and creator_id = auth.uid())
  );

create policy "capsule_members_update" on public.capsule_members
  for update using (user_id = auth.uid());

create policy "capsules_select" on public.capsules
  for select using (
    creator_id = auth.uid()
    or id in (select capsule_id from public.capsule_members where user_id = auth.uid())
  );

create policy "capsules_insert" on public.capsules
  for insert with check (creator_id = auth.uid());

create policy "capsules_update" on public.capsules
  for update using (creator_id = auth.uid());

create policy "capsule_submissions_select" on public.capsule_submissions
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.capsules
      where id = capsule_submissions.capsule_id
        and is_opened = true
        and (creator_id = auth.uid()
             or id in (select capsule_id from public.capsule_members where user_id = auth.uid()))
    )
  );

create policy "capsule_submissions_insert" on public.capsule_submissions
  for insert with check (
    user_id = auth.uid()
    and capsule_id in (select capsule_id from public.capsule_members where user_id = auth.uid())
  );

create policy "capsule_submissions_update" on public.capsule_submissions
  for update using (user_id = auth.uid());

-- ─── Camera Passes ────────────────────────────────────────────────────────────

create policy "pass_participants_select" on public.pass_participants
  for select using (user_id = auth.uid());

create policy "pass_participants_insert" on public.pass_participants
  for insert with check (
    exists (select 1 from public.camera_passes where id = pass_id and creator_id = auth.uid())
  );

create policy "camera_passes_select" on public.camera_passes
  for select using (
    creator_id = auth.uid()
    or id in (select pass_id from public.pass_participants where user_id = auth.uid())
  );

create policy "camera_passes_insert" on public.camera_passes
  for insert with check (creator_id = auth.uid());

create policy "camera_passes_update" on public.camera_passes
  for update using (creator_id = auth.uid() or current_holder_id = auth.uid());

create policy "pass_shots_select" on public.pass_shots
  for select using (
    photographer_id = auth.uid()
    or pass_id in (select pass_id from public.pass_participants where user_id = auth.uid())
    or pass_id in (select id from public.camera_passes where creator_id = auth.uid())
  );

create policy "pass_shots_insert" on public.pass_shots
  for insert with check (
    photographer_id = auth.uid()
    and exists (select 1 from public.camera_passes where id = pass_shots.pass_id and current_holder_id = auth.uid())
  );

-- ─── Scrapbooks ───────────────────────────────────────────────────────────────

create policy "scrapbook_members_select" on public.scrapbook_members
  for select using (user_id = auth.uid());

create policy "scrapbook_members_insert" on public.scrapbook_members
  for insert with check (
    user_id = auth.uid()
    or scrapbook_id in (select id from public.scrapbooks where creator_id = auth.uid())
  );

create policy "scrapbooks_select" on public.scrapbooks
  for select using (
    creator_id = auth.uid()
    or id in (select scrapbook_id from public.scrapbook_members where user_id = auth.uid())
  );

create policy "scrapbooks_insert" on public.scrapbooks
  for insert with check (creator_id = auth.uid());

create policy "scrapbooks_update" on public.scrapbooks
  for update using (creator_id = auth.uid());

create policy "scrapbook_pages_select" on public.scrapbook_pages
  for select using (
    scrapbook_id in (select scrapbook_id from public.scrapbook_members where user_id = auth.uid())
    or scrapbook_id in (select id from public.scrapbooks where creator_id = auth.uid())
  );

create policy "scrapbook_pages_insert" on public.scrapbook_pages
  for insert with check (
    scrapbook_id in (select scrapbook_id from public.scrapbook_members where user_id = auth.uid())
    or scrapbook_id in (select id from public.scrapbooks where creator_id = auth.uid())
  );

create policy "scrapbook_items_select" on public.scrapbook_items
  for select using (
    scrapbook_id in (select scrapbook_id from public.scrapbook_members where user_id = auth.uid())
    or scrapbook_id in (select id from public.scrapbooks where creator_id = auth.uid())
  );

create policy "scrapbook_items_insert" on public.scrapbook_items
  for insert with check (
    creator_id = auth.uid()
    and (
      scrapbook_id in (select scrapbook_id from public.scrapbook_members where user_id = auth.uid())
      or scrapbook_id in (select id from public.scrapbooks where creator_id = auth.uid())
    )
  );

create policy "scrapbook_items_delete" on public.scrapbook_items
  for delete using (creator_id = auth.uid());

-- ─── Cork Boards ──────────────────────────────────────────────────────────────

create policy "cork_board_members_select" on public.cork_board_members
  for select using (user_id = auth.uid());

create policy "cork_board_members_insert" on public.cork_board_members
  for insert with check (
    user_id = auth.uid()
    or board_id in (select id from public.cork_boards where creator_id = auth.uid())
  );

create policy "cork_boards_select" on public.cork_boards
  for select using (
    creator_id = auth.uid()
    or id in (select board_id from public.cork_board_members where user_id = auth.uid())
  );

create policy "cork_boards_insert" on public.cork_boards
  for insert with check (creator_id = auth.uid());

create policy "cork_boards_update" on public.cork_boards
  for update using (creator_id = auth.uid());

create policy "cork_boards_delete" on public.cork_boards
  for delete using (creator_id = auth.uid());

create policy "cork_board_items_select" on public.cork_board_items
  for select using (
    board_id in (select board_id from public.cork_board_members where user_id = auth.uid())
    or board_id in (select id from public.cork_boards where creator_id = auth.uid())
  );

create policy "cork_board_items_insert" on public.cork_board_items
  for insert with check (
    board_id in (select board_id from public.cork_board_members where user_id = auth.uid())
    or board_id in (select id from public.cork_boards where creator_id = auth.uid())
  );

create policy "cork_board_items_update" on public.cork_board_items
  for update using (
    board_id in (select board_id from public.cork_board_members where user_id = auth.uid())
    or board_id in (select id from public.cork_boards where creator_id = auth.uid())
  );

create policy "cork_board_items_delete" on public.cork_board_items
  for delete using (
    board_id in (select board_id from public.cork_board_members where user_id = auth.uid())
    or board_id in (select id from public.cork_boards where creator_id = auth.uid())
  );
