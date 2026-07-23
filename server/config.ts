import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export type DbProviderType = 'sqlite' | 'postgres' | 'mysql' | 'supabase';

export interface DbConfig {
  provider: DbProviderType;
  sqlite: { path: string };
  postgres: { connectionString: string; ssl: boolean };
  mysql: { connectionString: string; ssl: boolean };
  supabase: { url: string; anonKey: string; serviceRoleKey?: string };
}

export interface VectorConfig {
  /** Whether semantic search is wired up for this server. False → embedder
   *  + Chroma are not initialised and search routes return 503. */
  enabled: boolean;
  /** Chroma server URL. Default http://localhost:8000 (chromadb image default). */
  chromaUrl: string;
  /** Gemini API key for embeddings. */
  geminiApiKey: string;
}

export interface FeaturesConfig {
  /**
   * When false the /api/code/run and /api/code/languages routes return 503.
   * Defaults to true in development, false when NODE_ENV=production.
   * Override with DEVDOCK_CODE_RUNNER_ENABLED=true|false.
   */
  codeRunnerEnabled: boolean;
  /**
   * When false the /api/sql/* proxy routes return 503.
   * Same production default as codeRunnerEnabled.
   */
  sqlToolEnabled: boolean;
}

export interface ServerConfig {
  port: number;
  db: DbConfig;
  jwtSecret: string;
  vector: VectorConfig;
  features: FeaturesConfig;
}

const DEFAULT_JWT_SECRET = 'devdock-dev-secret-change-in-production';

const isDev = process.env.NODE_ENV !== 'production';

const DEFAULT_CONFIG: ServerConfig = {
  port: 3000,
  jwtSecret: DEFAULT_JWT_SECRET,
  db: {
    provider: 'sqlite',
    sqlite: { path: resolve(process.cwd(), 'data/devdock.db') },
    postgres: { connectionString: '', ssl: false },
    mysql: { connectionString: '', ssl: false },
    supabase: { url: '', anonKey: '' },
  },
  vector: {
    enabled: false,
    chromaUrl: 'http://localhost:8000',
    geminiApiKey: '',
  },
  features: {
    codeRunnerEnabled: isDev,
    sqlToolEnabled: isDev,
  },
};

export function loadConfig(): ServerConfig {
  const config = {
    ...DEFAULT_CONFIG,
    db: { ...DEFAULT_CONFIG.db },
    features: { ...DEFAULT_CONFIG.features },
  };

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
        if (file.database.mysql) config.db.mysql = { ...config.db.mysql, ...file.database.mysql };
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
  if (process.env.DEVDOCK_MYSQL_URL) config.db.mysql.connectionString = process.env.DEVDOCK_MYSQL_URL;
  if (process.env.DEVDOCK_MYSQL_SSL === 'require') config.db.mysql.ssl = true;
  if (process.env.DEVDOCK_SUPABASE_URL) config.db.supabase.url = process.env.DEVDOCK_SUPABASE_URL;
  if (process.env.DEVDOCK_SUPABASE_KEY) config.db.supabase.anonKey = process.env.DEVDOCK_SUPABASE_KEY;

  // Vector / embeddings: env-var-wins so deployments can opt in without code
  // changes. Setting GEMINI_API_KEY is what flips the feature on.
  if (process.env.DEVDOCK_CHROMA_URL) config.vector.chromaUrl = process.env.DEVDOCK_CHROMA_URL;
  if (process.env.GEMINI_API_KEY) config.vector.geminiApiKey = process.env.GEMINI_API_KEY;
  config.vector.enabled = Boolean(config.vector.geminiApiKey);

  // Feature flags — explicit env var wins, then per-mode defaults.
  if (process.env.DEVDOCK_CODE_RUNNER_ENABLED !== undefined)
    config.features.codeRunnerEnabled = process.env.DEVDOCK_CODE_RUNNER_ENABLED !== 'false';
  if (process.env.DEVDOCK_SQL_TOOL_ENABLED !== undefined)
    config.features.sqlToolEnabled = process.env.DEVDOCK_SQL_TOOL_ENABLED !== 'false';

  // Fail-closed: refuse to start in production with the bundled dev secret.
  if (!isDev && config.jwtSecret === DEFAULT_JWT_SECRET) {
    console.error(
      'FATAL: DEVDOCK_JWT_SECRET is not set (or is the insecure default). ' +
      'Set a strong secret via the DEVDOCK_JWT_SECRET environment variable before running in production.',
    );
    process.exit(1);
  }

  // Non-fatal warning in dev so developers are aware.
  if (isDev && config.jwtSecret === DEFAULT_JWT_SECRET) {
    console.warn(
      '[security] Using the default JWT secret — set DEVDOCK_JWT_SECRET before deploying.',
    );
  }

  return config;
}
