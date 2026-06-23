-- Agent & Skill Registry (the Gallery's server-backed catalog). One unified
-- table for both agents and skills (kind column); content is raw SKILL.md.
-- source/verified/visibility are hybrid-ready governance fields. votes reuses
-- the forum ForumVote[] JSON shape.

CREATE TABLE IF NOT EXISTS registry_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('agent', 'skill')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'community'
    CHECK(source IN ('official', 'org', 'community')),
  verified INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'org'
    CHECK(visibility IN ('org', 'public', 'private')),
  category TEXT,
  tags TEXT DEFAULT '[]',
  capabilities TEXT DEFAULT '[]',
  compatibility TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'pending', 'approved', 'rejected')),
  votes TEXT DEFAULT '[]',
  install_count INTEGER NOT NULL DEFAULT 0,
  latest_version TEXT,
  reviewed_by TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registry_items_kind ON registry_items(kind);
CREATE INDEX IF NOT EXISTS idx_registry_items_status ON registry_items(status);
CREATE INDEX IF NOT EXISTS idx_registry_items_author ON registry_items(author_id);

CREATE TABLE IF NOT EXISTS registry_versions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  version TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  changelog TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES registry_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_registry_versions_item ON registry_versions(item_id);

CREATE TABLE IF NOT EXISTS registry_installs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  installed_at TEXT NOT NULL,
  last_used TEXT,
  use_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(item_id, user_id),
  FOREIGN KEY (item_id) REFERENCES registry_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_registry_installs_user ON registry_installs(user_id);
