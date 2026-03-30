# ⚡ Forge Portal

> An AI-powered developer portal — like Backstage.io but built around MCP servers, multi-provider AI, and OpenTelemetry.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite)
![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-enabled-F5A800?style=flat)

## Features

| Feature | Description |
|---|---|
| 🗂 **Repo Browser** | Browse GitHub & Azure DevOps repos, open in browser, VS Code, or github.dev |
| 🤖 **Forge AI Chat** | Multi-provider AI (Claude, GPT-4o, Gemini, Ollama) with MCP context |
| ⚙️ **MCP Registry** | Register, start/stop, and inspect Model Context Protocol servers |
| 📊 **OpenTelemetry** | Live traces, metrics, and spans via OTLP — auto-instruments AI calls |
| 🧩 **Drag-Drop Dashboard** | Fully customizable widget grid — add, remove, and reorder |
| 🔐 **Settings** | Per-provider API keys, OTel config, GitHub + ADO tokens |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional — can also use the Settings UI)
cp .env.example .env
# edit .env with your API keys

# 3. Start dev server
npm run dev
# → http://localhost:5173
```

## Project Structure

```
src/
├── App.tsx                   # Router + OTel bootstrap
├── main.tsx                  # Entry point
├── index.css                 # Tailwind v4 + global styles
│
├── types/                    # Shared TypeScript types
├── store/                    # Zustand stores (settings, MCP, chat, repos, telemetry)
├── otel/                     # OpenTelemetry SDK setup + span helpers
├── lib/
│   ├── ai.ts                 # Anthropic / OpenAI / Gemini / Ollama clients
│   └── repos.ts              # GitHub + Azure DevOps API + VS Code deep-link helpers
│
├── components/
│   ├── ui/                   # Shared primitives (Button, Card, Badge, Input, Toggle…)
│   ├── layout/               # Shell, Sidebar, Topbar
│   ├── repos/                # RepoCard, RepoList
│   ├── mcp/                  # MCPRegistry, ServerCard
│   ├── chat/                 # ChatPanel (multi-provider, markdown render, OTel tracing)
│   ├── telemetry/            # MetricsBar, TraceList
│   └── dashboard/            # DashboardGrid (drag-drop), QuickActions, Activity, AIMetrics
│
└── pages/                    # Route-level page components
```

## MCP Server Setup

Forge Portal connects to MCP servers over stdio, SSE, or WebSocket.

```bash
# Example: run the filesystem MCP server
npx @modelcontextprotocol/server-filesystem /path/to/allowed/dir

# Example: GitHub MCP server
npx @modelcontextprotocol/server-github

# Example: local Ollama for the local AI provider
ollama serve
ollama pull llama3.2
```

Then register them in the **MCP Servers** page of the portal.

## OpenTelemetry

Forge Portal auto-instruments:
- All AI API calls (provider, model, token count, latency)
- Repo API fetches (GitHub, ADO)
- Chat interactions

To collect traces locally:

```bash
# Docker: run Jaeger all-in-one (OTLP on port 4318 HTTP)
docker run -d --name jaeger \
  -p 4318:4318 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest

# Or use the OpenTelemetry Collector
```

Then set `VITE_OTEL_ENDPOINT=http://localhost:4318` in your `.env`.

## VS Code Deep Links

Click **Open in VS Code** on any repo card to clone and open it directly:

```
vscode://vscode.git/clone?url=<repo-clone-url>
```

For browser-based editing, **Edit in Browser** opens `github.dev` for GitHub repos.

## Tech Stack

- **Vite 8** + **React 19** + **TypeScript**
- **Zustand** — state management (persisted to localStorage)
- **React Router v7** — client-side routing
- **OpenTelemetry Web SDK** — traces + metrics
- **Lucide React** — icons
- **Tailwind CSS v4** — utility styling
- **date-fns** — date formatting
- **Axios** — HTTP clients (GitHub, ADO APIs)

## Development

```bash
npm run dev      # Start dev server (HMR)
npm run build    # Production build
npm run preview  # Preview production build
```

---

Built with ⚡ by Terry Ashley · TechBlazen
