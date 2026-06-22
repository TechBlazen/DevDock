import type {
  DatabaseProvider, UserRow, RepoRow, SettingsRow,
  BookmarkRow, CollectionRow, DocRow, PluginStateRow,
  PageViewRow, ErrorRow, McpServerRow, McpToolRow,
} from '../provider.js';

// Supabase provider — requires '@supabase/supabase-js' package
// Configure via DEVDOCK_SUPABASE_URL + DEVDOCK_SUPABASE_KEY or devdock.config.json

export class SupabaseProvider implements DatabaseProvider {
  private client: unknown;

  constructor(private url: string, private anonKey: string) {
    if (!url || !anonKey) {
      throw new Error(
        'Supabase URL and anon key required. Set DEVDOCK_SUPABASE_URL + DEVDOCK_SUPABASE_KEY ' +
        'or configure in devdock.config.json'
      );
    }
  }

  async connect(): Promise<void> {
    const { createClient } = await import('@supabase/supabase-js');
    this.client = createClient(this.url, this.anonKey);
    console.log('Connected to Supabase');
  }

  async disconnect(): Promise<void> {
    // Supabase client doesn't need explicit disconnection
  }

  async migrate(): Promise<void> {
    // Supabase migrations should be applied via the Supabase CLI or dashboard.
    // Run: supabase db push (or apply the SQL from 001_initial.sql via the SQL editor)
    console.log(
      'Supabase migrations are managed via the Supabase CLI. ' +
      'Ensure your schema matches server/db/sqlite/migrations/001_initial.sql'
    );
  }

  // Stub implementations — fill these in when ready to use Supabase
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

  async getMcpServers(): Promise<McpServerRow[]> { throw notImpl(); }
  async getMcpServerById(_id: string): Promise<McpServerRow | null> { throw notImpl(); }
  async createMcpServer(_server: McpServerRow): Promise<McpServerRow> { throw notImpl(); }
  async updateMcpServer(_id: string, _partial: Partial<McpServerRow>): Promise<McpServerRow | null> { throw notImpl(); }
  async deleteMcpServer(_id: string): Promise<void> { throw notImpl(); }

  async getMcpTools(_serverId?: string): Promise<McpToolRow[]> { throw notImpl(); }
  async getMcpToolByName(_name: string): Promise<McpToolRow | null> { throw notImpl(); }
  async replaceMcpTools(_serverId: string, _tools: McpToolRow[]): Promise<void> { throw notImpl(); }
  async deleteMcpToolsByServer(_serverId: string): Promise<void> { throw notImpl(); }
}

function notImpl() {
  return new Error('Supabase provider methods not yet implemented. Use SQLite for now or contribute the implementation.');
}
