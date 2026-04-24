import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  DatabaseProvider, UserRow, RepoRow, SettingsRow,
  BookmarkRow, CollectionRow, DocRow, PluginStateRow,
  PageViewRow, ErrorRow, FederatedSourceRow, FederatedDocumentRow,
} from '../provider.js';
import { namedParams, mapRow, mapRows } from './sql.js';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

export interface PostgresOptions {
  ssl?: boolean;
}

export class PostgresProvider implements DatabaseProvider {
  private pool!: pg.Pool;

  constructor(private connectionString: string, private options: PostgresOptions = {}) {
    if (!connectionString) {
      throw new Error(
        'PostgreSQL connection string required. Set DEVDOCK_POSTGRES_URL or configure in devdock.config.json'
      );
    }
  }

  async connect(): Promise<void> {
    this.pool = new Pool({
      connectionString: this.connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      // Most managed Postgres (RDS, Neon, Supabase) require SSL but reject
      // self-signed CAs. We accept the cert without verifying — same posture
      // most Node Postgres clients use unless you configure a CA bundle.
      ssl: this.options.ssl ? { rejectUnauthorized: false } : undefined,
    });
    // Fail fast if credentials/host are wrong rather than crashing on first query.
    await this.pool.query('SELECT 1');
    console.log('Connected to PostgreSQL');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async migrate(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    const { rows } = await this.pool.query<{ name: string }>('SELECT name FROM _migrations');
    const applied = new Set(rows.map((r) => r.name));

    const migrationsDir = resolve(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(resolve(migrationsDir, file), 'utf-8');
      // Apply the file body and the ledger insert in one transaction so a
      // partial failure does not leave a migration marked applied.
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  Applied migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  }

  // Internal helper: run a `@name`-style SQL statement and return rows.
  private async query<T = Record<string, unknown>>(
    sql: string,
    params: Record<string, unknown> = {}
  ): Promise<T[]> {
    const { text, values } = namedParams(sql, params);
    const { rows } = await this.pool.query(text, values);
    return rows as T[];
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  async getUsers(): Promise<UserRow[]> {
    const { rows } = await this.pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return mapRows<UserRow>(rows, 'users');
  }

  async getUserById(id: string): Promise<UserRow | null> {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return mapRow<UserRow>(rows[0], 'users');
  }

  async getUserByUsername(username: string): Promise<UserRow | null> {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE username = $1', [username]);
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
    await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
  }

  // ─── Repos ──────────────────────────────────────────────────────────────────

  async getRepos(source?: string): Promise<RepoRow[]> {
    const { rows } = source
      ? await this.pool.query('SELECT * FROM repos WHERE source = $1 ORDER BY updated_at DESC NULLS LAST', [source])
      : await this.pool.query('SELECT * FROM repos ORDER BY updated_at DESC NULLS LAST');
    return mapRows<RepoRow>(rows, 'repos');
  }

  async getRepoById(id: string): Promise<RepoRow | null> {
    const { rows } = await this.pool.query('SELECT * FROM repos WHERE id = $1', [id]);
    return mapRow<RepoRow>(rows[0], 'repos');
  }

  async upsertRepo(repo: RepoRow): Promise<RepoRow> {
    await this.query(
      `INSERT INTO repos (id, name, full_name, description, source, language, default_branch, stars, forks, is_private, updated_at, clone_url, web_url, topics, environments, cloud_platform, owners, custom_tags, added_by)
       VALUES (@id, @name, @full_name, @description, @source, @language, @default_branch, @stars, @forks, @is_private, @updated_at, @clone_url, @web_url, @topics, @environments, @cloud_platform, @owners, @custom_tags, @added_by)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         full_name = EXCLUDED.full_name,
         description = EXCLUDED.description,
         source = EXCLUDED.source,
         language = EXCLUDED.language,
         default_branch = EXCLUDED.default_branch,
         stars = EXCLUDED.stars,
         forks = EXCLUDED.forks,
         is_private = EXCLUDED.is_private,
         updated_at = EXCLUDED.updated_at,
         clone_url = EXCLUDED.clone_url,
         web_url = EXCLUDED.web_url,
         topics = EXCLUDED.topics,
         environments = EXCLUDED.environments,
         cloud_platform = EXCLUDED.cloud_platform,
         owners = EXCLUDED.owners,
         custom_tags = EXCLUDED.custom_tags,
         added_by = EXCLUDED.added_by`,
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
    await this.pool.query('DELETE FROM repos WHERE id = $1', [id]);
  }

  // ─── Settings ───────────────────────────────────────────────────────────────

  async getSettings(userId?: string): Promise<SettingsRow | null> {
    const { rows } = userId
      ? await this.pool.query('SELECT * FROM settings WHERE user_id = $1', [userId])
      : await this.pool.query('SELECT * FROM settings WHERE user_id IS NULL');
    return mapRow<SettingsRow>(rows[0], 'settings');
  }

  async upsertSettings(settings: SettingsRow): Promise<SettingsRow> {
    await this.query(
      `INSERT INTO settings (id, user_id, ai_config, otel_config, github_config, ado_config, theme, dashboard_widgets)
       VALUES (@id, @user_id, @ai_config, @otel_config, @github_config, @ado_config, @theme, @dashboard_widgets)
       ON CONFLICT (id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         ai_config = EXCLUDED.ai_config,
         otel_config = EXCLUDED.otel_config,
         github_config = EXCLUDED.github_config,
         ado_config = EXCLUDED.ado_config,
         theme = EXCLUDED.theme,
         dashboard_widgets = EXCLUDED.dashboard_widgets`,
      settings as unknown as Record<string, unknown>
    );
    return settings;
  }

  // ─── Bookmarks ──────────────────────────────────────────────────────────────

  async getBookmarks(userId: string): Promise<BookmarkRow[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
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
    const { rows: existingRows } = await this.pool.query('SELECT * FROM bookmarks WHERE id = $1', [id]);
    const existing = mapRow<BookmarkRow>(existingRows[0], 'bookmarks');
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE bookmarks SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.pool.query('DELETE FROM bookmarks WHERE id = $1', [id]);
  }

  // ─── Collections ────────────────────────────────────────────────────────────

  async getCollections(userId: string): Promise<CollectionRow[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM collections WHERE user_id = $1 ORDER BY name',
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
    const { rows: existingRows } = await this.pool.query('SELECT * FROM collections WHERE id = $1', [id]);
    const existing = mapRow<CollectionRow>(existingRows[0], 'collections');
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE collections SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteCollection(id: string): Promise<void> {
    await this.pool.query('DELETE FROM collections WHERE id = $1', [id]);
  }

  // ─── Docs ───────────────────────────────────────────────────────────────────

  async getDocs(): Promise<DocRow[]> {
    const { rows } = await this.pool.query('SELECT * FROM docs ORDER BY updated_at DESC');
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
    const { rows: existingRows } = await this.pool.query('SELECT * FROM docs WHERE id = $1', [id]);
    const existing = mapRow<DocRow>(existingRows[0], 'docs');
    if (!existing) return null;
    const keys = Object.keys(partial).filter((k) => k !== 'id');
    if (keys.length === 0) return existing;
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    await this.query(`UPDATE docs SET ${sets} WHERE id = @id`, { ...partial, id });
    return { ...existing, ...partial };
  }

  async deleteDoc(id: string): Promise<void> {
    await this.pool.query('DELETE FROM docs WHERE id = $1', [id]);
  }

  // ─── Plugins ────────────────────────────────────────────────────────────────

  async getPluginState(): Promise<PluginStateRow> {
    const { rows } = await this.pool.query("SELECT * FROM plugins_state WHERE id = 'singleton'");
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
    const { rows } = await this.pool.query(
      'SELECT * FROM analytics_page_views ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    return mapRows<PageViewRow>(rows, 'analytics_page_views');
  }

  async getErrors(limit = 100): Promise<ErrorRow[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM analytics_errors ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    return mapRows<ErrorRow>(rows, 'analytics_errors');
  }

  // ─── Federated Sources ──────────────────────────────────────────────────────

  async getFederatedSources(): Promise<FederatedSourceRow[]> {
    const { rows } = await this.pool.query('SELECT * FROM federated_sources ORDER BY created_at DESC');
    return mapRows<FederatedSourceRow>(rows, 'federated_sources');
  }

  async getFederatedSourceById(id: string): Promise<FederatedSourceRow | null> {
    const { rows } = await this.pool.query('SELECT * FROM federated_sources WHERE id = $1', [id]);
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
    await this.pool.query('DELETE FROM federated_sources WHERE id = $1', [id]);
  }

  // ─── Federated Documents ────────────────────────────────────────────────────

  async getFederatedDocuments(sourceId: string): Promise<FederatedDocumentRow[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM federated_documents WHERE source_id = $1',
      [sourceId]
    );
    return mapRows<FederatedDocumentRow>(rows, 'federated_documents');
  }

  async getAllFederatedDocuments(): Promise<FederatedDocumentRow[]> {
    const { rows } = await this.pool.query('SELECT * FROM federated_documents');
    return mapRows<FederatedDocumentRow>(rows, 'federated_documents');
  }

  async replaceFederatedDocuments(sourceId: string, docs: FederatedDocumentRow[]): Promise<void> {
    // One transaction: wipe the source's docs then re-insert. Releasing the
    // client in `finally` is critical — leaking it would exhaust the pool.
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM federated_documents WHERE source_id = $1', [sourceId]);
      for (const doc of docs) {
        const { text, values } = namedParams(
          `INSERT INTO federated_documents (id, source_id, title, description, url, icon, tags, content, extra, meta, fetched_at)
           VALUES (@id, @source_id, @title, @description, @url, @icon, @tags, @content, @extra, @meta, @fetched_at)`,
          doc as unknown as Record<string, unknown>
        );
        await client.query(text, values);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteFederatedDocumentsBySource(sourceId: string): Promise<void> {
    await this.pool.query('DELETE FROM federated_documents WHERE source_id = $1', [sourceId]);
  }
}
