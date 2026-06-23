-- Agent & Skill Registry (the Gallery's server-backed catalog, MySQL 8.0+).
-- Mirrors sqlite/migrations/007_registry.sql with MySQL-native types: JSON for
-- tags/capabilities/votes (mysql2 returns parsed objects — mapRow stringifies
-- on read for parity), TINYINT(1) for verified. Keep the JSON_COLUMNS list in
-- sql.ts in lockstep with this file.

CREATE TABLE IF NOT EXISTS registry_items (
  id VARCHAR(64) PRIMARY KEY,
  kind VARCHAR(16) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description LONGTEXT NOT NULL,
  content LONGTEXT NOT NULL,
  author_id VARCHAR(64) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  source VARCHAR(16) NOT NULL DEFAULT 'community',
  verified TINYINT(1) NOT NULL DEFAULT 0,
  visibility VARCHAR(16) NOT NULL DEFAULT 'org',
  category VARCHAR(128),
  tags JSON,
  capabilities JSON,
  compatibility TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  votes JSON,
  install_count INT NOT NULL DEFAULT 0,
  latest_version VARCHAR(64),
  reviewed_by VARCHAR(64),
  rejection_reason TEXT,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  CONSTRAINT chk_registry_kind CHECK (kind IN ('agent', 'skill')),
  CONSTRAINT chk_registry_source CHECK (source IN ('official', 'org', 'community')),
  CONSTRAINT chk_registry_visibility CHECK (visibility IN ('org', 'public', 'private')),
  CONSTRAINT chk_registry_status CHECK (status IN ('draft', 'pending', 'approved', 'rejected'))
);

CREATE INDEX idx_registry_items_kind ON registry_items(kind);
CREATE INDEX idx_registry_items_status ON registry_items(status);
CREATE INDEX idx_registry_items_author ON registry_items(author_id);

CREATE TABLE IF NOT EXISTS registry_versions (
  id VARCHAR(64) PRIMARY KEY,
  item_id VARCHAR(64) NOT NULL,
  version VARCHAR(64) NOT NULL,
  content LONGTEXT NOT NULL,
  changelog TEXT,
  created_at VARCHAR(64) NOT NULL,
  FOREIGN KEY (item_id) REFERENCES registry_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_registry_versions_item ON registry_versions(item_id);

CREATE TABLE IF NOT EXISTS registry_installs (
  id VARCHAR(64) PRIMARY KEY,
  item_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  installed_at VARCHAR(64) NOT NULL,
  last_used VARCHAR(64),
  use_count INT NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_registry_install (item_id, user_id),
  FOREIGN KEY (item_id) REFERENCES registry_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_registry_installs_user ON registry_installs(user_id);
