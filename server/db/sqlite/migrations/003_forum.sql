-- Forum threads, answers, and feature requests.
-- Before this migration, forum state lived only in the browser's localStorage
-- (zustand `devdock-forum`). Moving it server-side lets users share posts,
-- and later (Phase 3b) lets semantic search index forum content.

CREATE TABLE IF NOT EXISTS forum_threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar_url TEXT,
  votes TEXT DEFAULT '[]',
  view_count INTEGER DEFAULT 0,
  accepted_answer_id TEXT,
  repo_id TEXT,
  repo_name TEXT,
  repo_source TEXT CHECK(repo_source IS NULL OR repo_source IN ('github', 'ado')),
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
  votes TEXT DEFAULT '[]',
  is_accepted INTEGER DEFAULT 0,
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
    CHECK(status IN ('open', 'planned', 'in-progress', 'completed', 'declined')),
  votes TEXT DEFAULT '[]',
  attachments TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created ON feature_requests(created_at);
