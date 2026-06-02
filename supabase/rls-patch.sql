-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS PATCH — fix recursive / creator-blocked policies
-- Run ONCE in Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Security-definer helpers ─────────────────────────────────────────────────
-- These bypass RLS so they can be safely called from inside a policy without
-- triggering the same policy again (which causes infinite recursion).

create or replace function public.my_scrapbook_ids()
returns uuid[] language sql security definer stable as $$
  select array(select scrapbook_id from public.scrapbook_members where user_id = auth.uid());
$$;

create or replace function public.my_capsule_ids()
returns uuid[] language sql security definer stable as $$
  select array(select capsule_id from public.capsule_members where user_id = auth.uid());
$$;

create or replace function public.my_board_ids()
returns uuid[] language sql security definer stable as $$
  select array(select board_id from public.cork_board_members where user_id = auth.uid());
$$;

create or replace function public.my_pass_ids()
returns uuid[] language sql security definer stable as $$
  select array(select pass_id from public.pass_participants where user_id = auth.uid());
$$;

-- ─── Capsules ─────────────────────────────────────────────────────────────────

-- capsules_select: add creator_id check so INSERT…SELECT works before member is added
drop policy if exists "capsules_select" on public.capsules;
create policy "capsules_select" on public.capsules for select using (
  creator_id = auth.uid() or id = any(public.my_capsule_ids())
);

-- capsule_members_select: was self-referential → use security-definer helper
drop policy if exists "capsule_members_select" on public.capsule_members;
create policy "capsule_members_select" on public.capsule_members for select using (
  capsule_id = any(public.my_capsule_ids())
);

-- ─── Scrapbooks ───────────────────────────────────────────────────────────────

-- scrapbooks_select: add creator_id check + use helper (avoids recursion through scrapbook_members)
drop policy if exists "scrapbooks_select" on public.scrapbooks;
create policy "scrapbooks_select" on public.scrapbooks for select using (
  creator_id = auth.uid() or id = any(public.my_scrapbook_ids())
);

-- scrapbook_members_select: was self-referential → use security-definer helper
drop policy if exists "scrapbook_members_select" on public.scrapbook_members;
create policy "scrapbook_members_select" on public.scrapbook_members for select using (
  scrapbook_id = any(public.my_scrapbook_ids())
);

-- scrapbook_pages: both policies queried scrapbook_members (triggers recursion above)
drop policy if exists "scrapbook_pages_select" on public.scrapbook_pages;
create policy "scrapbook_pages_select" on public.scrapbook_pages for select using (
  scrapbook_id = any(public.my_scrapbook_ids())
);

drop policy if exists "scrapbook_pages_insert" on public.scrapbook_pages;
create policy "scrapbook_pages_insert" on public.scrapbook_pages for insert with check (
  scrapbook_id = any(public.my_scrapbook_ids())
);

-- scrapbook_items: same recursion issue
drop policy if exists "scrapbook_items_select" on public.scrapbook_items;
create policy "scrapbook_items_select" on public.scrapbook_items for select using (
  scrapbook_id = any(public.my_scrapbook_ids())
);

drop policy if exists "scrapbook_items_insert" on public.scrapbook_items;
create policy "scrapbook_items_insert" on public.scrapbook_items for insert with check (
  creator_id = auth.uid() and scrapbook_id = any(public.my_scrapbook_ids())
);

-- ─── Cork Boards ──────────────────────────────────────────────────────────────

-- cork_board_members_select: was self-referential → use security-definer helper
drop policy if exists "cork_board_members_select" on public.cork_board_members;
create policy "cork_board_members_select" on public.cork_board_members for select using (
  board_id = any(public.my_board_ids())
);

-- cork_board_items: queried cork_board_members (triggers recursion above)
drop policy if exists "cork_board_items_select" on public.cork_board_items;
create policy "cork_board_items_select" on public.cork_board_items for select using (
  board_id = any(public.my_board_ids())
);

drop policy if exists "cork_board_items_insert" on public.cork_board_items;
create policy "cork_board_items_insert" on public.cork_board_items for insert with check (
  creator_id = auth.uid() and board_id = any(public.my_board_ids())
);

drop policy if exists "cork_board_items_update" on public.cork_board_items;
create policy "cork_board_items_update" on public.cork_board_items for update using (
  board_id = any(public.my_board_ids())
);

-- ─── Camera Passes ────────────────────────────────────────────────────────────

-- pass_participants_select: was doubly recursive (self-reference + mutual with camera_passes)
drop policy if exists "pass_participants_select" on public.pass_participants;
create policy "pass_participants_select" on public.pass_participants for select using (
  pass_id = any(public.my_pass_ids())
  or exists (select 1 from public.camera_passes where id = pass_id and creator_id = auth.uid())
);

-- camera_passes_select: was mutually recursive with pass_participants → use helper
drop policy if exists "camera_passes_select" on public.camera_passes;
create policy "camera_passes_select" on public.camera_passes for select using (
  creator_id = auth.uid() or id = any(public.my_pass_ids())
);

-- pass_shots_select: queried pass_participants (triggers recursion above)
drop policy if exists "pass_shots_select" on public.pass_shots;
create policy "pass_shots_select" on public.pass_shots for select using (
  pass_id = any(public.my_pass_ids())
  or exists (select 1 from public.camera_passes where id = pass_id and creator_id = auth.uid())
);
