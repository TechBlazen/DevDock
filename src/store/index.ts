import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppSettings,
  WidgetId,
  AIProvider,
  MCPServer,
  ChatMessage,
  Repository,
  ActivityEvent,
  TraceSpan,
  ScaffoldAgentId,
  ScaffoldSession,
  AuthProvider,
  UserProfile,
  AuthState,
  ForgePlugin,
  DocEntry,
  UserAccount,
  UserRole,
  UserPreferences,
} from '../types';
import { nanoid } from 'nanoid';
import { createGuestUser } from '../lib/auth';
import { SEED_ADMIN, ROLE_PERMISSIONS, hashPassword, verifyPassword } from '../lib/rbac';

// ─── User Preferences Defaults ───────────────────────────────────────────────
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  accentColor: '#005DAA',
  greeting: 'time-based',
};

// ─── Auth Store ──────────────────────────────────────────────────────────────
interface AuthStore extends AuthState {
  signIn: (provider: AuthProvider, user: UserProfile, accessToken: string | null, expiresAt?: string) => void;
  signInAsGuest: () => void;
  signOut: () => void;
  setLoading: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      provider: null,
      expiresAt: null,

      signIn: (provider, user, accessToken, expiresAt) => {
        set({
          status: 'authenticated',
          user,
          accessToken,
          provider,
          expiresAt: expiresAt ?? null,
        });
        // Auto-provision account for OAuth users
        useUserAccountsStore.getState().ensureAccount(user);
      },

      signInAsGuest: () => {
        const guest = createGuestUser();
        set({
          status: 'authenticated',
          user: guest,
          accessToken: null,
          provider: 'guest',
          expiresAt: null,
        });
        useUserAccountsStore.getState().ensureAccount(guest);
      },

      signOut: () =>
        set({
          status: 'unauthenticated',
          user: null,
          accessToken: null,
          provider: null,
          expiresAt: null,
        }),

      setLoading: () => set({ status: 'loading' }),

      setToken: (token) => set({ accessToken: token }),
    }),
    {
      name: 'forge-portal-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        status: s.status,
        user: s.user,
        accessToken: s.accessToken,
        provider: s.provider,
        expiresAt: s.expiresAt,
      }),
    }
  )
);

// ─── Settings Store ───────────────────────────────────────────────────────────
interface SettingsStore {
  settings: AppSettings;
  updateAIProvider: (provider: AIProvider) => void;
  updateApiKey: (provider: AIProvider, key: string) => void;
  updateOTelConfig: (partial: Partial<AppSettings['otel']>) => void;
  updateGitHubConfig: (partial: Partial<AppSettings['github']>) => void;
  updateADOConfig: (partial: Partial<AppSettings['ado']>) => void;
  updateDashboardWidgets: (widgets: WidgetId[]) => void;
}

const defaultSettings: AppSettings = {
  ai: {
    provider: 'anthropic',
    apiKeys: { anthropic: '', openai: '', gemini: '', local: '' },
    localEndpoint: 'http://localhost:11434/v1',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 2048,
  },
  otel: {
    endpoint: 'http://localhost:4317',
    serviceName: 'forge-portal',
    enabled: true,
    exportTraces: true,
    exportMetrics: true,
    exportLogs: false,
  },
  github: {
    accessToken: '',
    orgs: [],
    includePersonal: true,
  },
  ado: {
    organization: '',
    personalAccessToken: '',
    projects: [],
  },
  theme: 'dark',
  dashboardWidgets: ['repos_github', 'repos_ado', 'mcp_status', 'telemetry', 'quick_actions', 'activity_feed'],
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateAIProvider: (provider) =>
        set((s) => ({ settings: { ...s.settings, ai: { ...s.settings.ai, provider } } })),
      updateApiKey: (provider, key) =>
        set((s) => ({
          settings: {
            ...s.settings,
            ai: { ...s.settings.ai, apiKeys: { ...s.settings.ai.apiKeys, [provider]: key } },
          },
        })),
      updateOTelConfig: (partial) =>
        set((s) => ({ settings: { ...s.settings, otel: { ...s.settings.otel, ...partial } } })),
      updateGitHubConfig: (partial) =>
        set((s) => ({ settings: { ...s.settings, github: { ...s.settings.github, ...partial } } })),
      updateADOConfig: (partial) =>
        set((s) => ({ settings: { ...s.settings, ado: { ...s.settings.ado, ...partial } } })),
      updateDashboardWidgets: (widgets) =>
        set((s) => ({ settings: { ...s.settings, dashboardWidgets: widgets } })),
    }),
    {
      name: 'forge-portal-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings }),
    }
  )
);

// ─── MCP Store ────────────────────────────────────────────────────────────────
interface MCPStore {
  servers: MCPServer[];
  addServer: (server: MCPServer) => void;
  removeServer: (id: string) => void;
  updateServer: (id: string, partial: Partial<MCPServer>) => void;
  setStatus: (id: string, status: MCPServer['status']) => void;
}

const defaultServers: MCPServer[] = [
  { id: 'fs', name: 'filesystem', description: 'Local file system access', port: 3001, status: 'running', callCount: 142, transport: 'stdio', command: 'npx', capabilities: ['read', 'write', 'list'] },
  { id: 'gh', name: 'github', description: 'GitHub API integration', port: 3002, status: 'running', callCount: 89, transport: 'sse', capabilities: ['repos', 'issues', 'prs'] },
  { id: 'fetch', name: 'fetch', description: 'HTTP fetch capability', port: 3003, status: 'running', callCount: 34, transport: 'stdio', capabilities: ['get', 'post'] },
  { id: 'mem', name: 'memory', description: 'Persistent memory store', port: 3004, status: 'idle', callCount: 7, transport: 'stdio', capabilities: ['remember', 'recall'] },
  { id: 'pg', name: 'postgres', description: 'PostgreSQL query tool', port: 3005, status: 'stopped', callCount: 0, transport: 'stdio', command: 'npx', capabilities: ['query', 'schema'] },
  { id: 'seq', name: 'sequential-thinking', description: 'Chain-of-thought reasoning', port: 3006, status: 'running', callCount: 211, transport: 'stdio', capabilities: ['think', 'plan'] },
];

export const useMCPStore = create<MCPStore>()((set) => ({
  servers: defaultServers,
  addServer: (server) => set((s) => ({ servers: [...s.servers, server] })),
  removeServer: (id) => set((s) => ({ servers: s.servers.filter((srv) => srv.id !== id) })),
  updateServer: (id, partial) =>
    set((s) => ({ servers: s.servers.map((srv) => (srv.id === id ? { ...srv, ...partial } : srv)) })),
  setStatus: (id, status) =>
    set((s) => ({ servers: s.servers.map((srv) => (srv.id === id ? { ...srv, status } : srv)) })),
}));

// ─── Chat Store ───────────────────────────────────────────────────────────────
interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  isOpen: boolean;
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
  setLoading: (val: boolean) => void;
  setOpen: (val: boolean) => void;
}

export const useChatStore = create<ChatStore>()((set) => ({
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey Judge 👋 I'm **Forge AI** — your MCP-powered developer assistant.\n\nI can help you:\n- 🔍 Explore GitHub & Azure DevOps repos\n- 🤖 Inspect and manage MCP servers\n- 📊 Analyze OpenTelemetry traces\n- 💻 Write, review, and explain code\n- 🏗️ Plan architecture and infrastructure\n\nWhat are we building today?",
      timestamp: new Date(),
      provider: 'anthropic',
    },
  ],
  isLoading: false,
  isOpen: false,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () =>
    set((s) => ({
      messages: [s.messages[0]], // keep welcome
    })),
  setLoading: (val) => set({ isLoading: val }),
  setOpen: (val) => set({ isOpen: val }),
}));

// ─── Repo Store ───────────────────────────────────────────────────────────────
interface RepoStore {
  githubRepos: Repository[];
  adoRepos: Repository[];
  selectedRepo: Repository | null;
  setRepos: (source: 'github' | 'ado', repos: Repository[]) => void;
  addRepo: (repo: Repository) => void;
  removeRepo: (id: string, source: 'github' | 'ado') => void;
  selectRepo: (repo: Repository | null) => void;
}

export const useRepoStore = create<RepoStore>()(
  persist(
    (set) => ({
      githubRepos: [
        { id: 'gh1', name: 'overwatch-ai', fullName: 'judge/overwatch-ai', description: 'Agentic AI diagnostics framework', source: 'github', language: 'Python', defaultBranch: 'main', stars: 142, forks: 18, isPrivate: true, updatedAt: '2h ago', cloneUrl: 'https://github.com/judge/overwatch-ai.git', webUrl: 'https://github.com/judge/overwatch-ai', topics: ['ai', 'kubernetes', 'diagnostics'] },
        { id: 'gh2', name: 'forge-portal', fullName: 'judge/forge-portal', description: 'AI-powered developer IDE portal', source: 'github', language: 'TypeScript', defaultBranch: 'main', stars: 89, forks: 7, isPrivate: false, updatedAt: '1d ago', cloneUrl: 'https://github.com/judge/forge-portal.git', webUrl: 'https://github.com/judge/forge-portal', topics: ['backstage', 'vite', 'mcp'] },
        { id: 'gh3', name: 'mcp-server-hub', fullName: 'judge/mcp-server-hub', description: 'MCP server registry and runner', source: 'github', language: 'Go', defaultBranch: 'develop', stars: 67, forks: 4, isPrivate: false, updatedAt: '3d ago', cloneUrl: 'https://github.com/judge/mcp-server-hub.git', webUrl: 'https://github.com/judge/mcp-server-hub', topics: ['mcp', 'go', 'registry'] },
        { id: 'gh4', name: 'backstage-plugins', fullName: 'judge/backstage-plugins', description: 'Custom Backstage plugin collection', source: 'github', language: 'TypeScript', defaultBranch: 'main', stars: 34, forks: 2, isPrivate: false, updatedAt: '1w ago', cloneUrl: 'https://github.com/judge/backstage-plugins.git', webUrl: 'https://github.com/judge/backstage-plugins' },
        { id: 'gh5', name: 'photomind', fullName: 'judge/photomind', description: 'AI face-tagging app with Google Photos API', source: 'github', language: 'Python', defaultBranch: 'main', stars: 12, forks: 0, isPrivate: true, updatedAt: '5d ago', cloneUrl: 'https://github.com/judge/photomind.git', webUrl: 'https://github.com/judge/photomind', topics: ['fastapi', 'react', 'ai', 'photos'] },
      ],
      adoRepos: [
        { id: 'ado1', name: 'Costco.Platform.Gateway', fullName: 'Costco/Costco.Platform.Gateway', description: 'API Gateway & ApigeeX configuration', source: 'ado', language: 'YAML', defaultBranch: 'main', isPrivate: true, updatedAt: '4h ago', cloneUrl: 'https://dev.azure.com/costco/Platform/_git/Costco.Platform.Gateway', webUrl: 'https://dev.azure.com/costco/Platform/_git/Costco.Platform.Gateway' },
        { id: 'ado2', name: 'Costco.K8s.Infra', fullName: 'Costco/Costco.K8s.Infra', description: 'GKE cluster infrastructure as code', source: 'ado', language: 'HCL', defaultBranch: 'main', isPrivate: true, updatedAt: '1d ago', cloneUrl: 'https://dev.azure.com/costco/Platform/_git/Costco.K8s.Infra', webUrl: 'https://dev.azure.com/costco/Platform/_git/Costco.K8s.Infra' },
        { id: 'ado3', name: 'Costco.DevPortal.IDP', fullName: 'Costco/Costco.DevPortal.IDP', description: 'Internal developer platform (Backstage)', source: 'ado', language: 'TypeScript', defaultBranch: 'feature/ai-chat', isPrivate: true, updatedAt: '2d ago', cloneUrl: 'https://dev.azure.com/costco/Platform/_git/Costco.DevPortal.IDP', webUrl: 'https://dev.azure.com/costco/Platform/_git/Costco.DevPortal.IDP' },
        { id: 'ado4', name: 'Costco.Overwatch.Core', fullName: 'Costco/Costco.Overwatch.Core', description: 'Overwatch AI agent core services', source: 'ado', language: 'Python', defaultBranch: 'main', isPrivate: true, updatedAt: '6h ago', cloneUrl: 'https://dev.azure.com/costco/Platform/_git/Costco.Overwatch.Core', webUrl: 'https://dev.azure.com/costco/Platform/_git/Costco.Overwatch.Core' },
      ],
      selectedRepo: null,
      setRepos: (source, repos) =>
        set(source === 'github' ? { githubRepos: repos } : { adoRepos: repos }),
      addRepo: (repo) =>
        set((s) => {
          if (repo.source === 'github') {
            if (s.githubRepos.some((r) => r.id === repo.id)) return s;
            return { githubRepos: [repo, ...s.githubRepos] };
          }
          if (s.adoRepos.some((r) => r.id === repo.id)) return s;
          return { adoRepos: [repo, ...s.adoRepos] };
        }),
      removeRepo: (id, source) =>
        set((s) =>
          source === 'github'
            ? { githubRepos: s.githubRepos.filter((r) => r.id !== id) }
            : { adoRepos: s.adoRepos.filter((r) => r.id !== id) }
        ),
      selectRepo: (repo) => set({ selectedRepo: repo }),
    }),
    {
      name: 'forge-portal-repos',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ githubRepos: s.githubRepos, adoRepos: s.adoRepos }),
    }
  )
);

// ─── Telemetry Store ──────────────────────────────────────────────────────────
interface TelemetryStore {
  spans: TraceSpan[];
  addSpan: (span: TraceSpan) => void;
  reqPerSec: number;
  p99Latency: number;
  errorRate: number;
  activeSpans: number;
}

const seedSpans: TraceSpan[] = [
  { traceId: 'tr_9f2a3b', spanId: 'sp_001', service: 'overwatch-ai', operation: 'agent.run', duration: 142, status: 'ok', timestamp: '12:01:34' },
  { traceId: 'tr_8b1c4d', spanId: 'sp_002', service: 'mcp-gateway', operation: 'tool.call', duration: 89, status: 'ok', timestamp: '12:01:31' },
  { traceId: 'tr_7e4d5f', spanId: 'sp_003', service: 'forge-portal', operation: 'api.repos', duration: 234, status: 'error', timestamp: '12:01:28' },
  { traceId: 'tr_6a3f6e', spanId: 'sp_004', service: 'overwatch-ai', operation: 'llm.completion', duration: 1820, status: 'ok', timestamp: '12:01:25' },
  { traceId: 'tr_5c2b7d', spanId: 'sp_005', service: 'mcp-gateway', operation: 'filesystem.read', duration: 45, status: 'ok', timestamp: '12:01:20' },
  { traceId: 'tr_4d1a8c', spanId: 'sp_006', service: 'forge-portal', operation: 'chat.send', duration: 388, status: 'ok', timestamp: '12:01:15' },
];

export const useTelemetryStore = create<TelemetryStore>()((set) => ({
  spans: seedSpans,
  addSpan: (span) => set((s) => ({ spans: [span, ...s.spans].slice(0, 100) })),
  reqPerSec: 42,
  p99Latency: 234,
  errorRate: 0.8,
  activeSpans: 7,
}));

// ─── Activity Store ───────────────────────────────────────────────────────────
interface ActivityStore {
  events: ActivityEvent[];
  addEvent: (event: ActivityEvent) => void;
}

export const useActivityStore = create<ActivityStore>()((set) => ({
  events: [
    { id: '1', user: 'judge', action: 'pushed to', target: 'overwatch-ai', targetType: 'repo', timestamp: new Date(Date.now() - 2 * 60000) },
    { id: '2', user: 'jorge', action: 'opened PR in', target: 'forge-portal', targetType: 'repo', timestamp: new Date(Date.now() - 15 * 60000) },
    { id: '3', user: 'adithya', action: 'deployed', target: 'K8s staging', targetType: 'deploy', timestamp: new Date(Date.now() - 60 * 60000) },
    { id: '4', user: 'judge', action: 'started MCP server', target: 'sequential-thinking', targetType: 'mcp', timestamp: new Date(Date.now() - 120 * 60000) },
    { id: '5', user: 'system', action: 'OTel error alert on', target: 'forge-portal', targetType: 'alert', timestamp: new Date(Date.now() - 180 * 60000) },
  ],
  addEvent: (event) => set((s) => ({ events: [event, ...s.events].slice(0, 50) })),
}));

// ─── Scaffold Store ──────────────────────────────────────────────���───────────
interface ScaffoldStore {
  sessions: ScaffoldSession[];
  activeSessionId: string | null;
  createSession: (agentId: ScaffoldAgentId, welcomeMessage: string) => string;
  addMessage: (sessionId: string, msg: ChatMessage) => void;
  setActiveSession: (id: string | null) => void;
  updateSessionTitle: (id: string, title: string) => void;
  completeSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

export const useScaffoldStore = create<ScaffoldStore>()(
  persist(
    (set) => ({
      sessions: [],
      activeSessionId: null,

      createSession: (agentId, welcomeMessage) => {
        const id = nanoid();
        const now = new Date().toISOString();
        const session: ScaffoldSession = {
          id,
          agentId,
          title: 'New Scaffold Session',
          messages: [
            {
              id: nanoid(),
              role: 'assistant',
              content: welcomeMessage,
              timestamp: new Date(),
            },
          ],
          createdAt: now,
          updatedAt: now,
          status: 'active',
        };
        set((s) => ({
          sessions: [session, ...s.sessions],
          activeSessionId: id,
        }));
        return id;
      },

      addMessage: (sessionId, msg) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? { ...sess, messages: [...sess.messages, msg], updatedAt: new Date().toISOString() }
              : sess
          ),
        })),

      setActiveSession: (id) => set({ activeSessionId: id }),

      updateSessionTitle: (id, title) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, title } : sess
          ),
        })),

      completeSession: (id) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, status: 'completed', updatedAt: new Date().toISOString() } : sess
          ),
        })),

      deleteSession: (id) =>
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== id),
          activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
        })),
    }),
    {
      name: 'forge-portal-scaffold',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ sessions: s.sessions }),
    }
  )
);

// ─── Plugin Store ────────────────────────────────────────────────────────────
interface PluginStore {
  plugins: ForgePlugin[];
  enabledPlugins: Record<string, boolean>;
  pluginSettings: Record<string, Record<string, string | boolean>>;
  registerPlugins: (plugins: ForgePlugin[]) => void;
  togglePlugin: (id: string) => void;
  isEnabled: (id: string) => boolean;
  getPluginSetting: (pluginId: string, key: string) => string | boolean | undefined;
  setPluginSetting: (pluginId: string, key: string, value: string | boolean) => void;
}

export const usePluginStore = create<PluginStore>()(
  persist(
    (set, get) => ({
      plugins: [],
      enabledPlugins: {},
      pluginSettings: {},

      registerPlugins: (plugins) =>
        set((s) => {
          const enabled = { ...s.enabledPlugins };
          for (const p of plugins) {
            if (!(p.id in enabled)) {
              enabled[p.id] = p.enabled;
            }
          }
          // Initialize default settings for new plugins
          const settings = { ...s.pluginSettings };
          for (const p of plugins) {
            if (!settings[p.id] && p.settings) {
              settings[p.id] = {};
              for (const setting of p.settings) {
                settings[p.id][setting.key] = setting.defaultValue;
              }
            }
          }
          return { plugins, enabledPlugins: enabled, pluginSettings: settings };
        }),

      togglePlugin: (id) =>
        set((s) => ({
          enabledPlugins: { ...s.enabledPlugins, [id]: !s.enabledPlugins[id] },
        })),

      isEnabled: (id) => get().enabledPlugins[id] ?? false,

      getPluginSetting: (pluginId, key) =>
        get().pluginSettings[pluginId]?.[key],

      setPluginSetting: (pluginId, key, value) =>
        set((s) => ({
          pluginSettings: {
            ...s.pluginSettings,
            [pluginId]: { ...s.pluginSettings[pluginId], [key]: value },
          },
        })),
    }),
    {
      name: 'forge-portal-plugins',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        enabledPlugins: s.enabledPlugins,
        pluginSettings: s.pluginSettings,
      }),
    }
  )
);

// ─── Docs Store ──────────────────────────────────────────────────────────────
interface DocsStore {
  docs: DocEntry[];
  activeDocId: string | null;
  addDoc: (doc: Omit<DocEntry, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDoc: (id: string, partial: Partial<Pick<DocEntry, 'title' | 'content' | 'tags' | 'sourceUrl'>>) => void;
  removeDoc: (id: string) => void;
  setActiveDoc: (id: string | null) => void;
}

const sampleDocs: DocEntry[] = [
  {
    id: 'doc-getting-started',
    title: 'Getting Started with Forge Portal',
    content: `# Getting Started with Forge Portal

Welcome to **Forge Portal** — your AI-powered developer portal.

## Quick Setup

1. Configure your API keys in **Settings**
2. Register repositories from the **GitHub** or **Azure DevOps** pages
3. Start chatting with **Forge AI** for coding assistance

## Features

- **Repo Browser** — Browse GitHub & Azure DevOps repos, open in VS Code
- **Forge AI Chat** — Multi-provider AI (Claude, GPT-4o, Gemini, Ollama)
- **MCP Registry** — Register and manage Model Context Protocol servers
- **OpenTelemetry** — Live traces, metrics, and spans
- **Scaffold** — AI agents that help you scaffold new projects
- **Plugins** — Extend the portal with custom functionality

## Architecture

\`\`\`
Vite 8 + React 19 + TypeScript
├── Zustand (state management)
├── React Router v7 (routing)
├── OpenTelemetry Web SDK (observability)
├── Tailwind CSS v4 (styling)
└── Monaco Editor (code editing)
\`\`\`

> Tip: Use the **Scaffold** page to generate new projects with AI guidance.
`,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['guide', 'onboarding'],
  },
  {
    id: 'doc-mcp-guide',
    title: 'MCP Server Configuration',
    content: `# MCP Server Configuration

## What is MCP?

The **Model Context Protocol** (MCP) allows AI models to access external tools, data sources, and capabilities through a standardized interface.

## Supported Transports

| Transport | Use Case |
|-----------|----------|
| \`stdio\` | Local processes, CLI tools |
| \`SSE\` | HTTP-based, server-sent events |
| \`WebSocket\` | Bidirectional, real-time |

## Adding a Server

1. Navigate to **MCP Servers** in the sidebar
2. Click **Add Server**
3. Fill in: name, description, port, and transport type
4. Click **Save** — the server appears in the registry

## Example: Filesystem Server

\`\`\`bash
npx @modelcontextprotocol/server-filesystem /path/to/dir
\`\`\`

## Example: GitHub Server

\`\`\`bash
npx @modelcontextprotocol/server-github
\`\`\`
`,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    tags: ['mcp', 'configuration'],
  },
  {
    id: 'doc-architecture',
    title: 'Forge Portal Architecture',
    content: `# Forge Portal Architecture

## System Overview

\`\`\`mermaid
graph TD
    A[Browser] --> B[Vite Dev Server]
    B --> C[React 19 SPA]
    C --> D[Zustand Stores]
    C --> E[React Router v7]
    C --> F[OpenTelemetry SDK]
    D --> G[localStorage]
    F --> H[OTel Collector]
    C --> I[AI Providers]
    I --> J[Anthropic API]
    I --> K[OpenAI API]
    I --> L[Gemini API]
    I --> M[Ollama Local]
    C --> N[MCP Servers]
    N --> O[stdio]
    N --> P[SSE]
    N --> Q[WebSocket]
\`\`\`

## Request Flow

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant F as Forge Portal
    participant AI as AI Provider
    participant MCP as MCP Server
    participant OT as OpenTelemetry

    U->>F: Send chat message
    F->>OT: Start trace span
    F->>AI: POST /v1/messages
    AI-->>F: Response (streamed)
    F->>MCP: Tool call (if needed)
    MCP-->>F: Tool result
    F->>OT: End trace span
    F-->>U: Render response
\`\`\`

## Component Hierarchy

\`\`\`mermaid
graph LR
    App --> Shell
    Shell --> Sidebar
    Shell --> Topbar
    Shell --> Main[Main Content]
    Shell --> ChatPanel
    Main --> Dashboard
    Main --> RepoPages
    Main --> MCPRegistry
    Main --> Scaffold
    Main --> Docs
    Main --> Plugins
    Dashboard --> Widgets
\`\`\`

## Plugin System

\`\`\`mermaid
flowchart LR
    P[ForgePlugin] --> Pages
    P --> Widgets
    P --> NavItems
    P --> Settings
    Pages --> Router[React Router]
    Widgets --> Dashboard[Dashboard Grid]
    NavItems --> Sidebar
    Settings --> PluginStore[Plugin Store]
\`\`\`

## Entity Relationship

\`\`\`mermaid
erDiagram
    USER ||--o{ REPO : registers
    USER ||--o{ DOC : creates
    USER ||--o{ SCAFFOLD_SESSION : starts
    REPO ||--|{ REPO_CARD : displays
    MCP_SERVER ||--|{ TOOL : exposes
    PLUGIN ||--o{ PAGE : contributes
    PLUGIN ||--o{ WIDGET : contributes
\`\`\`
`,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['architecture', 'diagrams', 'mermaid'],
  },
];

export const useDocsStore = create<DocsStore>()(
  persist(
    (set) => ({
      docs: sampleDocs,
      activeDocId: null,

      addDoc: (partial) => {
        const id = nanoid();
        const now = new Date().toISOString();
        const doc: DocEntry = { ...partial, id, createdAt: now, updatedAt: now };
        set((s) => ({ docs: [doc, ...s.docs], activeDocId: id }));
        return id;
      },

      updateDoc: (id, partial) =>
        set((s) => ({
          docs: s.docs.map((d) =>
            d.id === id ? { ...d, ...partial, updatedAt: new Date().toISOString() } : d
          ),
        })),

      removeDoc: (id) =>
        set((s) => ({
          docs: s.docs.filter((d) => d.id !== id),
          activeDocId: s.activeDocId === id ? null : s.activeDocId,
        })),

      setActiveDoc: (id) => set({ activeDocId: id }),
    }),
    {
      name: 'forge-portal-docs',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ docs: s.docs }),
      merge: (persisted, current) => {
        const p = persisted as Partial<DocsStore> | undefined;
        const existingDocs = p?.docs ?? [];
        // Ensure all sample docs exist (merge by id)
        const existingIds = new Set(existingDocs.map((d) => d.id));
        const missingDefaults = sampleDocs.filter((d) => !existingIds.has(d.id));
        return {
          ...current,
          docs: [...existingDocs, ...missingDefaults],
        };
      },
    }
  )
);

// ─── User Accounts Store (RBAC) ─────────────────────────────────────────────
interface UserAccountsStore {
  accounts: UserAccount[];
  addAccount: (username: string, password: string, displayName: string, role: UserRole, email?: string) => UserAccount | null;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, partial: Partial<Pick<UserAccount, 'displayName' | 'email' | 'role' | 'permissions' | 'dashboardWidgets' | 'preferences'>>) => void;
  updatePassword: (id: string, newPassword: string) => void;
  authenticate: (username: string, password: string) => UserAccount | null;
  setDashboardWidgets: (userId: string, widgets: string[]) => void;
  getAccount: (id: string) => UserAccount | undefined;
  ensureAccount: (user: UserProfile) => UserAccount;
  updatePreferences: (userId: string, partial: Partial<UserPreferences>) => void;
  getPreferences: (userId: string) => UserPreferences;
}

export const useUserAccountsStore = create<UserAccountsStore>()(
  persist(
    (set, get) => ({
      accounts: [SEED_ADMIN],

      addAccount: (username, password, displayName, role, email) => {
        const existing = get().accounts.find((a) => a.username === username);
        if (existing) return null;
        const account: UserAccount = {
          id: nanoid(),
          username,
          passwordHash: hashPassword(password),
          displayName,
          email,
          role,
          permissions: { ...ROLE_PERMISSIONS[role] },
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ accounts: [...s.accounts, account] }));
        return account;
      },

      removeAccount: (id) =>
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id && a.username !== 'admin') })),

      updateAccount: (id, partial) =>
        set((s) => ({
          accounts: s.accounts.map((a) => {
            if (a.id !== id) return a;
            const updated = { ...a, ...partial };
            // If role changed, update permissions to new role defaults
            if (partial.role && partial.role !== a.role && !partial.permissions) {
              updated.permissions = { ...ROLE_PERMISSIONS[partial.role] };
            }
            return updated;
          }),
        })),

      updatePassword: (id, newPassword) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === id ? { ...a, passwordHash: hashPassword(newPassword) } : a
          ),
        })),

      authenticate: (username, password) => {
        const account = get().accounts.find((a) => a.username === username);
        if (!account) return null;
        if (!verifyPassword(password, account.passwordHash)) return null;
        // Update last login
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === account.id ? { ...a, lastLogin: new Date().toISOString() } : a
          ),
        }));
        return account;
      },

      setDashboardWidgets: (userId, widgets) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === userId ? { ...a, dashboardWidgets: widgets } : a
          ),
        })),

      getAccount: (id) => get().accounts.find((a) => a.id === id),

      ensureAccount: (user) => {
        const existing = get().accounts.find((a) => a.id === user.id);
        if (existing) {
          set((s) => ({
            accounts: s.accounts.map((a) =>
              a.id === user.id ? { ...a, lastLogin: new Date().toISOString() } : a
            ),
          }));
          return { ...existing, lastLogin: new Date().toISOString() };
        }
        const account: UserAccount = {
          id: user.id,
          username: user.email ?? `${user.provider}_${user.id}`,
          passwordHash: 'oauth_no_password',
          displayName: user.displayName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role ?? 'viewer',
          permissions: { ...ROLE_PERMISSIONS[user.role ?? 'viewer'] },
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        set((s) => ({ accounts: [...s.accounts, account] }));
        return account;
      },

      updatePreferences: (userId, partial) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === userId
              ? { ...a, preferences: { ...(a.preferences ?? DEFAULT_PREFERENCES), ...partial } }
              : a
          ),
        })),

      getPreferences: (userId) => {
        const account = get().accounts.find((a) => a.id === userId);
        return account?.preferences ?? DEFAULT_PREFERENCES;
      },
    }),
    {
      name: 'forge-portal-users',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ accounts: s.accounts }),
      merge: (persisted, current) => {
        const p = persisted as Partial<UserAccountsStore> | undefined;
        const accounts = p?.accounts ?? [];
        // Ensure admin always exists
        if (!accounts.find((a) => a.username === 'admin')) {
          accounts.push(SEED_ADMIN);
        }
        return { ...current, accounts };
      },
    }
  )
);
