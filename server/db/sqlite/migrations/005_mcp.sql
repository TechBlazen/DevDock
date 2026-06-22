-- MCP servers + discovered tools (the "MCP Register").
-- Modelled on Microsoft's mcp-gateway: an mcp_servers row is an "adapter"
-- (a registered MCP server) and mcp_tools holds the tools discovered from it
-- via the JSON-RPC `tools/list` handshake — the data the Tool Gateway Router
-- dispatches against. Runtime status is owned by the in-process McpManager;
-- the `status`/`last_error` columns hold the last-known value so the UI has
-- something to show before the manager reconciles on boot.
--
-- JSON-bearing columns (args, env, capabilities, input_schema) stay TEXT here
-- and are stored as JSON strings — the same shape the route layer expects.

CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  transport TEXT NOT NULL DEFAULT 'stdio' CHECK(transport IN ('stdio', 'sse', 'websocket')),
  command TEXT,                -- stdio: executable (e.g. 'npx')
  args TEXT,                   -- stdio: JSON array<string> of arguments
  env TEXT,                    -- JSON object<string,string> of env vars
  url TEXT,                    -- sse/websocket: endpoint URL
  port INTEGER,                -- informational/display
  status TEXT NOT NULL DEFAULT 'stopped' CHECK(status IN ('running', 'idle', 'stopped', 'error')),
  auto_start INTEGER NOT NULL DEFAULT 0,
  session_strategy TEXT NOT NULL DEFAULT 'sticky' CHECK(session_strategy IN ('sticky', 'stateless')),
  call_count INTEGER NOT NULL DEFAULT 0,
  capabilities TEXT,           -- JSON array<string>
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
  input_schema TEXT,           -- JSON schema object
  call_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_servers_added_by ON mcp_servers(added_by);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_server ON mcp_tools(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_name ON mcp_tools(name);
