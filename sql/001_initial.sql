CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  license TEXT NOT NULL,
  manifest JSONB NOT NULL,
  assets JSONB NOT NULL,
  downloads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS themes_created_at_idx ON themes (created_at DESC);
CREATE INDEX IF NOT EXISTS themes_downloads_idx ON themes (downloads DESC);
