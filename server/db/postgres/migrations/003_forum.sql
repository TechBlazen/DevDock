-- Forum threads, answers, and feature requests (PostgreSQL).
-- Mirrors sqlite/migrations/003_forum.sql with PG-native types:
--   • JSONB for tags / votes / attachments
--   • BOOLEAN for is_accepted (coerced to 0/1 in mapRow)

CREATE TABLE IF NOT EXISTS forum_threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar_url TEXT,
  votes JSONB DEFAULT '[]'::jsonb,
  view_count INTEGER DEFAULT 0,
  accepted_answer_id TEXT,
  repo_id TEXT,
  repo_name TEXT,
  repo_source TEXT CHECK (repo_source IS NULL OR repo_source IN ('github', 'ado')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_forum_threads_created ON forum_threads(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author ON forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_repo ON forum_threads(repo_id);

CREATE TABLE IF NOT EXISTS forum_answers (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  parent_answer_id TEXT,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar_url TEXT,
  body TEXT NOT NULL,
  votes JSONB DEFAULT '[]'::jsonb,
  is_accepted BOOLEAN DEFAULT false,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_forum_answers_thread ON forum_answers(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_answers_author ON forum_answers(author_id);

CREATE TABLE IF NOT EXISTS feature_requests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'planned', 'in-progress', 'completed', 'declined')),
  votes JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created ON feature_requests(created_at);
