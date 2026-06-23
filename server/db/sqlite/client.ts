import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  DatabaseProvider, UserRow, RepoRow, SettingsRow,
  BookmarkRow, CollectionRow, DocRow, PluginStateRow,
  PageViewRow, ErrorRow, FederatedSourceRow, FederatedDocumentRow,
  ForumThreadRow, ForumAnswerRow, FeatureRequestRow, ApiRow,
  McpServerRow, McpToolRow,
  RegistryItemRow, RegistryVersionRow, RegistryInstallRow,
} from '../provider.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class SqliteProvider implements DatabaseProvider {
  private db!: Database.Database;

  constructor(private dbPath: string) {}

  async connect(): Promise<void> {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  async disconnect(): Promise<void> {
    this.db.close();
  }

  async migrate(): Promise<void> {
    // Ensure _migrations table exists
    this.db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    const applied = new Set(
      this.db.prepare('SELECT name FROM _migrations').all().map((r) => (r as { name: string }).name)
    );

    const migrationsDir = resolve(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(resolve(migrationsDir, file), 'utf-8');
      this.db.exec(sql);
      this.db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      console.log(`  Applied migration: ${file}`);
    }
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  async getUsers(): Promise<UserRow[]> {
    return this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as UserRow[];
  }

  async getUserById(id: string): Promise<UserRow | null> {
    return (this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow) ?? null;
  }

  async getUserByUsername(username: string): Promise<UserRow | null> {
    return (this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow) ?? null;
  }

  async createUser(user: UserRow): Promise<UserRow> {
    const row = nullify(user);
    this.db.prepare(`INSERT INTO users (id, username, password_hash, display_name, email, avatar_url, role, permissions, dashboard_widgets, favorite_repos, preferences, created_at, last_login)
      VALUES (@id, @username, @password_hash, @display_name, @email, @avatar_url, @role, @permissions, @dashboard_widgets, @favorite_repos, @preferences, @created_at, @last_login)`).run(row);
    return user;
  }

  async updateUser(id: string, partial: Partial<UserRow>): Promise<UserRow | null> {
    const existing = await this.getUserById(id);
    if (!existing) return null;
    const updated = { ...existing, ...partial };
    const sets = Object.keys(partial).map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE users SET ${sets} WHERE id = @id`).run({ ...partial, id });
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  // ─── Repos ──────────────────────────────────────────────────────────────────

  async getRepos(source?: string): Promise<RepoRow[]> {
    if (source) {
      return this.db.prepare('SELECT * FROM repos WHERE source = ? ORDER BY updated_at DESC').all(source) as RepoRow[];
    }
    return this.db.prepare('SELECT * FROM repos ORDER BY updated_at DESC').all() as RepoRow[];
  }

  async getRepoById(id: string): Promise<RepoRow | null> {
    return (this.db.prepare('SELECT * FROM repos WHERE id = ?').get(id) as RepoRow) ?? null;
  }

  async upsertRepo(repo: RepoRow): Promise<RepoRow> {
    this.db.prepare(`INSERT OR REPLACE INTO repos (id, name, full_name, description, source, language, default_branch, stars, forks, is_private, updated_at, clone_url, web_url, topics, environments, cloud_platform, owners, custom_tags, added_by)
      VALUES (@id, @name, @full_name, @description, @source, @language, @default_branch, @stars, @forks, @is_private, @updated_at, @clone_url, @web_url, @topics, @environments, @cloud_platform, @owners, @custom_tags, @added_by)`).run(nullify(repo));
    return repo;
  }

  async updateRepo(id: string, partial: Partial<RepoRow>): Promise<RepoRow | null> {
    const existing = await this.getRepoById(id);
    if (!existing) return null;
    const sets = Object.keys(partial).map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE repos SET ${sets} WHERE id = @id`).run({ ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteRepo(id: string): Promise<void> {
    this.db.prepare('DELETE FROM repos WHERE id = ?').run(id);
  }

  // ─── Settings ───────────────────────────────────────────────────────────────

  async getSettings(userId?: string): Promise<SettingsRow | null> {
    if (userId) {
      return (this.db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId) as SettingsRow) ?? null;
    }
    return (this.db.prepare('SELECT * FROM settings WHERE user_id IS NULL').get() as SettingsRow) ?? null;
  }

  async upsertSettings(settings: SettingsRow): Promise<SettingsRow> {
    this.db.prepare(`INSERT OR REPLACE INTO settings (id, user_id, ai_config, otel_config, github_config, ado_config, theme, dashboard_widgets)
      VALUES (@id, @user_id, @ai_config, @otel_config, @github_config, @ado_config, @theme, @dashboard_widgets)`).run(nullify(settings));
    return settings;
  }

  // ─── Bookmarks ──────────────────────────────────────────────────────────────

  async getBookmarks(userId: string): Promise<BookmarkRow[]> {
    return this.db.prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC').all(userId) as BookmarkRow[];
  }

  async createBookmark(bookmark: BookmarkRow): Promise<BookmarkRow> {
    this.db.prepare(`INSERT INTO bookmarks (id, user_id, title, url, description, favicon, screenshot, collection_id, tags, favorite, note, content_type, created_at, updated_at)
      VALUES (@id, @user_id, @title, @url, @description, @favicon, @screenshot, @collection_id, @tags, @favorite, @note, @content_type, @created_at, @updated_at)`).run(nullify(bookmark));
    return bookmark;
  }

  async updateBookmark(id: string, partial: Partial<BookmarkRow>): Promise<BookmarkRow | null> {
    const existing = this.db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as BookmarkRow | undefined;
    if (!existing) return null;
    const sets = Object.keys(partial).map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE bookmarks SET ${sets} WHERE id = @id`).run({ ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteBookmark(id: string): Promise<void> {
    this.db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  }

  // ─── Collections ────────────────────────────────────────────────────────────

  async getCollections(userId: string): Promise<CollectionRow[]> {
    return this.db.prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY name').all(userId) as CollectionRow[];
  }

  async createCollection(collection: CollectionRow): Promise<CollectionRow> {
    this.db.prepare(`INSERT INTO collections (id, user_id, name, icon, color, parent_id, created_at, updated_at)
      VALUES (@id, @user_id, @name, @icon, @color, @parent_id, @created_at, @updated_at)`).run(nullify(collection));
    return collection;
  }

  async updateCollection(id: string, partial: Partial<CollectionRow>): Promise<CollectionRow | null> {
    const existing = this.db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as CollectionRow | undefined;
    if (!existing) return null;
    const sets = Object.keys(partial).map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE collections SET ${sets} WHERE id = @id`).run({ ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteCollection(id: string): Promise<void> {
    this.db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  }

  // ─── Docs ───────────────────────────────────────────────────────────────────

  async getDocs(): Promise<DocRow[]> {
    return this.db.prepare('SELECT * FROM docs ORDER BY updated_at DESC').all() as DocRow[];
  }

  async createDoc(doc: DocRow): Promise<DocRow> {
    this.db.prepare(`INSERT INTO docs (id, title, content, source_url, tags, created_at, updated_at)
      VALUES (@id, @title, @content, @source_url, @tags, @created_at, @updated_at)`).run(nullify(doc));
    return doc;
  }

  async updateDoc(id: string, partial: Partial<DocRow>): Promise<DocRow | null> {
    const existing = this.db.prepare('SELECT * FROM docs WHERE id = ?').get(id) as DocRow | undefined;
    if (!existing) return null;
    const sets = Object.keys(partial).map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE docs SET ${sets} WHERE id = @id`).run({ ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteDoc(id: string): Promise<void> {
    this.db.prepare('DELETE FROM docs WHERE id = ?').run(id);
  }

  // ─── Plugins ────────────────────────────────────────────────────────────────

  async getPluginState(): Promise<PluginStateRow> {
    const row = this.db.prepare('SELECT * FROM plugins_state WHERE id = ?').get('singleton') as PluginStateRow | undefined;
    if (row) return row;
    const defaultState: PluginStateRow = { id: 'singleton', enabled_plugins: '{}', plugin_settings: '{}' };
    this.db.prepare('INSERT INTO plugins_state (id, enabled_plugins, plugin_settings) VALUES (@id, @enabled_plugins, @plugin_settings)').run(defaultState);
    return defaultState;
  }

  async updatePluginState(state: Partial<PluginStateRow>): Promise<PluginStateRow> {
    await this.getPluginState(); // ensure row exists
    const sets = Object.keys(state).filter(k => k !== 'id').map((k) => `${k} = @${k}`).join(', ');
    if (sets) {
      this.db.prepare(`UPDATE plugins_state SET ${sets} WHERE id = 'singleton'`).run(state);
    }
    return this.getPluginState();
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  async trackPageView(view: PageViewRow): Promise<void> {
    this.db.prepare(`INSERT INTO analytics_page_views (id, user_id, user_name, path, timestamp)
      VALUES (@id, @user_id, @user_name, @path, @timestamp)`).run(view);
  }

  async trackError(error: ErrorRow): Promise<void> {
    this.db.prepare(`INSERT INTO analytics_errors (id, user_id, user_name, message, stack, path, timestamp)
      VALUES (@id, @user_id, @user_name, @message, @stack, @path, @timestamp)`).run(nullify(error));
  }

  async getPageViews(limit = 100): Promise<PageViewRow[]> {
    return this.db.prepare('SELECT * FROM analytics_page_views ORDER BY timestamp DESC LIMIT ?').all(limit) as PageViewRow[];
  }

  async getErrors(limit = 100): Promise<ErrorRow[]> {
    return this.db.prepare('SELECT * FROM analytics_errors ORDER BY timestamp DESC LIMIT ?').all(limit) as ErrorRow[];
  }

  // ─── Federated Sources ──────────────────────────────────────────────────────
  async getFederatedSources(): Promise<FederatedSourceRow[]> {
    return this.db.prepare('SELECT * FROM federated_sources ORDER BY created_at DESC').all() as FederatedSourceRow[];
  }

  async getFederatedSourceById(id: string): Promise<FederatedSourceRow | null> {
    return (this.db.prepare('SELECT * FROM federated_sources WHERE id = ?').get(id) as FederatedSourceRow) ?? null;
  }

  async createFederatedSource(source: FederatedSourceRow): Promise<FederatedSourceRow> {
    const s = nullify(source);
    this.db.prepare(`
      INSERT INTO federated_sources (id, name, type, endpoint_url, auth_type, auth_config, result_mapping, trigger_config, sync_interval_minutes, last_synced_at, document_count, enabled, created_by, created_at, updated_at)
      VALUES (@id, @name, @type, @endpoint_url, @auth_type, @auth_config, @result_mapping, @trigger_config, @sync_interval_minutes, @last_synced_at, @document_count, @enabled, @created_by, @created_at, @updated_at)
    `).run(s);
    return source;
  }

  async updateFederatedSource(id: string, partial: Partial<FederatedSourceRow>): Promise<FederatedSourceRow | null> {
    const existing = await this.getFederatedSourceById(id);
    if (!existing) return null;
    const sets = Object.keys(partial).filter((k) => k !== 'id').map((k) => `${k} = @${k}`).join(', ');
    if (!sets) return existing;
    this.db.prepare(`UPDATE federated_sources SET ${sets} WHERE id = @id`).run(nullify({ ...partial, id }));
    return this.getFederatedSourceById(id);
  }

  async deleteFederatedSource(id: string): Promise<void> {
    this.db.prepare('DELETE FROM federated_sources WHERE id = ?').run(id);
  }

  // ─── Federated Documents ────────────────────────────────────────────────────
  async getFederatedDocuments(sourceId: string): Promise<FederatedDocumentRow[]> {
    return this.db.prepare('SELECT * FROM federated_documents WHERE source_id = ?').all(sourceId) as FederatedDocumentRow[];
  }

  async getAllFederatedDocuments(): Promise<FederatedDocumentRow[]> {
    return this.db.prepare('SELECT * FROM federated_documents').all() as FederatedDocumentRow[];
  }

  async replaceFederatedDocuments(sourceId: string, docs: FederatedDocumentRow[]): Promise<void> {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM federated_documents WHERE source_id = ?').run(sourceId);
      const insert = this.db.prepare(`
        INSERT INTO federated_documents (id, source_id, title, description, url, icon, tags, content, extra, meta, fetched_at)
        VALUES (@id, @source_id, @title, @description, @url, @icon, @tags, @content, @extra, @meta, @fetched_at)
      `);
      for (const doc of docs) { insert.run(nullify(doc)); }
    });
    tx();
  }

  async deleteFederatedDocumentsBySource(sourceId: string): Promise<void> {
    this.db.prepare('DELETE FROM federated_documents WHERE source_id = ?').run(sourceId);
  }

  // ─── Forum Threads ──────────────────────────────────────────────────────────
  async getForumThreads(): Promise<ForumThreadRow[]> {
    return this.db.prepare('SELECT * FROM forum_threads ORDER BY created_at DESC').all() as ForumThreadRow[];
  }

  async getForumThreadById(id: string): Promise<ForumThreadRow | null> {
    return (this.db.prepare('SELECT * FROM forum_threads WHERE id = ?').get(id) as ForumThreadRow) ?? null;
  }

  async createForumThread(thread: ForumThreadRow): Promise<ForumThreadRow> {
    this.db.prepare(`INSERT INTO forum_threads (id, title, body, category, tags, author_id, author_name, author_avatar_url, votes, view_count, accepted_answer_id, repo_id, repo_name, repo_source, mcp_server_id, mcp_server_name, created_at, updated_at)
      VALUES (@id, @title, @body, @category, @tags, @author_id, @author_name, @author_avatar_url, @votes, @view_count, @accepted_answer_id, @repo_id, @repo_name, @repo_source, @mcp_server_id, @mcp_server_name, @created_at, @updated_at)`).run(nullify(thread));
    return thread;
  }

  async updateForumThread(id: string, partial: Partial<ForumThreadRow>): Promise<ForumThreadRow | null> {
    const existing = await this.getForumThreadById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE forum_threads SET ${sets} WHERE id = @id`).run(nullify({ ...partial, id }));
    return { ...existing, ...partial };
  }

  async deleteForumThread(id: string): Promise<void> {
    this.db.prepare('DELETE FROM forum_threads WHERE id = ?').run(id);
  }

  // ─── Forum Answers ──────────────────────────────────────────────────────────
  async getForumAnswersByThread(threadId: string): Promise<ForumAnswerRow[]> {
    return this.db.prepare('SELECT * FROM forum_answers WHERE thread_id = ? ORDER BY created_at ASC').all(threadId) as ForumAnswerRow[];
  }

  async getAllForumAnswers(): Promise<ForumAnswerRow[]> {
    return this.db.prepare('SELECT * FROM forum_answers ORDER BY created_at ASC').all() as ForumAnswerRow[];
  }

  async createForumAnswer(answer: ForumAnswerRow): Promise<ForumAnswerRow> {
    this.db.prepare(`INSERT INTO forum_answers (id, thread_id, parent_answer_id, author_id, author_name, author_avatar_url, body, votes, is_accepted, created_at, updated_at)
      VALUES (@id, @thread_id, @parent_answer_id, @author_id, @author_name, @author_avatar_url, @body, @votes, @is_accepted, @created_at, @updated_at)`).run(nullify(answer));
    return answer;
  }

  async updateForumAnswer(id: string, partial: Partial<ForumAnswerRow>): Promise<ForumAnswerRow | null> {
    const existing = this.db.prepare('SELECT * FROM forum_answers WHERE id = ?').get(id) as ForumAnswerRow | undefined;
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE forum_answers SET ${sets} WHERE id = @id`).run(nullify({ ...partial, id }));
    return { ...existing, ...partial };
  }

  async deleteForumAnswer(id: string): Promise<void> {
    this.db.prepare('DELETE FROM forum_answers WHERE id = ?').run(id);
  }

  // ─── Feature Requests ───────────────────────────────────────────────────────
  async getFeatureRequests(): Promise<FeatureRequestRow[]> {
    return this.db.prepare('SELECT * FROM feature_requests ORDER BY created_at DESC').all() as FeatureRequestRow[];
  }

  async getFeatureRequestById(id: string): Promise<FeatureRequestRow | null> {
    return (this.db.prepare('SELECT * FROM feature_requests WHERE id = ?').get(id) as FeatureRequestRow) ?? null;
  }

  async createFeatureRequest(req: FeatureRequestRow): Promise<FeatureRequestRow> {
    this.db.prepare(`INSERT INTO feature_requests (id, title, description, author_id, author_name, author_avatar_url, status, votes, attachments, tags, created_at, updated_at)
      VALUES (@id, @title, @description, @author_id, @author_name, @author_avatar_url, @status, @votes, @attachments, @tags, @created_at, @updated_at)`).run(nullify(req));
    return req;
  }

  async updateFeatureRequest(id: string, partial: Partial<FeatureRequestRow>): Promise<FeatureRequestRow | null> {
    const existing = await this.getFeatureRequestById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE feature_requests SET ${sets} WHERE id = @id`).run(nullify({ ...partial, id }));
    return { ...existing, ...partial };
  }

  async deleteFeatureRequest(id: string): Promise<void> {
    this.db.prepare('DELETE FROM feature_requests WHERE id = ?').run(id);
  }

  // ─── APIs ───────────────────────────────────────────────────────────────────
  async getApis(): Promise<ApiRow[]> {
    return this.db.prepare('SELECT * FROM apis ORDER BY created_at DESC').all() as ApiRow[];
  }

  async getApiById(id: string): Promise<ApiRow | null> {
    return (this.db.prepare('SELECT * FROM apis WHERE id = ?').get(id) as ApiRow) ?? null;
  }

  async getApisByRepo(repoId: string): Promise<ApiRow[]> {
    return this.db.prepare('SELECT * FROM apis WHERE source_repo_id = ? ORDER BY created_at DESC').all(repoId) as ApiRow[];
  }

  async createApi(api: ApiRow): Promise<ApiRow> {
    this.db.prepare(`INSERT INTO apis (id, name, description, source_repo_id, source_repo_name, source_url, spec_kind, spec_version, spec_raw, base_url, added_by, created_at, updated_at)
      VALUES (@id, @name, @description, @source_repo_id, @source_repo_name, @source_url, @spec_kind, @spec_version, @spec_raw, @base_url, @added_by, @created_at, @updated_at)`).run(nullify(api));
    return api;
  }

  async updateApi(id: string, partial: Partial<ApiRow>): Promise<ApiRow | null> {
    const existing = await this.getApiById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE apis SET ${sets} WHERE id = @id`).run(nullify({ ...partial, id }));
    return { ...existing, ...partial };
  }

  async deleteApi(id: string): Promise<void> {
    this.db.prepare('DELETE FROM apis WHERE id = ?').run(id);
  }

  // ─── MCP Servers ──────────────────────────────────────────────────────────────
  async getMcpServers(): Promise<McpServerRow[]> {
    return this.db.prepare('SELECT * FROM mcp_servers ORDER BY created_at ASC').all() as McpServerRow[];
  }

  async getMcpServerById(id: string): Promise<McpServerRow | null> {
    return (this.db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id) as McpServerRow) ?? null;
  }

  async createMcpServer(server: McpServerRow): Promise<McpServerRow> {
    this.db.prepare(`INSERT INTO mcp_servers (id, name, description, transport, command, args, env, url, port, status, auto_start, session_strategy, call_count, capabilities, last_used, last_error, added_by, created_at, updated_at)
      VALUES (@id, @name, @description, @transport, @command, @args, @env, @url, @port, @status, @auto_start, @session_strategy, @call_count, @capabilities, @last_used, @last_error, @added_by, @created_at, @updated_at)`).run(nullify(server));
    return server;
  }

  async updateMcpServer(id: string, partial: Partial<McpServerRow>): Promise<McpServerRow | null> {
    const existing = await this.getMcpServerById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE mcp_servers SET ${sets} WHERE id = @id`).run(nullify({ ...partial, id }));
    return { ...existing, ...partial };
  }

  async deleteMcpServer(id: string): Promise<void> {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM mcp_tools WHERE server_id = ?').run(id);
      this.db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(id);
    });
    tx();
  }

  // ─── MCP Tools ────────────────────────────────────────────────────────────────
  async getMcpTools(serverId?: string): Promise<McpToolRow[]> {
    if (serverId) {
      return this.db.prepare('SELECT * FROM mcp_tools WHERE server_id = ? ORDER BY name ASC').all(serverId) as McpToolRow[];
    }
    return this.db.prepare('SELECT * FROM mcp_tools ORDER BY name ASC').all() as McpToolRow[];
  }

  async getMcpToolByName(name: string): Promise<McpToolRow | null> {
    return (this.db.prepare('SELECT * FROM mcp_tools WHERE name = ? ORDER BY created_at ASC').get(name) as McpToolRow) ?? null;
  }

  async replaceMcpTools(serverId: string, tools: McpToolRow[]): Promise<void> {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM mcp_tools WHERE server_id = ?').run(serverId);
      const insert = this.db.prepare(`INSERT INTO mcp_tools (id, server_id, name, description, input_schema, call_count, created_at, updated_at)
        VALUES (@id, @server_id, @name, @description, @input_schema, @call_count, @created_at, @updated_at)`);
      for (const tool of tools) { insert.run(nullify(tool)); }
    });
    tx();
  }

  async deleteMcpToolsByServer(serverId: string): Promise<void> {
    this.db.prepare('DELETE FROM mcp_tools WHERE server_id = ?').run(serverId);
  }

  // ─── Registry items ─────────────────────────────────────────────────────────
  async getRegistryItems(): Promise<RegistryItemRow[]> {
    return this.db.prepare('SELECT * FROM registry_items ORDER BY created_at DESC').all() as RegistryItemRow[];
  }

  async getRegistryItemById(id: string): Promise<RegistryItemRow | null> {
    return (this.db.prepare('SELECT * FROM registry_items WHERE id = ?').get(id) as RegistryItemRow) ?? null;
  }

  async getRegistryItemBySlug(slug: string): Promise<RegistryItemRow | null> {
    return (this.db.prepare('SELECT * FROM registry_items WHERE slug = ?').get(slug) as RegistryItemRow) ?? null;
  }

  async createRegistryItem(item: RegistryItemRow): Promise<RegistryItemRow> {
    this.db.prepare(`INSERT INTO registry_items (id, kind, name, slug, description, content, author_id, author_name, source, verified, visibility, category, tags, capabilities, compatibility, status, votes, install_count, latest_version, reviewed_by, rejection_reason, created_at, updated_at)
      VALUES (@id, @kind, @name, @slug, @description, @content, @author_id, @author_name, @source, @verified, @visibility, @category, @tags, @capabilities, @compatibility, @status, @votes, @install_count, @latest_version, @reviewed_by, @rejection_reason, @created_at, @updated_at)`).run(nullify(item));
    return item;
  }

  async updateRegistryItem(id: string, partial: Partial<RegistryItemRow>): Promise<RegistryItemRow | null> {
    const existing = await this.getRegistryItemById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE registry_items SET ${sets} WHERE id = @id`).run(nullify({ ...partial, id }));
    return { ...existing, ...partial };
  }

  async deleteRegistryItem(id: string): Promise<void> {
    this.db.prepare('DELETE FROM registry_items WHERE id = ?').run(id);
  }

  async incrementRegistryInstallCount(id: string, delta: number): Promise<void> {
    this.db.prepare('UPDATE registry_items SET install_count = MAX(0, install_count + ?) WHERE id = ?').run(delta, id);
  }

  // ─── Registry versions ────────────────────────────────────────────────────────
  async getRegistryVersions(itemId: string): Promise<RegistryVersionRow[]> {
    return this.db.prepare('SELECT * FROM registry_versions WHERE item_id = ? ORDER BY created_at DESC').all(itemId) as RegistryVersionRow[];
  }

  async createRegistryVersion(version: RegistryVersionRow): Promise<RegistryVersionRow> {
    this.db.prepare(`INSERT INTO registry_versions (id, item_id, version, content, changelog, created_at)
      VALUES (@id, @item_id, @version, @content, @changelog, @created_at)`).run(nullify(version));
    return version;
  }

  // ─── Registry installs ──────────────────────────────────────────────────────
  async getRegistryInstalls(userId: string): Promise<RegistryInstallRow[]> {
    return this.db.prepare('SELECT * FROM registry_installs WHERE user_id = ? ORDER BY installed_at DESC').all(userId) as RegistryInstallRow[];
  }

  async getRegistryInstall(itemId: string, userId: string): Promise<RegistryInstallRow | null> {
    return (this.db.prepare('SELECT * FROM registry_installs WHERE item_id = ? AND user_id = ?').get(itemId, userId) as RegistryInstallRow) ?? null;
  }

  async createRegistryInstall(install: RegistryInstallRow): Promise<RegistryInstallRow> {
    this.db.prepare(`INSERT INTO registry_installs (id, item_id, user_id, installed_at, last_used, use_count)
      VALUES (@id, @item_id, @user_id, @installed_at, @last_used, @use_count)`).run(nullify(install));
    return install;
  }

  async updateRegistryInstall(id: string, partial: Partial<RegistryInstallRow>): Promise<RegistryInstallRow | null> {
    const existing = (this.db.prepare('SELECT * FROM registry_installs WHERE id = ?').get(id) as RegistryInstallRow) ?? null;
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    this.db.prepare(`UPDATE registry_installs SET ${sets} WHERE id = @id`).run(nullify({ ...partial, id }));
    return { ...existing, ...partial };
  }

  async deleteRegistryInstall(itemId: string, userId: string): Promise<void> {
    this.db.prepare('DELETE FROM registry_installs WHERE item_id = ? AND user_id = ?').run(itemId, userId);
  }
}

// Convert undefined values to null for better-sqlite3 compatibility
function nullify<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (result[key] === undefined) {
      (result as Record<string, unknown>)[key] = null;
    }
  }
  return result;
}
