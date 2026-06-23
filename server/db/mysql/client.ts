import mysql from 'mysql2/promise';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  DatabaseProvider, UserRow, RepoRow, SettingsRow,
  BookmarkRow, CollectionRow, DocRow, PluginStateRow,
  PageViewRow, ErrorRow, FederatedSourceRow, FederatedDocumentRow,
  ForumThreadRow, ForumAnswerRow, FeatureRequestRow, ApiRow,
  McpServerRow, McpToolRow,
} from '../provider.js';
import { namedParams, mapRow, mapRows } from './sql.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface MysqlOptions {
  ssl?: boolean;
}

export class MysqlProvider implements DatabaseProvider {
  private pool!: mysql.Pool;

  constructor(private connectionString: string, private options: MysqlOptions = {}) {
    if (!connectionString) {
      throw new Error(
        'MySQL connection string required. Set DEVDOCK_MYSQL_URL or configure in devdock.config.json'
      );
    }
  }

  async connect(): Promise<void> {
    this.pool = mysql.createPool({
      uri: this.connectionString,
      connectionLimit: 10,
      idleTimeout: 30_000,
      charset: 'utf8mb4',
      // Most managed MySQL (RDS, PlanetScale legacy, etc.) require SSL but
      // present self-signed CAs. Same posture as the PG provider.
      ssl: this.options.ssl ? { rejectUnauthorized: false } : undefined,
      // mysql2 returns DECIMAL/BIGINT as strings by default for safety; we
      // don't use either type, so this is informational.
    });
    // Fail fast if the connection string is wrong.
    await this.pool.query('SELECT 1');
    console.log('Connected to MySQL');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async migrate(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT name FROM _migrations');
    const applied = new Set(rows.map((r) => (r as { name: string }).name));

    const migrationsDir = resolve(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const raw = readFileSync(resolve(migrationsDir, file), 'utf-8');
      // mysql2 doesn't allow multiple statements per query() call without
      // `multipleStatements: true` (which we avoid for safety), so we split.
      // Strip line comments first — otherwise a leading `-- header` causes the
      // following CREATE to be filtered as a comment-only statement.
      const stmts = raw
        .split('\n')
        .map((line) => line.replace(/--.*$/, ''))
        .join('\n')
        .split(/;\s*$/m)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const conn = await this.pool.getConnection();
      try {
        await conn.beginTransaction();
        for (const stmt of stmts) {
          await conn.query(stmt);
        }
        await conn.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
        await conn.commit();
        console.log(`  Applied migration: ${file}`);
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
  }

  // Internal helper for `@name`-style SQL.
  private async query<T = mysql.RowDataPacket>(
    sql: string,
    params: Record<string, unknown> = {}
  ): Promise<T[]> {
    const { text, values } = namedParams(sql, params);
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(text, values);
    return rows as unknown as T[];
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  async getUsers(): Promise<UserRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM users ORDER BY created_at DESC');
    return mapRows<UserRow>(rows, 'users');
  }

  async getUserById(id: string): Promise<UserRow | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id]);
    return mapRow<UserRow>(rows[0], 'users');
  }

  async getUserByUsername(username: string): Promise<UserRow | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE username = ?', [username]);
    return mapRow<UserRow>(rows[0], 'users');
  }

  async createUser(user: UserRow): Promise<UserRow> {
    await this.query(
      `INSERT INTO users (id, username, password_hash, display_name, email, avatar_url, role, permissions, dashboard_widgets, favorite_repos, preferences, created_at, last_login)
       VALUES (@id, @username, @password_hash, @display_name, @email, @avatar_url, @role, @permissions, @dashboard_widgets, @favorite_repos, @preferences, @created_at, @last_login)`,
      user as unknown as Record<string, unknown>
    );
    return user;
  }

  async updateUser(id: string, partial: Partial<UserRow>): Promise<UserRow | null> {
    const existing = await this.getUserById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE users SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteUser(id: string): Promise<void> {
    await this.pool.query('DELETE FROM users WHERE id = ?', [id]);
  }

  // ─── Repos ──────────────────────────────────────────────────────────────────

  async getRepos(source?: string): Promise<RepoRow[]> {
    // MySQL has no NULLS LAST clause — handle via two-key sort instead.
    const [rows] = source
      ? await this.pool.query<mysql.RowDataPacket[]>(
          'SELECT * FROM repos WHERE source = ? ORDER BY (updated_at IS NULL), updated_at DESC',
          [source]
        )
      : await this.pool.query<mysql.RowDataPacket[]>(
          'SELECT * FROM repos ORDER BY (updated_at IS NULL), updated_at DESC'
        );
    return mapRows<RepoRow>(rows, 'repos');
  }

  async getRepoById(id: string): Promise<RepoRow | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM repos WHERE id = ?', [id]);
    return mapRow<RepoRow>(rows[0], 'repos');
  }

  async upsertRepo(repo: RepoRow): Promise<RepoRow> {
    // MySQL 8.0.20+ alias form (avoids deprecated VALUES(col) syntax).
    await this.query(
      `INSERT INTO repos (id, name, full_name, description, source, language, default_branch, stars, forks, is_private, updated_at, clone_url, web_url, topics, environments, cloud_platform, owners, custom_tags, added_by)
       VALUES (@id, @name, @full_name, @description, @source, @language, @default_branch, @stars, @forks, @is_private, @updated_at, @clone_url, @web_url, @topics, @environments, @cloud_platform, @owners, @custom_tags, @added_by) AS new
       ON DUPLICATE KEY UPDATE
         name = new.name,
         full_name = new.full_name,
         description = new.description,
         source = new.source,
         language = new.language,
         default_branch = new.default_branch,
         stars = new.stars,
         forks = new.forks,
         is_private = new.is_private,
         updated_at = new.updated_at,
         clone_url = new.clone_url,
         web_url = new.web_url,
         topics = new.topics,
         environments = new.environments,
         cloud_platform = new.cloud_platform,
         owners = new.owners,
         custom_tags = new.custom_tags,
         added_by = new.added_by`,
      repo as unknown as Record<string, unknown>
    );
    return repo;
  }

  async updateRepo(id: string, partial: Partial<RepoRow>): Promise<RepoRow | null> {
    const existing = await this.getRepoById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE repos SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteRepo(id: string): Promise<void> {
    await this.pool.query('DELETE FROM repos WHERE id = ?', [id]);
  }

  // ─── Settings ───────────────────────────────────────────────────────────────

  async getSettings(userId?: string): Promise<SettingsRow | null> {
    const [rows] = userId
      ? await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM settings WHERE user_id = ?', [userId])
      : await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM settings WHERE user_id IS NULL');
    return mapRow<SettingsRow>(rows[0], 'settings');
  }

  async upsertSettings(settings: SettingsRow): Promise<SettingsRow> {
    await this.query(
      `INSERT INTO settings (id, user_id, ai_config, otel_config, github_config, ado_config, theme, dashboard_widgets)
       VALUES (@id, @user_id, @ai_config, @otel_config, @github_config, @ado_config, @theme, @dashboard_widgets) AS new
       ON DUPLICATE KEY UPDATE
         user_id = new.user_id,
         ai_config = new.ai_config,
         otel_config = new.otel_config,
         github_config = new.github_config,
         ado_config = new.ado_config,
         theme = new.theme,
         dashboard_widgets = new.dashboard_widgets`,
      settings as unknown as Record<string, unknown>
    );
    return settings;
  }

  // ─── Bookmarks ──────────────────────────────────────────────────────────────

  async getBookmarks(userId: string): Promise<BookmarkRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return mapRows<BookmarkRow>(rows, 'bookmarks');
  }

  async createBookmark(bookmark: BookmarkRow): Promise<BookmarkRow> {
    await this.query(
      `INSERT INTO bookmarks (id, user_id, title, url, description, favicon, screenshot, collection_id, tags, favorite, note, content_type, created_at, updated_at)
       VALUES (@id, @user_id, @title, @url, @description, @favicon, @screenshot, @collection_id, @tags, @favorite, @note, @content_type, @created_at, @updated_at)`,
      bookmark as unknown as Record<string, unknown>
    );
    return bookmark;
  }

  async updateBookmark(id: string, partial: Partial<BookmarkRow>): Promise<BookmarkRow | null> {
    const [existingRows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM bookmarks WHERE id = ?', [id]);
    const existing = mapRow<BookmarkRow>(existingRows[0], 'bookmarks');
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE bookmarks SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.pool.query('DELETE FROM bookmarks WHERE id = ?', [id]);
  }

  // ─── Collections ────────────────────────────────────────────────────────────

  async getCollections(userId: string): Promise<CollectionRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM collections WHERE user_id = ? ORDER BY name',
      [userId]
    );
    return mapRows<CollectionRow>(rows, 'collections');
  }

  async createCollection(collection: CollectionRow): Promise<CollectionRow> {
    await this.query(
      `INSERT INTO collections (id, user_id, name, icon, color, parent_id, created_at, updated_at)
       VALUES (@id, @user_id, @name, @icon, @color, @parent_id, @created_at, @updated_at)`,
      collection as unknown as Record<string, unknown>
    );
    return collection;
  }

  async updateCollection(id: string, partial: Partial<CollectionRow>): Promise<CollectionRow | null> {
    const [existingRows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM collections WHERE id = ?', [id]);
    const existing = mapRow<CollectionRow>(existingRows[0], 'collections');
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE collections SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteCollection(id: string): Promise<void> {
    await this.pool.query('DELETE FROM collections WHERE id = ?', [id]);
  }

  // ─── Docs ───────────────────────────────────────────────────────────────────

  async getDocs(): Promise<DocRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM docs ORDER BY updated_at DESC');
    return mapRows<DocRow>(rows, 'docs');
  }

  async createDoc(doc: DocRow): Promise<DocRow> {
    await this.query(
      `INSERT INTO docs (id, title, content, source_url, tags, created_at, updated_at)
       VALUES (@id, @title, @content, @source_url, @tags, @created_at, @updated_at)`,
      doc as unknown as Record<string, unknown>
    );
    return doc;
  }

  async updateDoc(id: string, partial: Partial<DocRow>): Promise<DocRow | null> {
    const [existingRows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM docs WHERE id = ?', [id]);
    const existing = mapRow<DocRow>(existingRows[0], 'docs');
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE docs SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteDoc(id: string): Promise<void> {
    await this.pool.query('DELETE FROM docs WHERE id = ?', [id]);
  }

  // ─── Plugins ────────────────────────────────────────────────────────────────

  async getPluginState(): Promise<PluginStateRow> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>("SELECT * FROM plugins_state WHERE id = 'singleton'");
    const existing = mapRow<PluginStateRow>(rows[0], 'plugins_state');
    if (existing) return existing;
    const defaultState: PluginStateRow = { id: 'singleton', enabled_plugins: '{}', plugin_settings: '{}' };
    await this.query(
      `INSERT INTO plugins_state (id, enabled_plugins, plugin_settings)
       VALUES (@id, @enabled_plugins, @plugin_settings)`,
      defaultState as unknown as Record<string, unknown>
    );
    return defaultState;
  }

  async updatePluginState(state: Partial<PluginStateRow>): Promise<PluginStateRow> {
    await this.getPluginState(); // ensure row exists
    const keys = Object.keys(state).filter((k) => k !== 'id');
    if (keys.length > 0) {
      const sets = keys.map((k) => `${k} = @${k}`).join(', ');
      await this.query(`UPDATE plugins_state SET ${sets} WHERE id = 'singleton'`, state as Record<string, unknown>);
    }
    return this.getPluginState();
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  async trackPageView(view: PageViewRow): Promise<void> {
    await this.query(
      `INSERT INTO analytics_page_views (id, user_id, user_name, path, timestamp)
       VALUES (@id, @user_id, @user_name, @path, @timestamp)`,
      view as unknown as Record<string, unknown>
    );
  }

  async trackError(error: ErrorRow): Promise<void> {
    await this.query(
      `INSERT INTO analytics_errors (id, user_id, user_name, message, stack, path, timestamp)
       VALUES (@id, @user_id, @user_name, @message, @stack, @path, @timestamp)`,
      error as unknown as Record<string, unknown>
    );
  }

  async getPageViews(limit = 100): Promise<PageViewRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM analytics_page_views ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
    return mapRows<PageViewRow>(rows, 'analytics_page_views');
  }

  async getErrors(limit = 100): Promise<ErrorRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM analytics_errors ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
    return mapRows<ErrorRow>(rows, 'analytics_errors');
  }

  // ─── Federated Sources ──────────────────────────────────────────────────────

  async getFederatedSources(): Promise<FederatedSourceRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM federated_sources ORDER BY created_at DESC');
    return mapRows<FederatedSourceRow>(rows, 'federated_sources');
  }

  async getFederatedSourceById(id: string): Promise<FederatedSourceRow | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM federated_sources WHERE id = ?', [id]);
    return mapRow<FederatedSourceRow>(rows[0], 'federated_sources');
  }

  async createFederatedSource(source: FederatedSourceRow): Promise<FederatedSourceRow> {
    await this.query(
      `INSERT INTO federated_sources (id, name, type, endpoint_url, auth_type, auth_config, result_mapping, trigger_config, sync_interval_minutes, last_synced_at, document_count, enabled, created_by, created_at, updated_at)
       VALUES (@id, @name, @type, @endpoint_url, @auth_type, @auth_config, @result_mapping, @trigger_config, @sync_interval_minutes, @last_synced_at, @document_count, @enabled, @created_by, @created_at, @updated_at)`,
      source as unknown as Record<string, unknown>
    );
    return source;
  }

  async updateFederatedSource(id: string, partial: Partial<FederatedSourceRow>): Promise<FederatedSourceRow | null> {
    const existing = await this.getFederatedSourceById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE federated_sources SET ${sets} WHERE id = @id`, { ...partial, id });
    return this.getFederatedSourceById(id);
  }

  async deleteFederatedSource(id: string): Promise<void> {
    await this.pool.query('DELETE FROM federated_sources WHERE id = ?', [id]);
  }

  // ─── Federated Documents ────────────────────────────────────────────────────

  async getFederatedDocuments(sourceId: string): Promise<FederatedDocumentRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM federated_documents WHERE source_id = ?',
      [sourceId]
    );
    return mapRows<FederatedDocumentRow>(rows, 'federated_documents');
  }

  async getAllFederatedDocuments(): Promise<FederatedDocumentRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM federated_documents');
    return mapRows<FederatedDocumentRow>(rows, 'federated_documents');
  }

  async replaceFederatedDocuments(sourceId: string, docs: FederatedDocumentRow[]): Promise<void> {
    // One transaction: wipe then re-insert. Releasing the conn in `finally`
    // is critical — leaking would exhaust the pool.
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM federated_documents WHERE source_id = ?', [sourceId]);
      for (const doc of docs) {
        const { text, values } = namedParams(
          `INSERT INTO federated_documents (id, source_id, title, description, url, icon, tags, content, extra, meta, fetched_at)
           VALUES (@id, @source_id, @title, @description, @url, @icon, @tags, @content, @extra, @meta, @fetched_at)`,
          doc as unknown as Record<string, unknown>
        );
        await conn.query(text, values);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async deleteFederatedDocumentsBySource(sourceId: string): Promise<void> {
    await this.pool.query('DELETE FROM federated_documents WHERE source_id = ?', [sourceId]);
  }

  // ─── Forum Threads ──────────────────────────────────────────────────────────

  async getForumThreads(): Promise<ForumThreadRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM forum_threads ORDER BY created_at DESC');
    return mapRows<ForumThreadRow>(rows, 'forum_threads');
  }

  async getForumThreadById(id: string): Promise<ForumThreadRow | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM forum_threads WHERE id = ?', [id]);
    return mapRow<ForumThreadRow>(rows[0], 'forum_threads');
  }

  async createForumThread(thread: ForumThreadRow): Promise<ForumThreadRow> {
    await this.query(
      `INSERT INTO forum_threads (id, title, body, category, tags, author_id, author_name, author_avatar_url, votes, view_count, accepted_answer_id, repo_id, repo_name, repo_source, mcp_server_id, mcp_server_name, created_at, updated_at)
       VALUES (@id, @title, @body, @category, @tags, @author_id, @author_name, @author_avatar_url, @votes, @view_count, @accepted_answer_id, @repo_id, @repo_name, @repo_source, @mcp_server_id, @mcp_server_name, @created_at, @updated_at)`,
      thread as unknown as Record<string, unknown>
    );
    return thread;
  }

  async updateForumThread(id: string, partial: Partial<ForumThreadRow>): Promise<ForumThreadRow | null> {
    const existing = await this.getForumThreadById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE forum_threads SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteForumThread(id: string): Promise<void> {
    await this.pool.query('DELETE FROM forum_threads WHERE id = ?', [id]);
  }

  // ─── Forum Answers ──────────────────────────────────────────────────────────

  async getForumAnswersByThread(threadId: string): Promise<ForumAnswerRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM forum_answers WHERE thread_id = ? ORDER BY created_at ASC',
      [threadId]
    );
    return mapRows<ForumAnswerRow>(rows, 'forum_answers');
  }

  async getAllForumAnswers(): Promise<ForumAnswerRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM forum_answers ORDER BY created_at ASC');
    return mapRows<ForumAnswerRow>(rows, 'forum_answers');
  }

  async createForumAnswer(answer: ForumAnswerRow): Promise<ForumAnswerRow> {
    await this.query(
      `INSERT INTO forum_answers (id, thread_id, parent_answer_id, author_id, author_name, author_avatar_url, body, votes, is_accepted, created_at, updated_at)
       VALUES (@id, @thread_id, @parent_answer_id, @author_id, @author_name, @author_avatar_url, @body, @votes, @is_accepted, @created_at, @updated_at)`,
      answer as unknown as Record<string, unknown>
    );
    return answer;
  }

  async updateForumAnswer(id: string, partial: Partial<ForumAnswerRow>): Promise<ForumAnswerRow | null> {
    const [existingRows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM forum_answers WHERE id = ?', [id]);
    const existing = mapRow<ForumAnswerRow>(existingRows[0], 'forum_answers');
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE forum_answers SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteForumAnswer(id: string): Promise<void> {
    await this.pool.query('DELETE FROM forum_answers WHERE id = ?', [id]);
  }

  // ─── Feature Requests ───────────────────────────────────────────────────────

  async getFeatureRequests(): Promise<FeatureRequestRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM feature_requests ORDER BY created_at DESC');
    return mapRows<FeatureRequestRow>(rows, 'feature_requests');
  }

  async getFeatureRequestById(id: string): Promise<FeatureRequestRow | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM feature_requests WHERE id = ?', [id]);
    return mapRow<FeatureRequestRow>(rows[0], 'feature_requests');
  }

  async createFeatureRequest(req: FeatureRequestRow): Promise<FeatureRequestRow> {
    await this.query(
      `INSERT INTO feature_requests (id, title, description, author_id, author_name, author_avatar_url, status, votes, attachments, tags, created_at, updated_at)
       VALUES (@id, @title, @description, @author_id, @author_name, @author_avatar_url, @status, @votes, @attachments, @tags, @created_at, @updated_at)`,
      req as unknown as Record<string, unknown>
    );
    return req;
  }

  async updateFeatureRequest(id: string, partial: Partial<FeatureRequestRow>): Promise<FeatureRequestRow | null> {
    const existing = await this.getFeatureRequestById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE feature_requests SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteFeatureRequest(id: string): Promise<void> {
    await this.pool.query('DELETE FROM feature_requests WHERE id = ?', [id]);
  }

  // ─── APIs ───────────────────────────────────────────────────────────────────

  async getApis(): Promise<ApiRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM apis ORDER BY created_at DESC');
    return mapRows<ApiRow>(rows, 'apis');
  }

  async getApiById(id: string): Promise<ApiRow | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM apis WHERE id = ?', [id]);
    return mapRow<ApiRow>(rows[0], 'apis');
  }

  async getApisByRepo(repoId: string): Promise<ApiRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM apis WHERE source_repo_id = ? ORDER BY created_at DESC',
      [repoId]
    );
    return mapRows<ApiRow>(rows, 'apis');
  }

  async createApi(api: ApiRow): Promise<ApiRow> {
    await this.query(
      `INSERT INTO apis (id, name, description, source_repo_id, source_repo_name, source_url, spec_kind, spec_version, spec_raw, base_url, added_by, created_at, updated_at)
       VALUES (@id, @name, @description, @source_repo_id, @source_repo_name, @source_url, @spec_kind, @spec_version, @spec_raw, @base_url, @added_by, @created_at, @updated_at)`,
      api as unknown as Record<string, unknown>
    );
    return api;
  }

  async updateApi(id: string, partial: Partial<ApiRow>): Promise<ApiRow | null> {
    const existing = await this.getApiById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE apis SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteApi(id: string): Promise<void> {
    await this.pool.query('DELETE FROM apis WHERE id = ?', [id]);
  }

  // ─── MCP Servers ──────────────────────────────────────────────────────────────
  async getMcpServers(): Promise<McpServerRow[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM mcp_servers ORDER BY created_at ASC');
    return mapRows<McpServerRow>(rows, 'mcp_servers');
  }

  async getMcpServerById(id: string): Promise<McpServerRow | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM mcp_servers WHERE id = ?', [id]);
    return mapRow<McpServerRow>(rows[0], 'mcp_servers');
  }

  async createMcpServer(server: McpServerRow): Promise<McpServerRow> {
    await this.query(
      `INSERT INTO mcp_servers (id, name, description, transport, command, args, env, url, port, status, auto_start, session_strategy, call_count, capabilities, last_used, last_error, added_by, created_at, updated_at)
       VALUES (@id, @name, @description, @transport, @command, @args, @env, @url, @port, @status, @auto_start, @session_strategy, @call_count, @capabilities, @last_used, @last_error, @added_by, @created_at, @updated_at)`,
      server as unknown as Record<string, unknown>
    );
    return server;
  }

  async updateMcpServer(id: string, partial: Partial<McpServerRow>): Promise<McpServerRow | null> {
    const existing = await this.getMcpServerById(id);
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE mcp_servers SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteMcpServer(id: string): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM mcp_tools WHERE server_id = ?', [id]);
      await conn.query('DELETE FROM mcp_servers WHERE id = ?', [id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ─── MCP Tools ────────────────────────────────────────────────────────────────
  async getMcpTools(serverId?: string): Promise<McpToolRow[]> {
    const [rows] = serverId
      ? await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM mcp_tools WHERE server_id = ? ORDER BY name ASC', [serverId])
      : await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM mcp_tools ORDER BY name ASC');
    return mapRows<McpToolRow>(rows, 'mcp_tools');
  }

  async getMcpToolByName(name: string): Promise<McpToolRow | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM mcp_tools WHERE name = ? ORDER BY created_at ASC LIMIT 1', [name]);
    return mapRow<McpToolRow>(rows[0], 'mcp_tools');
  }

  async replaceMcpTools(serverId: string, tools: McpToolRow[]): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM mcp_tools WHERE server_id = ?', [serverId]);
      for (const tool of tools) {
        const { text, values } = namedParams(
          `INSERT INTO mcp_tools (id, server_id, name, description, input_schema, call_count, created_at, updated_at)
           VALUES (@id, @server_id, @name, @description, @input_schema, @call_count, @created_at, @updated_at)`,
          tool as unknown as Record<string, unknown>
        );
        await conn.query(text, values);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async deleteMcpToolsByServer(serverId: string): Promise<void> {
    await this.pool.query('DELETE FROM mcp_tools WHERE server_id = ?', [serverId]);
  }
}
