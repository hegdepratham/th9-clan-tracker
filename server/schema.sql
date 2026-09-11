-- Session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL COLLATE "default",
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL,
  PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Clans table
CREATE TABLE IF NOT EXISTS clans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tag VARCHAR(20) DEFAULT '',
  notes TEXT DEFAULT '',
  visited BOOLEAN DEFAULT FALSE,
  last_visited TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index on non-empty tags to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_clans_tag_unique 
  ON clans (LOWER(tag)) 
  WHERE tag IS NOT NULL AND tag != '';

-- Visit history table
CREATE TABLE IF NOT EXISTS visit_history (
  id SERIAL PRIMARY KEY,
  clan_id INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_history_clan_id ON visit_history(clan_id);
