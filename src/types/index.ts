// ─── Repository Types ─────────────────────────────────────────────────────────
export type RepoSource = 'github' | 'ado';
export type RepoEnvironment = 'SBX' | 'ADT' | 'UAT' | 'QAT' | 'SPD' | 'PRD';
export type CloudPlatform = 'Azure' | 'GCP' | 'AWS' | 'On-Prem' | 'Other';

export interface RepoOwner {
  name: string;
  type: 'user' | 'team';
}

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
  environments?: RepoEnvironment[];
  cloudPlatform?: CloudPlatform;
  owners?: RepoOwner[];
  customTags?: string[];
  addedBy?: string;          // user ID of who registered this repo
  visible?: boolean;         // false = hidden from non-admin users (default: true)
  forumThreadId?: string;    // linked forum thread for repo comments/discussion
}

// ─── Repo Activity Types ─────────────────────────────────────────────────────
export interface RepoCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export type MergeStatus = 'merged' | 'open' | 'closed';

export interface RepoMerge {
  id: string;
  title: string;
  author: string;
  status: MergeStatus;
  sourceBranch: string;
  targetBranch: string;
  date: string;
  url: string;
}

export type BuildStatus = 'succeeded' | 'failed' | 'running' | 'canceled' | 'queued';

export interface RepoBuild {
  id: string;
  name: string;
  status: BuildStatus;
  branch: string;
  commit: string;
  duration: string;
  date: string;
  url: string;
}

// ─── MCP Types ────────────────────────────────────────────────────────────────
export type MCPStatus = 'running' | 'idle' | 'stopped' | 'error';

export type MCPTransport = 'stdio' | 'sse' | 'websocket';
export type MCPSessionStrategy = 'sticky' | 'stateless';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  port?: number;
  status: MCPStatus;
  callCount: number;
  transport: MCPTransport;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  autoStart?: boolean;
  sessionStrategy?: MCPSessionStrategy;
  lastUsed?: string;
  lastError?: string;
  capabilities?: string[];
  /** Number of tools discovered from this server via tools/list. */
  toolCount?: number;
  /** Last-persisted status (the column value); `status` is the live value. */
  storedStatus?: MCPStatus;
  addedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// A tool exposed by an MCP server, discovered through the JSON-RPC tools/list
// handshake. Mirrors the server-side McpToolRow (camelCased).
export interface MCPTool {
  id: string;
  serverId: string;
  name: string;
  description: string;
  inputSchema: unknown;
  callCount: number;
}

// ─── AI Provider Types ────────────────────────────────────────────────────────
export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'local';
export type ChatMode = 'devdock' | 'overwatch';

export interface RagCitation {
  parentId: string;
  kind: 'doc' | 'doc-readme' | 'federated' | 'forum-thread' | 'forum-answer';
  title: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provider?: AIProvider;
  tokens?: number;
  traceId?: string;
  chatMode?: ChatMode;
  /**
   * For assistant messages only: the list of docs the LLM saw as injected
   * context. Rendered under the reply so users can audit what RAG pulled in.
   */
  ragCitations?: RagCitation[];
  /**
   * For assistant messages only: MCP tools the model invoked while producing
   * this reply, dispatched through the Tool Gateway Router.
   */
  mcpToolCalls?: McpToolCall[];
}

// One MCP tool invocation made by the AI during a turn (for chat display).
export interface McpToolCall {
  name: string;
  serverId: string;
  ok: boolean;
  error?: string;
}

export interface AIConfig {
  provider: AIProvider;
  apiKeys: Record<AIProvider, string>;
  /**
   * When true, ChatPanel retrieves top-k relevant docs via
   * /api/search/semantic and injects them as context in the system prompt
   * on every send. Requires the server's vector runtime to be configured
   * (GEMINI_API_KEY + ChromaDB reachable).
   */
  useDocsAsContext?: boolean;
  localEndpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface OverwatchConfig {
  enabled: boolean;
  endpoint: string;             // Overwatch backend URL (e.g. http://localhost:8000)
  apiKey: string;               // optional Bearer token for auth
}

// Overwatch agent event types for streaming tool call progress
export type OverwatchToolStatus = 'started' | 'loading' | 'complete';

export interface OverwatchToolCall {
  toolCallId: string;
  toolCallName: string;
  status: OverwatchToolStatus;
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

// Settings for the Grafana page (/grafana). Pointed at the local
// docker-compose stack by default; users with their own Grafana can repoint.
// `dashboardUid` opens that specific dashboard inside the iframe; empty
// loads the Grafana home page.
export interface GrafanaConfig {
  url: string;
  dashboardUid: string;
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

// ─── Widget Submission Types ──────────────────────────────────────────────────
export type WidgetContentType = 'markdown' | 'iframe' | 'link';
export type WidgetSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface WidgetContentConfig {
  type: WidgetContentType;
  markdown?: string;
  url?: string;
  iframeHeight?: number;
}

export interface WidgetSubmission {
  id: string;
  title: string;
  icon: string;
  description: string;
  defaultSize: 'sm' | 'md' | 'lg';
  content: WidgetContentConfig;
  status: WidgetSubmissionStatus;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

// ─── Navigation Types ────────────────────────────────────────────────────────
export interface NavItemBase {
  id: string;
  visible: boolean;
}

export interface NavLinkItem extends NavItemBase {
  type: 'link';
  label: string;
  icon: string;          // lucide icon name
  route: string;
  adminOnly?: boolean;
  locked?: boolean;      // prevent deletion (e.g. Settings)
}

export interface NavGroupItem extends NavItemBase {
  type: 'group';
  label: string;
  icon: string;
  route: string;         // parent route
  children: NavLinkItem[];
  defaultExpanded: boolean;
}

export interface NavDividerItem extends NavItemBase {
  type: 'divider';
}

export interface NavExternalLinkItem extends NavItemBase {
  type: 'external';
  label: string;
  icon: string;
  url: string;
}

export interface NavPluginSlotItem extends NavItemBase {
  type: 'plugin-slot';
  label: string;
}

export type NavItem = NavLinkItem | NavGroupItem | NavDividerItem | NavExternalLinkItem | NavPluginSlotItem;

export interface NavigationConfig {
  items: NavItem[];
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

// Connection settings for an external n8n instance. The /n8n page uses
// these to list workflows and executions and to trigger webhook flows.
// baseUrl is the host root (e.g. https://n8n.example.com); the API key
// authenticates against n8n's public REST API via the X-N8N-API-KEY header.
export interface N8nConfig {
  baseUrl: string;
  apiKey: string;
}

export interface GoogleDriveConfig {
  accessToken: string;
  connected: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  thumbnailLink?: string;
}

export interface DriveBreadcrumb {
  id: string;
  name: string;
}

export interface ActiveDirectorySecurityGroup {
  id: string;
  name: string;
  description: string;
  role: UserRole;
}

export type ADMode = 'azure-ad' | 'on-prem';

export interface ActiveDirectoryConfig {
  enabled: boolean;
  mode: ADMode;
  // Azure AD (cloud)
  tenantId: string;
  clientId: string;
  clientSecret: string;
  domain: string;
  // On-prem AD / LDAP
  ldapUrl: string;
  baseDn: string;
  bindDn: string;
  bindPassword: string;
  userSearchFilter: string;
  userDisplayNameAttr: string;
  userEmailAttr: string;
  groupSearchFilter: string;
  useSsl: boolean;
  // Shared
  securityGroups: ActiveDirectorySecurityGroup[];
}

export interface BrandingConfig {
  appName: string;                // e.g. "DevDock"
  tagline: string;                // e.g. "AI Developer Portal"
  logoUrl: string;                // URL or data URL for the logo image
  logoType: 'default' | 'upload'; // whether using default or custom logo
  faviconUrl: string;             // URL or data URL for the favicon
}

// ─── Theme Types ──────────────────────────────────────────────────────────────
export type ThemeId = 'default' | 'engineer-workbench' | 'matrix';
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Background colors
  bgPrimary: string;
  bgSurface: string;
  bgElevated: string;
  bgHover: string;
  bgInput: string;
  bgInset: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  
  // Border colors
  borderColor: string;
  borderInput: string;
  borderSubtle: string;
  
  // Shadows
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  
  // Accent
  accent: string;
  accentBg: string;
  accentText: string;
  
  // UI elements
  overlay: string;
  scrollbar: string;
  scrollbarHover: string;
  codeBg: string;
  codeText: string;

  // Navigation
  navActiveBg: string;
  navActiveIndicator: string;
  navHoverBg: string;

  // Header & Footer
  headerShadow: string;
  footerBg: string;
  footerText: string;

  // Buttons
  btnHoverBg: string;
  btnActiveBg: string;
  btnRadius: string;

  // Tooltip
  tooltipBg: string;
  tooltipText: string;
}

export interface ThemeVariant {
  mode: ThemeMode;
  colors: ThemeColors;
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  author: string;
  light: ThemeVariant;
  dark: ThemeVariant;
  fontFamily?: string;
  fontSize?: string;
}

export interface AppSettings {
  ai: AIConfig;
  otel: OTelConfig;
  grafana: GrafanaConfig;
  github: GitHubConfig;
  ado: ADOConfig;
  n8n: N8nConfig;
  googleDrive: GoogleDriveConfig;
  activeDirectory: ActiveDirectoryConfig;
  branding: BrandingConfig;
  overwatch: OverwatchConfig;
  defaultLanguage: AppLanguage;
  theme: 'dark' | 'light' | 'system';
  activeTheme: ThemeId;         // admin-controlled theme for the entire site
  dashboardWidgets: WidgetId[];
  navigation: NavigationConfig;
  disabledTools: string[];      // tool IDs hidden from non-admin users
  aiEnabled: boolean;           // controls visibility of AI features (DevDock AI button)
}

// ─── Scaffold Types ──────────���─────────────────────────────────────���─────────
export type ScaffoldAgentId =
  | 'web-app'
  | 'api-service'
  | 'cloud-infra'
  | 'mcp-server'
  | 'full-stack'
  | 'devops-github'
  | 'playwright-testing'
  | 'enterprise-devops';

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
  canSubmitRegistry: boolean;   // publish agents/skills to the Gallery
  canApproveRegistry: boolean;  // review/approve registry submissions
  canInstallRegistry: boolean;  // install agents/skills from the Gallery
}

export type AppLanguage = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'pt' | 'zh' | 'ko';

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  greeting: 'time-based' | 'simple';
  language?: AppLanguage;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;      // simple hash for demo purposes
  displayName: string;
  email?: string;
  avatarUrl?: string;
  role: UserRole;
  group?: string;              // group name (Admins, Contributors, Readers)
  permissions: Permission;
  dashboardWidgets?: string[];  // per-user dashboard layout
  favoriteRepos?: string[];     // repo IDs
  favoriteTools?: string[];     // dev tool IDs
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

// ─── Plugin Submission Types ─────────────────────────────────────────────────
export type PluginSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface PluginSubmission {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  category: PluginCategory;
  tags: string[];
  status: PluginSubmissionStatus;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

// ─── Forum Types ────────────────────────────────────────────────────────────
export type ForumCategory = 'bug' | 'question' | 'discussion' | 'how-to' | 'repo-comment';
export type ForumDepartment = 'Engineering' | 'DevOps' | 'Platform' | 'Security' | 'Data';
export type ForumTechnology =
  | 'React' | 'TypeScript' | 'Python' | 'Go' | 'Rust' | 'Java'
  | 'Kubernetes' | 'Terraform' | 'Docker' | 'AWS' | 'Azure' | 'GCP'
  | 'PostgreSQL' | 'Redis' | 'GraphQL' | 'Node.js' | 'CI/CD' | 'Monitoring';
export type ReputationTier = 'bronze' | 'silver' | 'gold';

export interface ForumVote {
  userId: string;
  value: 1 | -1;
  createdAt: string;
}

export interface ForumAnswer {
  id: string;
  threadId: string;
  parentAnswerId?: string;   // if set, this is a reply to another answer (tree threading)
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  votes: ForumVote[];
  isAccepted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForumThread {
  id: string;
  title: string;
  body: string;
  category: ForumCategory;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  votes: ForumVote[];
  answers: ForumAnswer[];
  viewCount: number;
  acceptedAnswerId: string | null;
  repoId?: string;             // linked repo ID (for repo-comment threads)
  repoName?: string;           // linked repo display name
  repoSource?: 'github' | 'ado';
  createdAt: string;
  updatedAt: string;
}

export interface ForumUserReputation {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  points: number;
  tier: ReputationTier;
  questionCount: number;
  answerCount: number;
  acceptedCount: number;
}

// ─── Feature Request Types ──────────────────────────────────────────────────
export type FeatureRequestStatus = 'open' | 'planned' | 'in-progress' | 'completed' | 'declined';

export interface FeatureRequestAttachment {
  id: string;
  name: string;
  url: string;        // data URL for local uploads
  type: string;       // MIME type
  size: number;       // bytes
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  status: FeatureRequestStatus;
  votes: ForumVote[];
  attachments: FeatureRequestAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Agent & Skill Builder Types ────────────────────────────────────────────
export type BuilderItemType = 'agent' | 'skill';

export interface MockMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BuilderItem {
  id: string;
  userId: string;
  type: BuilderItemType;
  name: string;
  description: string;
  content: string;            // markdown/YAML definition
  mockConversation: MockMessage[];
  tags: string[];
  templateId?: string;        // which template it was created from
  exportedTo?: string;        // repo fullName if exported
  createdAt: string;
  updatedAt: string;
}

// ─── Agent & Skill Gallery Types ────────────────────────────────────────────
// A unified view-model for the showcase. In Phase 0 these are assembled
// client-side from scaffold agents, Agent Builder items, and a curated seed;
// Phase 1 replaces the source with a server-backed registry. `kind` mirrors
// the Builder's BuilderItemType, and `source` is the Gemini-style bucket.
export type GalleryKind = 'agent' | 'skill';
export type GallerySource = 'official' | 'org' | 'mine' | 'community';

export interface GalleryItem {
  id: string;
  kind: GalleryKind;
  name: string;
  description: string;
  source: GallerySource;
  category?: string;
  tags: string[];
  capabilities?: string[];
  compatibility?: string;
  /** SKILL.md text (frontmatter + body) when available — rendered in detail. */
  content?: string;
  author?: string;
  verified?: boolean;
  /** Net vote score / popularity signal (Phase 1 wires this to real votes). */
  score?: number;
  installCount?: number;
  /** Lucide icon name; falls back to a kind-based default. */
  icon?: string;
  /** Where "Try it" / "Open" should navigate. */
  href?: string;
  updatedAt?: string;
  // ── Registry-backed items carry their server identity so the detail drawer
  //    can install / vote / show governance state. Absent for scaffold/builder. ──
  registryId?: string;
  status?: RegistryStatus;
  installed?: boolean;
  votes?: ForumVote[];
}

// ─── Registry (server-backed Agent & Skill catalog) ─────────────────────────
// The persisted entity behind the Gallery. `source` here is the stored value
// (no 'mine' — that bucket is derived client-side from the current user).
export type RegistrySource = 'official' | 'org' | 'community';
export type RegistryStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface RegistryItem {
  id: string;
  kind: GalleryKind;
  name: string;
  slug: string;
  description: string;
  content: string;             // SKILL.md
  authorId: string;
  authorName: string;
  source: RegistrySource;
  verified: boolean;
  visibility: string;
  category?: string;
  tags: string[];
  capabilities: string[];
  compatibility?: string;
  status: RegistryStatus;
  votes: ForumVote[];
  installCount: number;
  latestVersion?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  // Only present on the single-item GET:
  versions?: RegistryVersion[];
  installed?: boolean;
}

export interface RegistryVersion {
  id: string;
  itemId: string;
  version: string;
  content: string;
  changelog?: string;
  createdAt: string;
}

export interface RegistryInstall {
  id: string;
  itemId: string;
  userId: string;
  installedAt: string;
  lastUsed?: string;
  useCount: number;
}

/** Fields accepted when creating/submitting a registry item via the API. */
export interface NewRegistryItemInput {
  kind: GalleryKind;
  name: string;
  description: string;
  content: string;
  category?: string;
  tags?: string[];
  capabilities?: string[];
  compatibility?: string;
  visibility?: string;
}

// ─── SQL Tool Types ─────────────────────────────────────────────────────────
export type DatabaseEngine = 'postgresql' | 'mysql' | 'mariadb' | 'sqlserver' | 'oracle' | 'sqlite';

export interface DatabaseConnection {
  id: string;
  userId: string;
  name: string;
  engine: DatabaseEngine;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionString?: string;   // optional override — if set, used instead of host/port/db
  ssl: boolean;
  color?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface SavedQuery {
  id: string;
  userId: string;
  connectionId?: string;
  name: string;
  sql: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: number;           // ms
  error?: string;
}

export interface TableInfo {
  schema: string;
  name: string;
  type: 'table' | 'view';
  rowCount?: number;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
}

export interface StoredProcedure {
  schema: string;
  name: string;
  language?: string;
}

// ─── Analytics Types ─────────────────────────────────────────────────────────
export interface PageView {
  id: string;
  userId: string;
  userName: string;
  path: string;
  timestamp: string;
}

// ─── Bookmark Types ──────────────────────────────────────────────────────────
export type ContentType = 'article' | 'video' | 'image' | 'document' | 'audio' | 'link';

export interface Bookmark {
  id: string;
  userId: string;
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  screenshot?: string;
  collectionId?: string;
  tags: string[];
  favorite: boolean;
  note?: string;
  contentType: ContentType;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkCollection {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  bookmarkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkFilter {
  search?: string;
  collectionId?: string;
  tags?: string[];
  favorite?: boolean;
  contentType?: ContentType;
}

export interface ClientError {
  id: string;
  userId: string;
  userName: string;
  message: string;
  stack?: string;
  path: string;
  timestamp: string;
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
  folder?: string;  // slash-separated path, e.g. "guides/onboarding"
}

export interface DocFolder {
  id: string;
  name: string;
  parentPath?: string;  // parent folder path, undefined = root
}
