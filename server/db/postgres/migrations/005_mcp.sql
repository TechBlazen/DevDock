-- MCP servers + discovered tools (PostgreSQL).
-- Mirrors sqlite/migrations/005_mcp.sql. JSON-bearing columns use JSONB and
-- auto_start uses BOOLEAN; the client.ts mapRow/coerce helpers translate to the
-- SQLite-shaped row (JSON strings + 0/1) the route layer expects. Keep the
-- JSON_COLUMNS / BOOLEAN_COLUMNS lists in sql.ts in lockstep with this file.

CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  transport TEXT NOT NULL DEFAULT 'stdio' CHECK (transport IN ('stdio', 'sse', 'websocket')),
  command TEXT,
  args JSONB,
  env JSONB,
  url TEXT,
  port INTEGER,
  status TEXT NOT NULL DEFAULT 'stopped' CHECK (status IN ('running', 'idle', 'stopped', 'error')),
  auto_start BOOLEAN NOT NULL DEFAULT false,
  session_strategy TEXT NOT NULL DEFAULT 'sticky' CHECK (session_strategy IN ('sticky', 'stateless')),
  call_count INTEGER NOT NULL DEFAULT 0,
  capabilities JSONB,
  last_used TEXT,
  last_error TEXT,
  added_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mcp_tools (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  input_schema JSONB,
  call_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_servers_added_by ON mcp_servers(added_by);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_server ON mcp_tools(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_name ON mcp_tools(name);
