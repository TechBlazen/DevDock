-- Forum threads, answers, and feature requests (MySQL 8.0+).
-- Mirrors sqlite/migrations/003_forum.sql with MySQL-native types:
--   • JSON for tags / votes / attachments (mysql2 returns parsed objects —
--     mapRow stringifies on read for parity with SQLite)
--   • TINYINT(1) for is_accepted (round-trips as 0/1 natively)

CREATE TABLE IF NOT EXISTS forum_threads (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(512) NOT NULL,
  body LONGTEXT NOT NULL,
  category VARCHAR(32) NOT NULL,
  tags JSON,
  author_id VARCHAR(64) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_avatar_url TEXT,
  votes JSON,
  view_count INT DEFAULT 0,
  accepted_answer_id VARCHAR(64),
  repo_id VARCHAR(64),
  repo_name VARCHAR(512),
  repo_source VARCHAR(16),
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  CONSTRAINT chk_forum_threads_repo_source
    CHECK (repo_source IS NULL OR repo_source IN ('github', 'ado'))
);

CREATE INDEX idx_forum_threads_created ON forum_threads(created_at);
CREATE INDEX idx_forum_threads_author ON forum_threads(author_id);
CREATE INDEX idx_forum_threads_repo ON forum_threads(repo_id);

CREATE TABLE IF NOT EXISTS forum_answers (
  id VARCHAR(64) PRIMARY KEY,
  thread_id VARCHAR(64) NOT NULL,
  parent_answer_id VARCHAR(64),
  author_id VARCHAR(64) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_avatar_url TEXT,
  body LONGTEXT NOT NULL,
  votes JSON,
  is_accepted TINYINT(1) DEFAULT 0,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE
);

CREATE INDEX idx_forum_answers_thread ON forum_answers(thread_id);
CREATE INDEX idx_forum_answers_author ON forum_answers(author_id);

CREATE TABLE IF NOT EXISTS feature_requests (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(512) NOT NULL,
  description LONGTEXT NOT NULL,
  author_id VARCHAR(64) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_avatar_url TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  votes JSON,
  attachments JSON,
  tags JSON,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  CONSTRAINT chk_feature_requests_status
    CHECK (status IN ('open', 'planned', 'in-progress', 'completed', 'declined'))
);

CREATE INDEX idx_feature_requests_status ON feature_requests(status);
CREATE INDEX idx_feature_requests_created ON feature_requests(created_at);
