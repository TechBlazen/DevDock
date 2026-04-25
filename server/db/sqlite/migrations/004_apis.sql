-- API specs (Swagger 2 / OpenAPI 3.x).
-- Specs are stored verbatim in spec_raw (the original YAML/JSON text the
-- user pointed us at). Parsing happens in the client — server treats it
-- as opaque text. source_repo_id is a soft FK to repos(id) — we don't add
-- a hard FK because users can register an API by URL without ever having
-- registered the underlying repo.

CREATE TABLE IF NOT EXISTS apis (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  source_repo_id TEXT,
  source_repo_name TEXT,
  source_url TEXT NOT NULL,
  spec_kind TEXT NOT NULL CHECK(spec_kind IN ('swagger', 'openapi')),
  spec_version TEXT,
  spec_raw TEXT NOT NULL,
  base_url TEXT,
  added_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apis_source_repo ON apis(source_repo_id);
CREATE INDEX IF NOT EXISTS idx_apis_added_by ON apis(added_by);
