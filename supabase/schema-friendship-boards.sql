-- Friendship Boards: persistent shared spaces per friendship/group

CREATE TABLE friendship_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  cover_emoji TEXT DEFAULT '🏠' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE friendship_board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES friendship_boards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(board_id, user_id)
);

-- RLS
ALTER TABLE friendship_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendship_board_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendship_boards_select" ON friendship_boards
  FOR SELECT USING (
    id IN (SELECT board_id FROM friendship_board_members WHERE user_id = auth.uid())
  );

CREATE POLICY "friendship_boards_insert" ON friendship_boards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "friendship_board_members_select" ON friendship_board_members
  FOR SELECT USING (
    board_id IN (SELECT board_id FROM friendship_board_members WHERE user_id = auth.uid())
  );

CREATE POLICY "friendship_board_members_insert" ON friendship_board_members
  FOR INSERT WITH CHECK (true);
