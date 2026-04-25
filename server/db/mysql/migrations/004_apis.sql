-- API specs (MySQL 8.0+).
-- Mirrors sqlite/migrations/004_apis.sql. spec_raw uses LONGTEXT to fit
-- large OpenAPI specs (some have hundreds of operations + huge $defs).

CREATE TABLE IF NOT EXISTS apis (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  source_repo_id VARCHAR(64),
  source_repo_name VARCHAR(512),
  source_url TEXT NOT NULL,
  spec_kind VARCHAR(16) NOT NULL,
  spec_version VARCHAR(32),
  spec_raw LONGTEXT NOT NULL,
  base_url TEXT,
  added_by VARCHAR(64),
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  CONSTRAINT chk_apis_spec_kind CHECK (spec_kind IN ('swagger', 'openapi'))
);

CREATE INDEX idx_apis_source_repo ON apis(source_repo_id);
CREATE INDEX idx_apis_added_by ON apis(added_by);
