// ─── Database Provider Interface ────────────────────────────────────────────
// All providers (SQLite, PostgreSQL, Supabase) implement this interface.
// JSON-serializable types are stored as-is; the provider handles
// serialization to the underlying column type (TEXT for SQLite, JSONB for PG).

export interface DatabaseProvider {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  migrate(): Promise<void>;

  // ─── Users ──────────────────────────────────────────────────────────────────
  getUsers(): Promise<UserRow[]>;
  getUserById(id: string): Promise<UserRow | null>;
  getUserByUsername(username: string): Promise<UserRow | null>;
  createUser(user: UserRow): Promise<UserRow>;
  updateUser(id: string, partial: Partial<UserRow>): Promise<UserRow | null>;
  deleteUser(id: string): Promise<void>;

  // ─── Repos ──────────────────────────────────────────────────────────────────
  getRepos(source?: 'github' | 'ado'): Promise<RepoRow[]>;
  getRepoById(id: string): Promise<RepoRow | null>;
  upsertRepo(repo: RepoRow): Promise<RepoRow>;
  updateRepo(id: string, partial: Partial<RepoRow>): Promise<RepoRow | null>;
  deleteRepo(id: string): Promise<void>;

  // ─── Settings ───────────────────────────────────────────────────────────────
  getSettings(userId?: string): Promise<SettingsRow | null>;
  upsertSettings(settings: SettingsRow): Promise<SettingsRow>;

  // ─── Bookmarks ──────────────────────────────────────────────────────────────
  getBookmarks(userId: string): Promise<BookmarkRow[]>;
  createBookmark(bookmark: BookmarkRow): Promise<BookmarkRow>;
  updateBookmark(id: string, partial: Partial<BookmarkRow>): Promise<BookmarkRow | null>;
  deleteBookmark(id: string): Promise<void>;

  // ─── Collections ────────────────────────────────────────────────────────────
  getCollections(userId: string): Promise<CollectionRow[]>;
  createCollection(collection: CollectionRow): Promise<CollectionRow>;
  updateCollection(id: string, partial: Partial<CollectionRow>): Promise<CollectionRow | null>;
  deleteCollection(id: string): Promise<void>;

  // ─── Docs ───────────────────────────────────────────────────────────────────
  getDocs(): Promise<DocRow[]>;
  createDoc(doc: DocRow): Promise<DocRow>;
  updateDoc(id: string, partial: Partial<DocRow>): Promise<DocRow | null>;
  deleteDoc(id: string): Promise<void>;

  // ─── Plugins ────────────────────────────────────────────────────────────────
  getPluginState(): Promise<PluginStateRow>;
  updatePluginState(state: Partial<PluginStateRow>): Promise<PluginStateRow>;

  // ─── Analytics ──────────────────────────────────────────────────────────────
  trackPageView(view: PageViewRow): Promise<void>;
  trackError(error: ErrorRow): Promise<void>;
  getPageViews(limit?: number): Promise<PageViewRow[]>;
  getErrors(limit?: number): Promise<ErrorRow[]>;

  // ─── Federated Sources ──────────────────────────────────────────────────────
  getFederatedSources(): Promise<FederatedSourceRow[]>;
  getFederatedSourceById(id: string): Promise<FederatedSourceRow | null>;
  createFederatedSource(source: FederatedSourceRow): Promise<FederatedSourceRow>;
  updateFederatedSource(id: string, partial: Partial<FederatedSourceRow>): Promise<FederatedSourceRow | null>;
  deleteFederatedSource(id: string): Promise<void>;

  // ─── Federated Documents ────────────────────────────────────────────────────
  getFederatedDocuments(sourceId: string): Promise<FederatedDocumentRow[]>;
  getAllFederatedDocuments(): Promise<FederatedDocumentRow[]>;
  replaceFederatedDocuments(sourceId: string, docs: FederatedDocumentRow[]): Promise<void>;
  deleteFederatedDocumentsBySource(sourceId: string): Promise<void>;

  // ─── Forum (Threads + Answers) ──────────────────────────────────────────────
  getForumThreads(): Promise<ForumThreadRow[]>;
  getForumThreadById(id: string): Promise<ForumThreadRow | null>;
  createForumThread(thread: ForumThreadRow): Promise<ForumThreadRow>;
  updateForumThread(id: string, partial: Partial<ForumThreadRow>): Promise<ForumThreadRow | null>;
  deleteForumThread(id: string): Promise<void>;

  getForumAnswersByThread(threadId: string): Promise<ForumAnswerRow[]>;
  getAllForumAnswers(): Promise<ForumAnswerRow[]>;
  createForumAnswer(answer: ForumAnswerRow): Promise<ForumAnswerRow>;
  updateForumAnswer(id: string, partial: Partial<ForumAnswerRow>): Promise<ForumAnswerRow | null>;
  deleteForumAnswer(id: string): Promise<void>;

  // ─── Feature Requests ───────────────────────────────────────────────────────
  getFeatureRequests(): Promise<FeatureRequestRow[]>;
  getFeatureRequestById(id: string): Promise<FeatureRequestRow | null>;
  createFeatureRequest(req: FeatureRequestRow): Promise<FeatureRequestRow>;
  updateFeatureRequest(id: string, partial: Partial<FeatureRequestRow>): Promise<FeatureRequestRow | null>;
  deleteFeatureRequest(id: string): Promise<void>;

  // ─── APIs (Swagger / OpenAPI specs) ─────────────────────────────────────────
  getApis(): Promise<ApiRow[]>;
  getApiById(id: string): Promise<ApiRow | null>;
  getApisByRepo(repoId: string): Promise<ApiRow[]>;
  createApi(api: ApiRow): Promise<ApiRow>;
  updateApi(id: string, partial: Partial<ApiRow>): Promise<ApiRow | null>;
  deleteApi(id: string): Promise<void>;

  // ─── MCP Servers (the "MCP Register" / adapters) ────────────────────────────
  getMcpServers(): Promise<McpServerRow[]>;
  getMcpServerById(id: string): Promise<McpServerRow | null>;
  createMcpServer(server: McpServerRow): Promise<McpServerRow>;
  updateMcpServer(id: string, partial: Partial<McpServerRow>): Promise<McpServerRow | null>;
  deleteMcpServer(id: string): Promise<void>;

  // ─── MCP Tools (discovered via tools/list — Tool Gateway Router registry) ────
  getMcpTools(serverId?: string): Promise<McpToolRow[]>;
  getMcpToolByName(name: string): Promise<McpToolRow | null>;
  replaceMcpTools(serverId: string, tools: McpToolRow[]): Promise<void>;
  deleteMcpToolsByServer(serverId: string): Promise<void>;
}

// ─── Row types (flat, JSON-serialized for complex fields) ───────────────────

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  role: string;
  permissions: string;       // JSON
  dashboard_widgets?: string; // JSON array
  favorite_repos?: string;   // JSON array
  preferences?: string;      // JSON
  created_at: string;
  last_login?: string;
}

export interface RepoRow {
  id: string;
  name: string;
  full_name: string;
  description: string;
  source: string;
  language: string;
  default_branch: string;
  stars?: number;
  forks?: number;
  is_private: number;        // 0 or 1 for SQLite compat
  updated_at: string;
  clone_url: string;
  web_url: string;
  topics?: string;           // JSON array
  environments?: string;     // JSON array
  cloud_platform?: string;
  owners?: string;           // JSON array
  custom_tags?: string;      // JSON array
  added_by?: string;
}

export interface SettingsRow {
  id: string;
  user_id?: string;
  ai_config: string;         // JSON
  otel_config: string;       // JSON
  github_config: string;     // JSON
  ado_config: string;        // JSON
  theme: string;
  dashboard_widgets: string;  // JSON array
}

export interface BookmarkRow {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  screenshot?: string;
  collection_id?: string;
  tags: string;              // JSON array
  favorite: number;          // 0 or 1
  note?: string;
  content_type: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionRow {
  id: string;
  user_id: string;
  name: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DocRow {
  id: string;
  title: string;
  content: string;
  source_url?: string;
  tags: string;              // JSON array
  created_at: string;
  updated_at: string;
}

export interface PluginStateRow {
  id: string;
  enabled_plugins: string;   // JSON
  plugin_settings: string;   // JSON
}

export interface PageViewRow {
  id: string;
  user_id: string;
  user_name: string;
  path: string;
  timestamp: string;
}

export interface ErrorRow {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  stack?: string;
  path: string;
  timestamp: string;
}

export interface FederatedSourceRow {
  id: string;
  name: string;
  type: string;
  endpoint_url: string;
  auth_type: string;
  auth_config: string;
  result_mapping: string;
  trigger_config: string;
  sync_interval_minutes: number;
  last_synced_at?: string;
  document_count: number;
  enabled: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FederatedDocumentRow {
  id: string;
  source_id: string;
  title: string;
  description: string;
  url: string;
  icon?: string;
  tags: string;
  content: string;
  extra: string;
  meta: string;
  fetched_at: string;
}

// Votes, tags, answers (when denormalised) are stored as JSON strings.
// Accepted answer id is nullable — unset until one is accepted.
export interface ForumThreadRow {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: string;                // JSON array<string>
  author_id: string;
  author_name: string;
  author_avatar_url?: string;
  votes: string;               // JSON array<ForumVote>
  view_count: number;
  accepted_answer_id?: string;
  repo_id?: string;
  repo_name?: string;
  repo_source?: string;        // 'github' | 'ado'
  created_at: string;
  updated_at: string;
}

export interface ForumAnswerRow {
  id: string;
  thread_id: string;
  parent_answer_id?: string;   // reply-to-answer threading (optional)
  author_id: string;
  author_name: string;
  author_avatar_url?: string;
  body: string;
  votes: string;               // JSON array<ForumVote>
  is_accepted: number;         // 0 or 1 for SQLite compat
  created_at: string;
  updated_at: string;
}

export interface FeatureRequestRow {
  id: string;
  title: string;
  description: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string;
  status: string;              // 'open' | 'planned' | 'in-progress' | 'completed' | 'declined'
  votes: string;               // JSON array<ForumVote>
  attachments: string;         // JSON array<FeatureRequestAttachment>
  tags: string;                // JSON array<string>
  created_at: string;
  updated_at: string;
}

// API specs registered in DevDock. spec_raw holds the original YAML/JSON
// the user pointed us at — opaque to the server, parsed on the client.
// source_repo_id is a soft FK (no DB constraint) so users can paste a
// spec URL without first registering the underlying repo.
export interface ApiRow {
  id: string;
  name: string;
  description?: string;
  source_repo_id?: string;
  source_repo_name?: string;
  source_url: string;
  spec_kind: string;           // 'swagger' (2.x) | 'openapi' (3.x)
  spec_version?: string;       // exact version string from the spec
  spec_raw: string;            // original YAML or JSON
  base_url?: string;           // first servers[].url (OpenAPI 3) or host+basePath (Swagger 2)
  added_by?: string;
  created_at: string;
  updated_at: string;
}

// A registered MCP server ("adapter" in mcp-gateway terms). Connection details
// vary by transport: stdio uses command+args+env; sse/websocket use url. The
// `status`/`last_error` columns are the last-known runtime state — the live
// value is owned by the in-process McpManager and reconciled on boot.
export interface McpServerRow {
  id: string;
  name: string;
  description: string;
  transport: string;           // 'stdio' | 'sse' | 'websocket'
  command?: string;            // stdio executable
  args?: string;               // JSON array<string>
  env?: string;                // JSON object<string,string>
  url?: string;                // sse/websocket endpoint
  port?: number;
  status: string;              // 'running' | 'idle' | 'stopped' | 'error'
  auto_start: number;          // 0 or 1 for SQLite compat
  session_strategy: string;    // 'sticky' | 'stateless'
  call_count: number;
  capabilities?: string;       // JSON array<string>
  last_used?: string;
  last_error?: string;
  added_by?: string;
  created_at: string;
  updated_at: string;
}

// A tool exposed by an MCP server, discovered via the JSON-RPC `tools/list`
// call. input_schema is the tool's JSON Schema (opaque to the server, used by
// the client + tool router to validate/dispatch arguments).
export interface McpToolRow {
  id: string;
  server_id: string;
  name: string;
  description: string;
  input_schema?: string;       // JSON
  call_count: number;
  created_at: string;
  updated_at: string;
}
