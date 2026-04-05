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

export interface AppSettings {
  ai: AIConfig;
  otel: OTelConfig;
  github: GitHubConfig;
  ado: ADOConfig;
  googleDrive: GoogleDriveConfig;
  activeDirectory: ActiveDirectoryConfig;
  branding: BrandingConfig;
  defaultLanguage: AppLanguage;
  theme: 'dark' | 'light';
  dashboardWidgets: WidgetId[];
  navigation: NavigationConfig;
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
export type ForumCategory = 'bug' | 'question' | 'discussion' | 'how-to';
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
}
