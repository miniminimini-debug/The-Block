-- Cork Boards: collaborative drag-and-drop canvas boards

CREATE TABLE cork_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  cover_emoji TEXT DEFAULT '📌' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE cork_board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES cork_boards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(board_id, user_id)
);

CREATE TABLE cork_board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES cork_boards(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('photo', 'note')) NOT NULL,
  -- photo fields
  image_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  -- note fields
  note_text TEXT,
  color TEXT DEFAULT '#F5E6A3' NOT NULL,
  -- layout
  pos_x REAL DEFAULT 0 NOT NULL,
  pos_y REAL DEFAULT 0 NOT NULL,
  rotation REAL DEFAULT 0 NOT NULL,
  z_index INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE cork_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cork_board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cork_board_items ENABLE ROW LEVEL SECURITY;

-- Members can read boards they belong to
CREATE POLICY "cork_boards_select" ON cork_boards
  FOR SELECT USING (
    id IN (SELECT board_id FROM cork_board_members WHERE user_id = auth.uid())
  );

-- Creator can insert
CREATE POLICY "cork_boards_insert" ON cork_boards
  FOR INSERT WITH CHECK (creator_id = auth.uid());

-- Creator can delete
CREATE POLICY "cork_boards_delete" ON cork_boards
  FOR DELETE USING (creator_id = auth.uid());

-- Members read
CREATE POLICY "cork_board_members_select" ON cork_board_members
  FOR SELECT USING (
    board_id IN (SELECT board_id FROM cork_board_members WHERE user_id = auth.uid())
  );

CREATE POLICY "cork_board_members_insert" ON cork_board_members
  FOR INSERT WITH CHECK (
    board_id IN (SELECT id FROM cork_boards WHERE creator_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Items: members can read, create, update own items
CREATE POLICY "cork_board_items_select" ON cork_board_items
  FOR SELECT USING (
    board_id IN (SELECT board_id FROM cork_board_members WHERE user_id = auth.uid())
  );

CREATE POLICY "cork_board_items_insert" ON cork_board_items
  FOR INSERT WITH CHECK (
    creator_id = auth.uid()
    AND board_id IN (SELECT board_id FROM cork_board_members WHERE user_id = auth.uid())
  );

CREATE POLICY "cork_board_items_update" ON cork_board_items
  FOR UPDATE USING (
    board_id IN (SELECT board_id FROM cork_board_members WHERE user_id = auth.uid())
  );

CREATE POLICY "cork_board_items_delete" ON cork_board_items
  FOR DELETE USING (creator_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cork_board_items;
ALTER PUBLICATION supabase_realtime ADD TABLE cork_boards;
