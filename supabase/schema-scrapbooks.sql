-- Polaroid Scrapbooks: collaborative page-turning shared books

CREATE TABLE scrapbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  cover_emoji TEXT DEFAULT '📒' NOT NULL,
  description TEXT,
  is_finished BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE scrapbook_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrapbook_id UUID REFERENCES scrapbooks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(scrapbook_id, user_id)
);

CREATE TABLE scrapbook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrapbook_id UUID REFERENCES scrapbooks(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  layout TEXT CHECK (layout IN ('single', 'grid', 'collage')) DEFAULT 'collage' NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(scrapbook_id, page_number)
);

CREATE TABLE scrapbook_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES scrapbook_pages(id) ON DELETE CASCADE NOT NULL,
  scrapbook_id UUID REFERENCES scrapbooks(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  note TEXT,
  pos_x REAL DEFAULT 0 NOT NULL,
  pos_y REAL DEFAULT 0 NOT NULL,
  rotation REAL DEFAULT 0 NOT NULL,
  scale REAL DEFAULT 1 NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE scrapbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapbook_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapbook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapbook_items ENABLE ROW LEVEL SECURITY;

-- Scrapbooks: members can read
CREATE POLICY "scrapbooks_select" ON scrapbooks
  FOR SELECT USING (
    id IN (SELECT scrapbook_id FROM scrapbook_members WHERE user_id = auth.uid())
  );
CREATE POLICY "scrapbooks_insert" ON scrapbooks
  FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "scrapbooks_update" ON scrapbooks
  FOR UPDATE USING (creator_id = auth.uid());

-- Members
CREATE POLICY "scrapbook_members_select" ON scrapbook_members
  FOR SELECT USING (
    scrapbook_id IN (SELECT scrapbook_id FROM scrapbook_members WHERE user_id = auth.uid())
  );
CREATE POLICY "scrapbook_members_insert" ON scrapbook_members
  FOR INSERT WITH CHECK (
    scrapbook_id IN (SELECT id FROM scrapbooks WHERE creator_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Pages: members read, creator writes
CREATE POLICY "scrapbook_pages_select" ON scrapbook_pages
  FOR SELECT USING (
    scrapbook_id IN (SELECT scrapbook_id FROM scrapbook_members WHERE user_id = auth.uid())
  );
CREATE POLICY "scrapbook_pages_insert" ON scrapbook_pages
  FOR INSERT WITH CHECK (
    scrapbook_id IN (SELECT scrapbook_id FROM scrapbook_members WHERE user_id = auth.uid())
  );

-- Items: members read + insert own
CREATE POLICY "scrapbook_items_select" ON scrapbook_items
  FOR SELECT USING (
    scrapbook_id IN (SELECT scrapbook_id FROM scrapbook_members WHERE user_id = auth.uid())
  );
CREATE POLICY "scrapbook_items_insert" ON scrapbook_items
  FOR INSERT WITH CHECK (
    creator_id = auth.uid()
    AND scrapbook_id IN (SELECT scrapbook_id FROM scrapbook_members WHERE user_id = auth.uid())
  );
CREATE POLICY "scrapbook_items_delete" ON scrapbook_items
  FOR DELETE USING (creator_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE scrapbook_items;
ALTER PUBLICATION supabase_realtime ADD TABLE scrapbook_pages;
