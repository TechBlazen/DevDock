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
