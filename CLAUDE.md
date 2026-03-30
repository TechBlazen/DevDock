# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Forge Portal

An AI-powered developer portal (like Backstage.io) built around MCP servers, multi-provider AI chat, and OpenTelemetry observability. It browses GitHub & Azure DevOps repos, manages MCP server lifecycle, provides multi-provider AI chat (Claude, GPT-4o, Gemini, Ollama), and displays live OTel traces/metrics.

## Commands

```bash
npm run dev       # Start Vite dev server at http://localhost:5173 (HMR)
npm run build     # TypeScript check + Vite production build
npm run lint      # ESLint (flat config, TS + React hooks + react-refresh)
npm run preview   # Serve production build locally
```

No test framework is configured.

## Architecture

**Stack:** Vite 8, React 19, TypeScript, Tailwind CSS v4, Zustand, React Router v7, OpenTelemetry Web SDK.

**Path alias:** `@/` maps to `src/` (configured in `vite.config.ts`).

**Proxy:** `/api` requests proxy to `http://localhost:3000` in dev.

### State Management

All state lives in Zustand stores (`src/store/index.ts`) — a single file exporting five stores:
- `useSettingsStore` — persisted to localStorage (`forge-portal-settings`), holds AI provider config, API keys, OTel config, GitHub/ADO tokens, dashboard widget list
- `useMCPStore` — MCP server registry (add/remove/status)
- `useChatStore` — chat messages + loading state
- `useRepoStore` — GitHub and ADO repositories
- `useTelemetryStore` / `useActivityStore` — OTel spans and activity feed

Settings store is the only one with localStorage persistence.

### AI Providers

`src/lib/ai.ts` implements streaming chat for four providers (Anthropic, OpenAI, Gemini, Ollama/local) via direct `fetch` calls. Each call is wrapped with OTel tracing via `traceAICall`. The active provider and API keys come from the settings store.

### OpenTelemetry

`src/otel/index.ts` bootstraps the OTel Web SDK (traces + metrics) on app mount. It exports `initOTel()` called from `App.tsx` when OTel is enabled, and `traceAICall()` used by the AI client. Sends OTLP over HTTP.

### Routing

`App.tsx` defines routes inside a `<Shell>` layout: `/` (dashboard), `/github`, `/ado`, `/mcp`, `/telemetry`, `/catalog`, `/settings`.

### UI Patterns

- Glass-morphism theme: custom `glass-bg`, `glass-border`, `glass-hover` Tailwind colors defined in `tailwind.config.ts`
- Icons from `lucide-react`
- Components organized by domain: `components/{ui,layout,repos,mcp,chat,telemetry,dashboard}`
- `components/ui/` contains shared primitives (Button, Card, Badge, Input, Toggle, etc.)

### Data

Stores are seeded with mock/demo data (sample repos, MCP servers, telemetry spans). Real data comes from GitHub/ADO APIs (`src/lib/repos.ts`) and MCP server connections when tokens are configured.
