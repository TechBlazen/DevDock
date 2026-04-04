-- Federated search sources (admin-managed external content connectors)
CREATE TABLE IF NOT EXISTS federated_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('rest-api', 'mcp-tool', 'opensearch')),
  endpoint_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'none' CHECK(auth_type IN ('none', 'api-key', 'bearer', 'basic')),
  auth_config TEXT NOT NULL DEFAULT '{}',
  result_mapping TEXT NOT NULL DEFAULT '{}',
  trigger_config TEXT NOT NULL DEFAULT '{}',
  sync_interval_minutes INTEGER DEFAULT 0,
  last_synced_at TEXT,
  document_count INTEGER DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_federated_sources_enabled ON federated_sources(enabled);

-- Cached documents from federated sources
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
  meta TEXT DEFAULT '{}',
  fetched_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES federated_sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_federated_docs_source ON federated_documents(source_id);
