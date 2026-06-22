-- MCP servers + discovered tools (MySQL 8.0+).
-- Mirrors sqlite/migrations/005_mcp.sql. JSON columns use the native JSON type
-- (mysql2 returns parsed objects → mapRow stringifies on read); flags use
-- TINYINT(1) which round-trips as 0/1. Keep the JSON_COLUMNS list in sql.ts in
-- lockstep with the JSON columns below.

CREATE TABLE IF NOT EXISTS mcp_servers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  transport VARCHAR(16) NOT NULL DEFAULT 'stdio',
  command VARCHAR(512),
  args JSON,
  env JSON,
  url TEXT,
  port INT,
  status VARCHAR(16) NOT NULL DEFAULT 'stopped',
  auto_start TINYINT(1) NOT NULL DEFAULT 0,
  session_strategy VARCHAR(16) NOT NULL DEFAULT 'sticky',
  call_count INT NOT NULL DEFAULT 0,
  capabilities JSON,
  last_used VARCHAR(64),
  last_error TEXT,
  added_by VARCHAR(64),
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  CONSTRAINT chk_mcp_transport CHECK (transport IN ('stdio', 'sse', 'websocket')),
  CONSTRAINT chk_mcp_status CHECK (status IN ('running', 'idle', 'stopped', 'error')),
  CONSTRAINT chk_mcp_session CHECK (session_strategy IN ('sticky', 'stateless'))
);

CREATE TABLE IF NOT EXISTS mcp_tools (
  id VARCHAR(64) PRIMARY KEY,
  server_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  input_schema JSON,
  call_count INT NOT NULL DEFAULT 0,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL
);

CREATE INDEX idx_mcp_servers_added_by ON mcp_servers(added_by);
CREATE INDEX idx_mcp_tools_server ON mcp_tools(server_id);
CREATE INDEX idx_mcp_tools_name ON mcp_tools(name);
