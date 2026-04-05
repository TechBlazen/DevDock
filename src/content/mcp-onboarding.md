# MCP Server Onboarding Guide

This guide covers how to register, configure, and manage Model Context Protocol (MCP) servers in DevDock.

---

## What Are MCP Servers?

MCP (Model Context Protocol) servers provide tools and capabilities to AI models. Each server exposes a set of functions (tools) that the AI chat can invoke — such as reading files, querying databases, calling APIs, or running code.

DevDock manages the lifecycle of MCP servers: registering, starting, stopping, and monitoring them.

---

## Supported Transports

| Transport | Description | Use Case |
|-----------|-------------|----------|
| **stdio** | Communicates via stdin/stdout of a child process | Local development, CLI tools |
| **SSE** | Server-Sent Events over HTTP | Remote servers, web-based tools |
| **WebSocket** | Full-duplex WebSocket connection | Real-time, bidirectional communication |

---

## Registering a New MCP Server

### Step 1: Click "Register MCP Server"

On the MCP Server Registry page, click the **+ Register MCP Server** button at the bottom of the server list.

### Step 2: Fill in Server Details

| Field | Description | Example |
|-------|-------------|---------|
| **Server Name** | Unique identifier for the server | `filesystem`, `github`, `postgres` |
| **Description** | What the server does | `Local file system access` |
| **Port** | Port number the server listens on | `3001` |
| **Transport** | Communication protocol | `stdio`, `sse`, or `websocket` |

### Step 3: Start the Server

After registering, click the **Play** button to start the server. The status indicator will change to green ("running").

---

## Installing Official MCP Servers

The Model Context Protocol project provides several official servers. Install them via npm:

### Filesystem Server

```bash
npx -y @modelcontextprotocol/server-filesystem /path/to/allowed/directory
```

Provides: `read`, `write`, `list` capabilities for local files.

### GitHub Server

```bash
npx -y @modelcontextprotocol/server-github
```

Requires: `GITHUB_TOKEN` environment variable.
Provides: `repos`, `issues`, `prs` capabilities.

### PostgreSQL Server

```bash
npx -y @modelcontextprotocol/server-postgres postgresql://user:pass@localhost:5432/mydb
```

Provides: `query`, `schema` capabilities for database access.

### Memory Server

```bash
npx -y @modelcontextprotocol/server-memory
```

Provides: `remember`, `recall` capabilities for persistent memory.

### Fetch Server

```bash
npx -y @modelcontextprotocol/server-fetch
```

Provides: `get`, `post` capabilities for HTTP requests.

### Sequential Thinking Server

```bash
npx -y @modelcontextprotocol/server-sequential-thinking
```

Provides: `think`, `plan` capabilities for chain-of-thought reasoning.

---

## Configuration in DevDock

When registering a server in DevDock, the configuration maps to how the server process is launched:

```json
{
  "name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
  "transport": "stdio",
  "port": 3001,
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Environment Variables

Some servers require environment variables for authentication:

| Server | Variable | Purpose |
|--------|----------|---------|
| GitHub | `GITHUB_TOKEN` | GitHub personal access token |
| PostgreSQL | `DATABASE_URL` | Connection string |
| Fetch | `ALLOWED_ORIGINS` | Restrict which URLs can be fetched |

Set these in your shell environment or in the server's `env` configuration.

---

## Server Lifecycle

### States

| Status | Icon | Description |
|--------|------|-------------|
| **Running** | Green | Server is active and accepting tool calls |
| **Idle** | Yellow | Server is registered but not actively processing |
| **Stopped** | Gray | Server is not running |
| **Error** | Red | Server encountered a fatal error |

### Starting & Stopping

- Click the **Play** button to start a stopped server
- Click the **Stop** button to gracefully shut down a running server
- Use the **Logs** button to view server output and debug issues

### Removing a Server

Click the **Remove** button in the expanded server card to unregister a server. This does not uninstall the underlying npm package.

---

## Monitoring

Each server card displays:

- **Call Count** — total number of tool invocations since registration
- **Port** — the port the server is listening on
- **Transport** — the communication protocol in use
- **Capabilities** — the list of tools the server exposes

All MCP server tool calls are traced via OpenTelemetry when tracing is enabled. View traces on the Observability page filtered by the `mcp-gateway` service.

---

## Building a Custom MCP Server

You can build your own MCP server using the official SDK:

```bash
npm install @modelcontextprotocol/sdk
```

### Minimal Example (TypeScript)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'my-custom-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Register a tool
server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'hello',
    description: 'Says hello',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name to greet' },
      },
      required: ['name'],
    },
  }],
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'hello') {
    const name = request.params.arguments?.name ?? 'World';
    return { content: [{ type: 'text', text: `Hello, ${name}!` }] };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
```

Register this server in DevDock with transport `stdio` and command `npx tsx my-server.ts`.

---

## Troubleshooting

**Server won't start:**
1. Check that the npm package is installed globally or accessible via `npx`
2. Verify the port isn't already in use: `lsof -i :<port>`
3. Check the Logs output for error messages

**Tool calls failing:**
1. Ensure the server is in "running" status
2. Check that the AI chat is configured to use the correct provider
3. Verify environment variables are set (e.g., `GITHUB_TOKEN`)

**Server shows "error" status:**
1. The underlying process may have crashed — check Logs
2. Try stopping and restarting the server
3. Ensure all required dependencies are installed

**CORS errors (SSE/WebSocket transports):**
If using a remote MCP server, ensure it sends proper CORS headers for the DevDock origin.
