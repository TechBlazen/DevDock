-- MCP server discussions. Mirrors the repo-comment linkage: a forum thread can
-- be tied to an MCP server so the "Comments" section on a server card and the
-- Community Forum share the same Q&A. repo_* and mcp_server_* are mutually
-- exclusive in practice (a thread links to at most one entity).

ALTER TABLE forum_threads ADD COLUMN mcp_server_id VARCHAR(255);
ALTER TABLE forum_threads ADD COLUMN mcp_server_name VARCHAR(255);

CREATE INDEX idx_forum_threads_mcp ON forum_threads(mcp_server_id);
