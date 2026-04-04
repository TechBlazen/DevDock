import type {
  DatabaseProvider, UserRow, RepoRow, SettingsRow,
  BookmarkRow, CollectionRow, DocRow, PluginStateRow,
  PageViewRow, ErrorRow,
} from '../provider.js';

// PostgreSQL provider — requires 'postgres' package (npm i postgres)
// Configure via DEVDOCK_POSTGRES_URL or devdock.config.json

export class PostgresProvider implements DatabaseProvider {
  private sql: unknown;

  constructor(private connectionString: string) {
    if (!connectionString) {
      throw new Error(
        'PostgreSQL connection string required. Set DEVDOCK_POSTGRES_URL or configure in devdock.config.json'
      );
    }
  }

  async connect(): Promise<void> {
    const postgres = await import('postgres');
    this.sql = postgres.default(this.connectionString);
    console.log('Connected to PostgreSQL');
  }

  async disconnect(): Promise<void> {
    if (this.sql) {
      await (this.sql as { end: () => Promise<void> }).end();
    }
  }

  async migrate(): Promise<void> {
    // TODO: Implement PostgreSQL migrations
    // Use the same schema as SQLite but with:
    //   - BOOLEAN instead of INTEGER for is_private, favorite
    //   - JSONB instead of TEXT for JSON columns
    //   - SERIAL instead of AUTOINCREMENT
    throw new Error(
      'PostgreSQL migrations not yet implemented. ' +
      'Run the SQL from server/db/sqlite/migrations/001_initial.sql manually, ' +
      'adjusting types for PostgreSQL (TEXT→JSONB for JSON columns, INTEGER→BOOLEAN for flags).'
    );
  }

  // Stub implementations — fill these in when ready to use PostgreSQL
  async getUsers(): Promise<UserRow[]> { throw notImpl(); }
  async getUserById(_id: string): Promise<UserRow | null> { throw notImpl(); }
  async getUserByUsername(_username: string): Promise<UserRow | null> { throw notImpl(); }
  async createUser(_user: UserRow): Promise<UserRow> { throw notImpl(); }
  async updateUser(_id: string, _partial: Partial<UserRow>): Promise<UserRow | null> { throw notImpl(); }
  async deleteUser(_id: string): Promise<void> { throw notImpl(); }

  async getRepos(_source?: string): Promise<RepoRow[]> { throw notImpl(); }
  async getRepoById(_id: string): Promise<RepoRow | null> { throw notImpl(); }
  async upsertRepo(_repo: RepoRow): Promise<RepoRow> { throw notImpl(); }
  async updateRepo(_id: string, _partial: Partial<RepoRow>): Promise<RepoRow | null> { throw notImpl(); }
  async deleteRepo(_id: string): Promise<void> { throw notImpl(); }

  async getSettings(_userId?: string): Promise<SettingsRow | null> { throw notImpl(); }
  async upsertSettings(_settings: SettingsRow): Promise<SettingsRow> { throw notImpl(); }

  async getBookmarks(_userId: string): Promise<BookmarkRow[]> { throw notImpl(); }
  async createBookmark(_bookmark: BookmarkRow): Promise<BookmarkRow> { throw notImpl(); }
  async updateBookmark(_id: string, _partial: Partial<BookmarkRow>): Promise<BookmarkRow | null> { throw notImpl(); }
  async deleteBookmark(_id: string): Promise<void> { throw notImpl(); }

  async getCollections(_userId: string): Promise<CollectionRow[]> { throw notImpl(); }
  async createCollection(_collection: CollectionRow): Promise<CollectionRow> { throw notImpl(); }
  async updateCollection(_id: string, _partial: Partial<CollectionRow>): Promise<CollectionRow | null> { throw notImpl(); }
  async deleteCollection(_id: string): Promise<void> { throw notImpl(); }

  async getDocs(): Promise<DocRow[]> { throw notImpl(); }
  async createDoc(_doc: DocRow): Promise<DocRow> { throw notImpl(); }
  async updateDoc(_id: string, _partial: Partial<DocRow>): Promise<DocRow | null> { throw notImpl(); }
  async deleteDoc(_id: string): Promise<void> { throw notImpl(); }

  async getPluginState(): Promise<PluginStateRow> { throw notImpl(); }
  async updatePluginState(_state: Partial<PluginStateRow>): Promise<PluginStateRow> { throw notImpl(); }

  async trackPageView(_view: PageViewRow): Promise<void> { throw notImpl(); }
  async trackError(_error: ErrorRow): Promise<void> { throw notImpl(); }
  async getPageViews(_limit?: number): Promise<PageViewRow[]> { throw notImpl(); }
  async getErrors(_limit?: number): Promise<ErrorRow[]> { throw notImpl(); }
}

function notImpl() {
  return new Error('PostgreSQL provider methods not yet implemented. Use SQLite for now or contribute the implementation.');
}
