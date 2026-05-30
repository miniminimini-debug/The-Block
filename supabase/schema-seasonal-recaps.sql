-- Seasonal Memory Drops: auto-generated collage recaps

CREATE TABLE seasonal_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  season TEXT CHECK (season IN ('spring', 'summer', 'fall', 'winter')) NOT NULL,
  year INTEGER NOT NULL,
  label TEXT NOT NULL,         -- e.g. "Summer 2025"
  photo_urls JSONB DEFAULT '[]'::jsonb NOT NULL,
  participant_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
  is_opened BOOLEAN DEFAULT FALSE NOT NULL,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, season, year)
);

-- RLS
ALTER TABLE seasonal_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seasonal_recaps_select" ON seasonal_recaps
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "seasonal_recaps_update" ON seasonal_recaps
  FOR UPDATE USING (user_id = auth.uid());

-- Service role inserts (edge function)
CREATE POLICY "seasonal_recaps_service_insert" ON seasonal_recaps
  FOR INSERT WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE seasonal_recaps;
