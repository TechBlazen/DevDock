// ─── Repository Types ─────────────────────────────────────────────────────────
export type RepoSource = 'github' | 'ado';

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  source: RepoSource;
  language: string;
  defaultBranch: string;
  stars?: number;
  forks?: number;
  isPrivate: boolean;
  updatedAt: string;
  cloneUrl: string;
  webUrl: string;
  topics?: string[];
}

// ─── MCP Types ────────────────────────────────────────────────────────────────
export type MCPStatus = 'running' | 'idle' | 'stopped' | 'error';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  port: number;
  status: MCPStatus;
  callCount: number;
  transport: 'stdio' | 'sse' | 'websocket';
  command?: string;
  env?: Record<string, string>;
  lastUsed?: string;
  capabilities?: string[];
}

// ─── AI Provider Types ────────────────────────────────────────────────────────
export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'local';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provider?: AIProvider;
  tokens?: number;
  traceId?: string;
}

export interface AIConfig {
  provider: AIProvider;
  apiKeys: Record<AIProvider, string>;
  localEndpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

// ─── OTel Types ───────────────────────────────────────────────────────────────
export interface TraceSpan {
  traceId: string;
  spanId: string;
  service: string;
  operation: string;
  duration: number;
  status: 'ok' | 'error' | 'unset';
  timestamp: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface OTelConfig {
  endpoint: string;
  serviceName: string;
  enabled: boolean;
  exportTraces: boolean;
  exportMetrics: boolean;
  exportLogs: boolean;
  headers?: Record<string, string>;
}

export interface MetricSnapshot {
  reqPerSec: number;
  p99Latency: number;
  errorRate: number;
  activeSpans: number;
  totalTraces: number;
}

// ─── Dashboard / Widget Types ─────────────────────────────────────────────────
export type WidgetId = string;

export interface DashboardWidget {
  id: WidgetId;
  title: string;
  icon: string;
  description: string;
  defaultSize: 'sm' | 'md' | 'lg';
}

// ─── Settings Types ───────────────────────────────────────────────────────────
export interface GitHubConfig {
  accessToken: string;
  orgs: string[];
  includePersonal: boolean;
}

export interface ADOConfig {
  organization: string;
  personalAccessToken: string;
  projects: string[];
}

export interface AppSettings {
  ai: AIConfig;
  otel: OTelConfig;
  github: GitHubConfig;
  ado: ADOConfig;
  theme: 'dark' | 'light';
  dashboardWidgets: WidgetId[];
}

// ─── Scaffold Types ──────────���─────────────────────────────────────���─────────
export type ScaffoldAgentId =
  | 'web-app'
  | 'api-service'
  | 'cloud-infra'
  | 'mcp-server'
  | 'full-stack';

export interface ScaffoldAgent {
  id: ScaffoldAgentId;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  systemPrompt: string;
  welcomeMessage: string;
}

export interface ScaffoldSession {
  id: string;
  agentId: ScaffoldAgentId;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed';
}

// ─── Activity Feed ───���─────────────────────────────────���──────────────────────
export interface ActivityEvent {
  id: string;
  user: string;
  action: string;
  target: string;
  targetType: 'repo' | 'mcp' | 'deploy' | 'alert' | 'ai';
  timestamp: Date;
}

// ─── Auth Types ──────────────────────────────────────────────────────────────
export type AuthProvider = 'github' | 'microsoft' | 'google' | 'guest' | 'local';

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  role?: UserRole;
}

export interface AuthProviderConfig {
  id: AuthProvider;
  name: string;
  icon: string;
  color: string;
  description: string;
  oauthEndpoint?: string;
  scopes?: string[];
}

export interface AuthState {
  status: 'unauthenticated' | 'loading' | 'authenticated';
  user: UserProfile | null;
  accessToken: string | null;
  provider: AuthProvider | null;
  expiresAt: string | null;
}

// ─── RBAC Types ──────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface Permission {
  pages: string[];           // route paths user can access (e.g. '/settings', '/mcp')
  widgets: string[];         // widget IDs user can see on dashboard
  plugins: string[];         // plugin IDs user can use ('*' for all)
  canManageUsers: boolean;
  canManagePlugins: boolean;
  canEditDocs: boolean;
  canAccessTerminal: boolean;
  canAccessNetwork: boolean;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  greeting: 'time-based' | 'simple';
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;      // simple hash for demo purposes
  displayName: string;
  email?: string;
  avatarUrl?: string;
  role: UserRole;
  permissions: Permission;
  dashboardWidgets?: string[];  // per-user dashboard layout
  preferences?: UserPreferences;
  createdAt: string;
  lastLogin?: string;
}

// ─── Plugin Types ────────────────────────────────────────────────────────────
export type PluginCategory = 'plugin' | 'template' | 'integration' | 'widget' | 'example';
export type PluginContext = 'global' | 'dashboard' | 'entity';

export interface PluginPage {
  path: string;
  title: string;
  component: React.ComponentType;
}

export interface PluginWidget {
  id: string;
  title: string;
  icon: string;
  description: string;
  defaultSize: 'sm' | 'md' | 'lg';
  component: React.ComponentType;
}

export interface PluginNavItem {
  to: string;
  icon: React.ComponentType;
  label: string;
}

export interface PluginSetting {
  key: string;
  label: string;
  type: 'text' | 'password' | 'toggle';
  defaultValue: string | boolean;
}

export interface ForgePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  category: PluginCategory;
  context: PluginContext;
  enabled: boolean;
  tags?: string[];
  pages?: PluginPage[];
  widgets?: PluginWidget[];
  navItems?: PluginNavItem[];
  settings?: PluginSetting[];
}

// ─── Docs Types ──────────────────────────────────────────────────────────────
export interface DocEntry {
  id: string;
  title: string;
  content: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}
