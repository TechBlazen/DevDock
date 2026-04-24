-- DevDock initial schema (PostgreSQL)
-- Mirrors server/db/sqlite/migrations/001_initial.sql with PG-native types:
--   • BOOLEAN instead of INTEGER for is_private, favorite, enabled (mapped to 0/1 in code)
--   • JSONB instead of TEXT for JSON columns (the client.ts mapRow helper stringifies on read)
--   • SERIAL instead of AUTOINCREMENT
--   • TIMESTAMPTZ for the migration ledger; domain timestamps stay TEXT to match SQLite

CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  dashboard_widgets JSONB,
  favorite_repos JSONB,
  preferences JSONB,
  created_at TEXT NOT NULL,
  last_login TEXT
);

-- collections is referenced by bookmarks.collection_id, so create it first.
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  parent_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  ai_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  otel_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  github_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ado_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  theme TEXT NOT NULL DEFAULT 'dark',
  dashboard_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS repos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  source TEXT NOT NULL CHECK (source IN ('github', 'ado')),
  language TEXT DEFAULT 'Unknown',
  default_branch TEXT DEFAULT 'main',
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  updated_at TEXT,
  clone_url TEXT NOT NULL,
  web_url TEXT NOT NULL,
  topics JSONB DEFAULT '[]'::jsonb,
  environments JSONB DEFAULT '[]'::jsonb,
  cloud_platform TEXT,
  owners JSONB DEFAULT '[]'::jsonb,
  custom_tags JSONB DEFAULT '[]'::jsonb,
  added_by TEXT
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  favicon TEXT,
  screenshot TEXT,
  collection_id TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  favorite BOOLEAN DEFAULT false,
  note TEXT,
  content_type TEXT DEFAULT 'link',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS docs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  source_url TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugins_state (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  enabled_plugins JSONB NOT NULL DEFAULT '{}'::jsonb,
  plugin_settings JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS analytics_page_views (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  path TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_errors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  path TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_repos_source ON repos(source);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_collection ON bookmarks(collection_id);
CREATE INDEX IF NOT EXISTS idx_analytics_pv_ts ON analytics_page_views(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_err_ts ON analytics_errors(timestamp);
