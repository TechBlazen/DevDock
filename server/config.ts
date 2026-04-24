import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export type DbProviderType = 'sqlite' | 'postgres' | 'supabase';

export interface DbConfig {
  provider: DbProviderType;
  sqlite: { path: string };
  postgres: { connectionString: string; ssl: boolean };
  supabase: { url: string; anonKey: string; serviceRoleKey?: string };
}

export interface ServerConfig {
  port: number;
  db: DbConfig;
  jwtSecret: string;
}

const DEFAULT_CONFIG: ServerConfig = {
  port: 3000,
  jwtSecret: 'devdock-dev-secret-change-in-production',
  db: {
    provider: 'sqlite',
    sqlite: { path: resolve(process.cwd(), 'data/devdock.db') },
    postgres: { connectionString: '', ssl: false },
    supabase: { url: '', anonKey: '' },
  },
};

export function loadConfig(): ServerConfig {
  const config = { ...DEFAULT_CONFIG, db: { ...DEFAULT_CONFIG.db } };

  // Try loading config file
  const configPath = resolve(process.cwd(), 'devdock.config.json');
  if (existsSync(configPath)) {
    try {
      const file = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (file.port) config.port = file.port;
      if (file.jwtSecret) config.jwtSecret = file.jwtSecret;
      if (file.database) {
        if (file.database.provider) config.db.provider = file.database.provider;
        if (file.database.sqlite) config.db.sqlite = { ...config.db.sqlite, ...file.database.sqlite };
        if (file.database.postgres) config.db.postgres = { ...config.db.postgres, ...file.database.postgres };
        if (file.database.supabase) config.db.supabase = { ...config.db.supabase, ...file.database.supabase };
      }
    } catch {
      console.warn('Failed to parse devdock.config.json, using defaults');
    }
  }

  // Env vars override config file
  if (process.env.DEVDOCK_PORT) config.port = parseInt(process.env.DEVDOCK_PORT, 10);
  if (process.env.DEVDOCK_JWT_SECRET) config.jwtSecret = process.env.DEVDOCK_JWT_SECRET;
  if (process.env.DEVDOCK_DB_PROVIDER) config.db.provider = process.env.DEVDOCK_DB_PROVIDER as DbProviderType;
  if (process.env.DEVDOCK_SQLITE_PATH) config.db.sqlite.path = process.env.DEVDOCK_SQLITE_PATH;
  if (process.env.DEVDOCK_POSTGRES_URL) config.db.postgres.connectionString = process.env.DEVDOCK_POSTGRES_URL;
  if (process.env.DEVDOCK_POSTGRES_SSL === 'require') config.db.postgres.ssl = true;
  if (process.env.DEVDOCK_SUPABASE_URL) config.db.supabase.url = process.env.DEVDOCK_SUPABASE_URL;
  if (process.env.DEVDOCK_SUPABASE_KEY) config.db.supabase.anonKey = process.env.DEVDOCK_SUPABASE_KEY;

  return config;
}
