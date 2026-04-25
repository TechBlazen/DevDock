# Forge Portal

> An AI-powered developer portal — like Backstage.io but built around MCP servers, multi-provider AI chat, and OpenTelemetry observability.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=flat&logo=fastify)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite)
![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-enabled-F5A800?style=flat)

---

## Features

### Repository Management
- **GitHub & Azure DevOps** repo browsing with metadata, environments, cloud platform, owners, and custom tags
- **On-premises ADO Server / TFS** support with custom server URLs and collections
- **Inline PAT authentication** — enter credentials directly in the registration flow
- **Repo detail panel** — view commits, merges (PRs), and builds with status indicators
- **Refresh button** — re-fetch repo details (description, language, last updated) from the API
- **Import Docs** — auto-discover and import markdown files recursively from the entire repo tree
- **ADO enrichment** — language detection from file extensions, last commit date, project/README descriptions
- **Delete permissions** — only the user who added a repo or admins can delete it
- **Open in VS Code** / **Edit in Browser** (github.dev) deep links

### AI Chat
- **Multi-provider streaming** — Claude (Anthropic), GPT-4o (OpenAI), Gemini (Google), Ollama (local)
- **MCP tool integration** — AI can invoke registered MCP server tools
- **OTel tracing** — every LLM call is traced with provider, model, and latency attributes
- **Trace correlation** — chat messages link back to their OTel trace IDs

### MCP Server Registry
- **Register, start/stop, and monitor** MCP servers via stdio, SSE, or WebSocket transports
- **Server cards** with status, call count, port, capabilities, and command info
- **Onboarding guide** — comprehensive markdown guide accessible from the registry page

### OpenTelemetry Observability
- **Metrics dashboard** — req/sec, P99 latency, error rate, active spans, total traces
- **Trace list** — filterable by status and service with expandable span details
- **Onboarding guide** — collector setup instructions (Jaeger, Grafana Tempo, SaaS providers)
- **OTLP HTTP export** — traces and metrics to any OTLP-compatible collector

### Database Layer
- **SQLite** (default) with full CRUD for users, repos, settings, bookmarks, docs, plugins, analytics
- **PostgreSQL** and **Supabase** provider stubs — swap via `devdock.config.json`
- **JWT authentication** on API routes with role-based access control
- **Migration system** — versioned SQL migrations with auto-apply on startup
- **Seed data** — demo users, repos, settings auto-populated on first run

### User Management & RBAC
- **Three roles** — Admin, Contributor (Editor), Reader (Viewer) with granular permissions
- **User groups** — Admins, Contributors, Readers with automatic role/permission assignment
- **Per-user dashboards** — each user can customize their widget layout
- **Favorite repos** — star repos for quick access via the Favorites widget
- **Import from Active Directory** — search and import users directly from on-prem AD

### Active Directory Integration
- **Azure AD (Cloud)** — tenant ID, client ID, client secret, OAuth integration
- **On-Premises AD (LDAP/LDAPS)** — server URL, Base DN, Bind DN, SSL, configurable search filters
- **Directory browser** — admin page to browse AD users and groups with search
- **Security group mapping** — map AD groups to portal roles for automatic provisioning
- **Real connection testing** — Test Connection button validates LDAP connectivity

### Community Forum
- **Stack Overflow-style Q&A** — questions, answers, voting, accepted answers
- **Markdown editor** — toolbar with bold, italic, code blocks, headings, lists, links, and live preview
- **HTML + GFM rendering** — code syntax highlighting, tables, `<kbd>`, `<mark>`, `<details>`, task lists
- **Gamification** — reputation system (Bronze/Silver/Gold tiers) based on votes and accepted answers
- **Feature requests** — submit with title, description, file attachments, tags, and voting
- **Top Feature Requests** sidebar — highest-voted requests surface to the top
- **Top Contributors** leaderboard

### Documentation
- **Markdown docs viewer** — create, edit, and browse docs with syntax-highlighted code
- **Import from repos** — recursively discover and import all `.md` files from GitHub/ADO repos (including `docs/` subfolders)
- **Export to repos** — push docs back to GitHub or ADO with commit messages
- **Google Drive integration** — connect and import docs from Google Drive

### Custom Branding
- **Logo upload** — PNG, JPEG, or paste SVG markup to replace the default logo
- **App name & tagline** — customizable, applied to Topbar, Login page, and browser tab title
- **Live preview** — changes apply immediately across the app
- **Reset to default** — one-click restore of original branding

### Dashboard
- **Drag-and-drop widget grid** — add, remove, reorder widgets per user
- **Widget catalog** — GitHub repos, ADO repos, MCP servers, OTel traces, quick actions, activity feed, AI metrics, network map, favorites
- **Plugin widgets** — community-submitted widgets with admin approval workflow
- **RBAC-filtered** — widgets respect user permissions

### Additional Features
- **Command palette** (Ctrl+K) — unified search across repos, docs, MCP servers, telemetry, forum, and federated external sources
- **Federated search** — connect REST APIs, GraphQL, RSS feeds, and sitemaps as searchable sources
- **Network map** — discover devices on your local network
- **15 dev tools** — JSON validator, API tester, DNS lookup, ping, WHOIS, SSL checker, HTTP headers, WebSocket debugger, GraphQL explorer, text diff, Base64, regex tester, CSV viewer, Git generator, Docker generator
- **Plugin system** — installable plugins with pages, widgets, nav items, and settings
- **Scaffold agents** — AI-guided project scaffolding (web app, API service, cloud infra, MCP server, full-stack)
- **Bookmark management** — save, tag, organize, and search bookmarks with collections
- **Admin analytics** — page view tracking, client error logs, collapsible sections, top contributors

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start both the frontend and API server
npm run dev
# Frontend: http://localhost:5173
# API Server: http://localhost:3000

# 3. Login with default credentials
# Username: admin  Password: admin
# Username: editor Password: workbench
# Username: reader Password: workbench
```

### Individual Commands

```bash
npm run dev           # Start Vite + Fastify concurrently
npm run dev:client    # Vite dev server only (HMR)
npm run dev:server    # Fastify API server only (tsx watch)
npm run build         # TypeScript check + Vite production build
npm run start:server  # Production API server
npm run lint          # ESLint
npm run preview       # Preview production build
```

---

## Architecture

```
forge-portal-clean/
├── src/                          # Frontend (React + Vite)
│   ├── App.tsx                   # Router, OTel bootstrap, auth gate
│   ├── components/
│   │   ├── ui/                   # Shared primitives (Button, Card, Badge, Input, Toggle...)
│   │   ├── layout/               # Shell, Sidebar, Topbar
│   │   ├── repos/                # RepoCard, RepoList, RepoDetailPanel, RegisterRepo
│   │   ├── mcp/                  # MCPRegistry, ServerCard
│   │   ├── chat/                 # ChatPanel (multi-provider, streaming, OTel tracing)
│   │   ├── telemetry/            # MetricsBar, TraceList, OTel Guide Modal
│   │   ├── dashboard/            # DashboardGrid, QuickActions, Activity, AIMetrics
│   │   ├── forum/                # ForumThreadView, VoteControl, MarkdownEditor, FeatureRequests
│   │   ├── docs/                 # DocList, MarkdownViewer, DocEditor, ImportExport
│   │   ├── federated/            # FederatedSourceForm
│   │   └── network/              # NetworkMap
│   ├── pages/                    # Route-level page components
│   ├── store/                    # Zustand stores (persisted to localStorage)
│   ├── otel/                     # OpenTelemetry Web SDK + span helpers
│   ├── lib/                      # API clients, auth, repos, search, plugins
│   ├── content/                  # Onboarding guides (markdown)
│   └── types/                    # Shared TypeScript types
│
├── server/                       # Backend (Fastify + SQLite)
│   ├── index.ts                  # Server entry point
│   ├── config.ts                 # Config loader (file + env vars)
│   ├── db/
│   │   ├── provider.ts           # DatabaseProvider interface
│   │   ├── factory.ts            # Provider factory
│   │   ├── sqlite/               # SQLite implementation + migrations + seed
│   │   ├── postgres/             # PostgreSQL stub
│   │   └── supabase/             # Supabase stub
│   ├── routes/                   # API routes (auth, users, repos, settings, docs, etc.)
│   ├── middleware/                # JWT auth guard
│   └── lib/                      # LDAP client, federated fetcher
│
├── devdock.config.json           # Database provider configuration
└── public/                       # Static assets (logo, favicon)
```

### State Management

All frontend state lives in Zustand stores persisted to localStorage:

| Store | Key | Purpose |
|---|---|---|
| `useAuthStore` | `devdock-auth` | Login state, user profile, access token |
| `useSettingsStore` | `devdock-settings` | AI config, API keys, OTel, GitHub/ADO tokens, branding, navigation |
| `useRepoStore` | `devdock-repos` | GitHub and ADO repositories with metadata |
| `useUserAccountsStore` | `devdock-users` | User accounts, roles, groups, permissions, preferences |
| `useDocsStore` | `devdock-docs` | Documentation entries |
| `useForumStore` | `devdock-forum` | Forum threads, answers, votes, feature requests |
| `useBookmarkStore` | `devdock-bookmarks` | Bookmarks and collections |
| `usePluginStore` | `devdock-plugins` | Plugin enabled/disabled state |

### API Server

The Fastify backend (port 3000) provides:

| Endpoint Group | Description |
|---|---|
| `/api/auth` | JWT login and token verification |
| `/api/users` | User CRUD, preferences, favorites, dashboard widgets |
| `/api/repos` | Repo CRUD with owner-based delete permissions |
| `/api/settings` | Global and per-user settings |
| `/api/bookmarks` | Bookmarks and collections |
| `/api/docs` | Documentation CRUD |
| `/api/plugins/state` | Plugin enabled/settings state |
| `/api/analytics` | Page view and error tracking |
| `/api/directory` | LDAP connection testing, user/group browsing |
| `/api/federated-sources` | External search source management |
| `/api/health` | Server status, DB provider, uptime |

---

## Database Configuration

Default: SQLite (zero config, stores in `data/devdock.db`).

To switch providers, edit `devdock.config.json`:

```json
{
  "database": {
    "provider": "sqlite",
    "sqlite": { "path": "./data/devdock.db" },
    "postgres": { "connectionString": "postgresql://user:pass@localhost:5432/devdock" },
    "supabase": { "url": "https://your-project.supabase.co", "anonKey": "your-key" }
  }
}
```

Or use environment variables: `DEVDOCK_DB_PROVIDER`, `DEVDOCK_SQLITE_PATH`, `DEVDOCK_POSTGRES_URL`, `DEVDOCK_SUPABASE_URL`.

---

## OpenTelemetry Setup

Auto-instruments AI chat completions and repo API fetches. There are two
ways to collect traces:

### Option 1 — Bundled Grafana stack (recommended)

`docker-compose.observability.yml` brings up the full Grafana + OTel
Collector + Tempo + Prometheus + Loki stack with everything wired together
and a default DevDock dashboard pre-provisioned:

```bash
docker compose -f docker-compose.observability.yml up -d
```

The browser SDK is already pointed at `http://localhost:4318` (the
collector's OTLP HTTP port). Open the **Grafana** page in the sidebar to see
your traces, metrics, and logs in the embedded dashboard. The same view is
also available standalone at <http://localhost:3001> with anonymous viewer
access.

To stop and wipe data: `docker compose -f docker-compose.observability.yml down -v`.

If you want to point at your own Grafana instance instead, change the URL in
**Settings > Grafana** — your Grafana needs `allow_embedding: true` for the
in-app iframe to work.

### Option 2 — Bring your own collector

```bash
# Jaeger (quickstart, traces only)
docker run -d -p 4317:4317 -p 16686:16686 jaegertracing/all-in-one:latest

# View traces at http://localhost:16686
```

Configure the collector endpoint in **Settings > OpenTelemetry** or via `VITE_OTEL_ENDPOINT`.

---

## Active Directory

Supports both Azure AD (cloud) and on-premises AD (LDAP/LDAPS):

1. Go to **Settings > Active Directory**
2. Choose deployment type: **Azure AD** or **On-Premises AD**
3. Fill in connection details (tenant/client for Azure AD, or LDAP URL/Base DN/Bind DN for on-prem)
4. Map security groups to portal roles
5. Browse your directory from the **Directory** page
6. Import AD users into the portal from **Users > Add User > Import from Active Directory**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite 8, React 19, TypeScript, Tailwind CSS v4, Zustand, React Router v7 |
| Backend | Fastify 5, better-sqlite3, JWT (jsonwebtoken), ldapjs |
| Observability | OpenTelemetry Web SDK, OTLP HTTP exporters |
| AI Providers | Anthropic, OpenAI, Google Gemini, Ollama |
| Icons | Lucide React |
| Markdown | react-markdown, remark-gfm, rehype-raw, rehype-sanitize |

---

Built with care by Terry Ashley
