-- DevDock initial schema (MySQL 8.0+)
-- Mirrors server/db/sqlite/migrations/001_initial.sql with MySQL-native types:
--   • TINYINT(1) for flags (mysql2 round-trips as 0/1 — no coercion needed)
--   • JSON columns (mysql2 returns parsed objects → mapRow stringifies on read)
--   • INT AUTO_INCREMENT for the migration ledger
--   • Domain timestamps stay TEXT to match SQLite/PG behavior

CREATE TABLE IF NOT EXISTS _migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(32) NOT NULL DEFAULT 'viewer',
  permissions JSON NOT NULL,
  dashboard_widgets JSON,
  favorite_repos JSON,
  preferences JSON,
  created_at VARCHAR(64) NOT NULL,
  last_login VARCHAR(64)
);

-- collections is referenced by bookmarks.collection_id, so create it first.
CREATE TABLE IF NOT EXISTS collections (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(64),
  color VARCHAR(32),
  parent_id VARCHAR(64),
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE,
  ai_config JSON NOT NULL,
  otel_config JSON NOT NULL,
  github_config JSON NOT NULL,
  ado_config JSON NOT NULL,
  theme VARCHAR(32) NOT NULL DEFAULT 'dark',
  dashboard_widgets JSON NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS repos (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(512) NOT NULL,
  description TEXT,
  source VARCHAR(16) NOT NULL,
  language VARCHAR(64) DEFAULT 'Unknown',
  default_branch VARCHAR(255) DEFAULT 'main',
  stars INT DEFAULT 0,
  forks INT DEFAULT 0,
  is_private TINYINT(1) DEFAULT 0,
  updated_at VARCHAR(64),
  clone_url TEXT NOT NULL,
  web_url TEXT NOT NULL,
  topics JSON,
  environments JSON,
  cloud_platform VARCHAR(32),
  owners JSON,
  custom_tags JSON,
  added_by VARCHAR(64),
  CONSTRAINT chk_repos_source CHECK (source IN ('github', 'ado'))
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  title VARCHAR(512) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  favicon TEXT,
  screenshot TEXT,
  collection_id VARCHAR(64),
  tags JSON,
  favorite TINYINT(1) DEFAULT 0,
  note TEXT,
  content_type VARCHAR(32) DEFAULT 'link',
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS docs (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(512) NOT NULL,
  content LONGTEXT NOT NULL,
  source_url TEXT,
  tags JSON,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS plugins_state (
  id VARCHAR(64) PRIMARY KEY,
  enabled_plugins JSON NOT NULL,
  plugin_settings JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_page_views (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  path VARCHAR(512) NOT NULL,
  timestamp VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_errors (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  path VARCHAR(512) NOT NULL,
  timestamp VARCHAR(64) NOT NULL
);

-- Indexes (CREATE INDEX IF NOT EXISTS isn't supported in MySQL; use a stored
-- procedure-style guard or just rely on the IF NOT EXISTS on the tables —
-- the migration ledger ensures we run this file at most once.)
CREATE INDEX idx_repos_source ON repos(source);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_collection ON bookmarks(collection_id);
CREATE INDEX idx_analytics_pv_ts ON analytics_page_views(timestamp);
CREATE INDEX idx_analytics_err_ts ON analytics_errors(timestamp);
