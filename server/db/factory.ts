import type { DbConfig } from '../config.js';
import type { DatabaseProvider } from './provider.js';

export async function createProvider(config: DbConfig): Promise<DatabaseProvider> {
  switch (config.provider) {
    case 'sqlite': {
      const { SqliteProvider } = await import('./sqlite/client.js');
      return new SqliteProvider(config.sqlite.path);
    }
    case 'postgres': {
      const { PostgresProvider } = await import('./postgres/client.js');
      return new PostgresProvider(config.postgres.connectionString);
    }
    case 'supabase': {
      const { SupabaseProvider } = await import('./supabase/client.js');
      return new SupabaseProvider(config.supabase.url, config.supabase.anonKey);
    }
    default:
      throw new Error(`Unknown database provider: ${config.provider}`);
  }
}
