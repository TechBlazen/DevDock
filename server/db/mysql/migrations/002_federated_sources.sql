-- Federated search sources (MySQL 8.0+)
-- Mirrors server/db/sqlite/migrations/002_federated_sources.sql.

CREATE TABLE IF NOT EXISTS federated_sources (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL,
  endpoint_url TEXT NOT NULL,
  auth_type VARCHAR(32) NOT NULL DEFAULT 'none',
  auth_config JSON NOT NULL,
  result_mapping JSON NOT NULL,
  trigger_config JSON NOT NULL,
  sync_interval_minutes INT DEFAULT 0,
  last_synced_at VARCHAR(64),
  document_count INT DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(64) NOT NULL,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  CONSTRAINT chk_federated_source_type CHECK (type IN ('rest-api', 'mcp-tool', 'opensearch')),
  CONSTRAINT chk_federated_source_auth CHECK (auth_type IN ('none', 'api-key', 'bearer', 'basic')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_federated_sources_enabled ON federated_sources(enabled);

CREATE TABLE IF NOT EXISTS federated_documents (
  id VARCHAR(64) PRIMARY KEY,
  source_id VARCHAR(64) NOT NULL,
  title VARCHAR(512) NOT NULL,
  description TEXT,
  url TEXT,
  icon TEXT,
  tags TEXT,
  content LONGTEXT,
  extra TEXT,
  meta JSON,
  fetched_at VARCHAR(64) NOT NULL,
  FOREIGN KEY (source_id) REFERENCES federated_sources(id) ON DELETE CASCADE
);

CREATE INDEX idx_federated_docs_source ON federated_documents(source_id);
