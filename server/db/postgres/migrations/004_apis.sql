-- API specs (PostgreSQL).
-- Mirrors sqlite/migrations/004_apis.sql. spec_raw stays TEXT (not JSONB)
-- because the original may be YAML, not JSON.

CREATE TABLE IF NOT EXISTS apis (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  source_repo_id TEXT,
  source_repo_name TEXT,
  source_url TEXT NOT NULL,
  spec_kind TEXT NOT NULL CHECK (spec_kind IN ('swagger', 'openapi')),
  spec_version TEXT,
  spec_raw TEXT NOT NULL,
  base_url TEXT,
  added_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apis_source_repo ON apis(source_repo_id);
CREATE INDEX IF NOT EXISTS idx_apis_added_by ON apis(added_by);
