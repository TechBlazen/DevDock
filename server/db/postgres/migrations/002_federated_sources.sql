-- Federated search sources (PostgreSQL)
-- Mirrors server/db/sqlite/migrations/002_federated_sources.sql.

CREATE TABLE IF NOT EXISTS federated_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rest-api', 'mcp-tool', 'opensearch')),
  endpoint_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'api-key', 'bearer', 'basic')),
  auth_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sync_interval_minutes INTEGER DEFAULT 0,
  last_synced_at TEXT,
  document_count INTEGER DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_federated_sources_enabled ON federated_sources(enabled);

CREATE TABLE IF NOT EXISTS federated_documents (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  url TEXT DEFAULT '',
  icon TEXT,
  tags TEXT DEFAULT '',
  content TEXT DEFAULT '',
  extra TEXT DEFAULT '',
  meta JSONB DEFAULT '{}'::jsonb,
  fetched_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES federated_sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_federated_docs_source ON federated_documents(source_id);
