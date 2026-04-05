// Database proxy — executes queries against user-specified database connections.
// Supports PostgreSQL, MySQL/MariaDB, SQL Server, and SQLite.

export interface ProxyConnection {
  engine: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionString?: string;
  ssl: boolean;
}

export interface ProxyResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: number;
  error?: string;
}

export interface SchemaTable {
  schema: string;
  name: string;
  type: 'table' | 'view';
}

export interface SchemaColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
}

export interface SchemaProc {
  schema: string;
  name: string;
  language?: string;
}

// ─── PostgreSQL ─────────────────────────────────────────────────────────────
async function queryPostgres(conn: ProxyConnection, sql: string): Promise<ProxyResult> {
  const { default: pg } = await import('pg');
  const config = conn.connectionString
    ? { connectionString: conn.connectionString, ssl: conn.ssl ? { rejectUnauthorized: false } : false }
    : { host: conn.host, port: conn.port, database: conn.database, user: conn.username, password: conn.password, ssl: conn.ssl ? { rejectUnauthorized: false } : false };

  const client = new pg.Client(config);
  const start = Date.now();
  try {
    await client.connect();
    const result = await client.query(sql);
    const rows = result.rows ?? [];
    const columns = result.fields?.map((f: { name: string }) => f.name) ?? [];
    return { columns, rows, rowCount: result.rowCount ?? rows.length, duration: Date.now() - start };
  } catch (e) {
    return { columns: [], rows: [], rowCount: 0, duration: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  } finally {
    await client.end().catch(() => {});
  }
}

// ─── MySQL / MariaDB ────────────────────────────────────────────────────────
async function queryMysql(conn: ProxyConnection, sql: string): Promise<ProxyResult> {
  const mysql = await import('mysql2/promise');
  const config = conn.connectionString
    ? { uri: conn.connectionString }
    : { host: conn.host, port: conn.port, database: conn.database, user: conn.username, password: conn.password, ssl: conn.ssl ? { rejectUnauthorized: false } : undefined };

  const start = Date.now();
  let connection;
  try {
    connection = await mysql.createConnection(config);
    const [result] = await connection.execute(sql);
    const rows = Array.isArray(result) ? result as Record<string, unknown>[] : [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows, rowCount: rows.length, duration: Date.now() - start };
  } catch (e) {
    return { columns: [], rows: [], rowCount: 0, duration: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  } finally {
    await connection?.end().catch(() => {});
  }
}

// ─── SQL Server ─────────────────────────────────────────────────────────────
async function querySqlServer(conn: ProxyConnection, sql: string): Promise<ProxyResult> {
  const mssql = await import('mssql');
  const config: mssql.config = conn.connectionString
    ? { connectionString: conn.connectionString } as mssql.config
    : {
        server: conn.host, port: conn.port, database: conn.database,
        user: conn.username, password: conn.password,
        options: { encrypt: conn.ssl, trustServerCertificate: true },
      };

  const start = Date.now();
  let pool: mssql.ConnectionPool | undefined;
  try {
    pool = await mssql.default.connect(config);
    const result = await pool.request().query(sql);
    const rows = result.recordset ?? [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : (result.recordset?.columns ? Object.keys(result.recordset.columns) : []);
    return { columns, rows, rowCount: result.rowsAffected?.[0] ?? rows.length, duration: Date.now() - start };
  } catch (e) {
    return { columns: [], rows: [], rowCount: 0, duration: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  } finally {
    await pool?.close().catch(() => {});
  }
}

// ─── SQLite ─────────────────────────────────────────────────────────────────
async function querySqlite(conn: ProxyConnection, sql: string): Promise<ProxyResult> {
  const Database = (await import('better-sqlite3')).default;
  const start = Date.now();
  try {
    const db = new Database(conn.database || conn.connectionString || ':memory:');
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA') || sql.trim().toUpperCase().startsWith('WITH');
    if (isSelect) {
      const rows = db.prepare(sql).all() as Record<string, unknown>[];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      db.close();
      return { columns, rows, rowCount: rows.length, duration: Date.now() - start };
    } else {
      const result = db.prepare(sql).run();
      db.close();
      return { columns: [], rows: [], rowCount: result.changes, duration: Date.now() - start };
    }
  } catch (e) {
    return { columns: [], rows: [], rowCount: 0, duration: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────
export async function executeQuery(conn: ProxyConnection, sql: string): Promise<ProxyResult> {
  switch (conn.engine) {
    case 'postgresql': return queryPostgres(conn, sql);
    case 'mysql':
    case 'mariadb': return queryMysql(conn, sql);
    case 'sqlserver': return querySqlServer(conn, sql);
    case 'sqlite': return querySqlite(conn, sql);
    case 'oracle':
      return { columns: [], rows: [], rowCount: 0, duration: 0, error: 'Oracle requires the oracledb package and Oracle Client. Install with: npm install oracledb' };
    default:
      return { columns: [], rows: [], rowCount: 0, duration: 0, error: `Unsupported engine: ${conn.engine}` };
  }
}

export async function testConnection(conn: ProxyConnection): Promise<{ success: boolean; message: string }> {
  const testQueries: Record<string, string> = {
    postgresql: 'SELECT 1 AS connected',
    mysql: 'SELECT 1 AS connected',
    mariadb: 'SELECT 1 AS connected',
    sqlserver: 'SELECT 1 AS connected',
    sqlite: 'SELECT 1 AS connected',
    oracle: 'SELECT 1 FROM DUAL',
  };
  const result = await executeQuery(conn, testQueries[conn.engine] ?? 'SELECT 1');
  return result.error
    ? { success: false, message: result.error }
    : { success: true, message: `Connected in ${result.duration}ms` };
}

export async function getTables(conn: ProxyConnection): Promise<SchemaTable[]> {
  const queries: Record<string, string> = {
    postgresql: `SELECT table_schema AS schema, table_name AS name, table_type AS type FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name`,
    mysql: `SELECT table_schema AS \`schema\`, table_name AS name, IF(table_type='BASE TABLE','table','view') AS type FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name`,
    mariadb: `SELECT table_schema AS \`schema\`, table_name AS name, IF(table_type='BASE TABLE','table','view') AS type FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name`,
    sqlserver: `SELECT TABLE_SCHEMA AS [schema], TABLE_NAME AS name, CASE TABLE_TYPE WHEN 'BASE TABLE' THEN 'table' ELSE 'view' END AS type FROM INFORMATION_SCHEMA.TABLES ORDER BY TABLE_SCHEMA, TABLE_NAME`,
    sqlite: `SELECT '' AS [schema], name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  };
  const result = await executeQuery(conn, queries[conn.engine] ?? '');
  if (result.error) return [];
  return result.rows.map((r) => ({
    schema: String(r.schema ?? ''),
    name: String(r.name),
    type: String(r.type).includes('view') ? 'view' as const : 'table' as const,
  }));
}

export async function getColumns(conn: ProxyConnection, table: string, schema?: string): Promise<SchemaColumn[]> {
  const queries: Record<string, string> = {
    postgresql: `SELECT c.column_name AS name, c.data_type AS data_type, (c.is_nullable='YES') AS nullable, c.column_default AS default_value, COALESCE(pk.is_pk, false) AS is_primary_key FROM information_schema.columns c LEFT JOIN (SELECT kcu.column_name, true AS is_pk FROM information_schema.key_column_usage kcu JOIN information_schema.table_constraints tc ON tc.constraint_name=kcu.constraint_name AND tc.constraint_type='PRIMARY KEY' WHERE kcu.table_name='${table}'${schema ? ` AND kcu.table_schema='${schema}'` : ''}) pk ON pk.column_name=c.column_name WHERE c.table_name='${table}'${schema ? ` AND c.table_schema='${schema}'` : ''} ORDER BY c.ordinal_position`,
    mysql: `SELECT column_name AS name, data_type, (is_nullable='YES') AS nullable, column_default AS default_value, (column_key='PRI') AS is_primary_key FROM information_schema.columns WHERE table_name='${table}' AND table_schema=DATABASE() ORDER BY ordinal_position`,
    mariadb: `SELECT column_name AS name, data_type, (is_nullable='YES') AS nullable, column_default AS default_value, (column_key='PRI') AS is_primary_key FROM information_schema.columns WHERE table_name='${table}' AND table_schema=DATABASE() ORDER BY ordinal_position`,
    sqlserver: `SELECT c.COLUMN_NAME AS name, c.DATA_TYPE AS data_type, CASE c.IS_NULLABLE WHEN 'YES' THEN 1 ELSE 0 END AS nullable, c.COLUMN_DEFAULT AS default_value, CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS is_primary_key FROM INFORMATION_SCHEMA.COLUMNS c LEFT JOIN (SELECT ku.COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON tc.CONSTRAINT_NAME=ku.CONSTRAINT_NAME AND tc.CONSTRAINT_TYPE='PRIMARY KEY' WHERE ku.TABLE_NAME='${table}') pk ON pk.COLUMN_NAME=c.COLUMN_NAME WHERE c.TABLE_NAME='${table}' ORDER BY c.ORDINAL_POSITION`,
    sqlite: `PRAGMA table_info('${table}')`,
  };
  const result = await executeQuery(conn, queries[conn.engine] ?? '');
  if (result.error) return [];

  if (conn.engine === 'sqlite') {
    return result.rows.map((r) => ({
      name: String(r.name),
      dataType: String(r.type ?? 'TEXT'),
      nullable: !r.notnull,
      defaultValue: r.dflt_value != null ? String(r.dflt_value) : undefined,
      isPrimaryKey: Boolean(r.pk),
    }));
  }

  return result.rows.map((r) => ({
    name: String(r.name),
    dataType: String(r.data_type ?? ''),
    nullable: Boolean(r.nullable),
    defaultValue: r.default_value != null ? String(r.default_value) : undefined,
    isPrimaryKey: Boolean(r.is_primary_key),
  }));
}

export async function getStoredProcedures(conn: ProxyConnection): Promise<SchemaProc[]> {
  const queries: Record<string, string> = {
    postgresql: `SELECT routine_schema AS schema, routine_name AS name, external_language AS language FROM information_schema.routines WHERE routine_schema NOT IN ('pg_catalog','information_schema') ORDER BY routine_schema, routine_name`,
    mysql: `SELECT routine_schema AS \`schema\`, routine_name AS name, routine_type AS language FROM information_schema.routines WHERE routine_schema = DATABASE() ORDER BY routine_name`,
    mariadb: `SELECT routine_schema AS \`schema\`, routine_name AS name, routine_type AS language FROM information_schema.routines WHERE routine_schema = DATABASE() ORDER BY routine_name`,
    sqlserver: `SELECT SCHEMA_NAME(schema_id) AS [schema], name, type_desc AS language FROM sys.procedures ORDER BY name`,
  };
  if (!queries[conn.engine]) return [];
  const result = await executeQuery(conn, queries[conn.engine]);
  if (result.error) return [];
  return result.rows.map((r) => ({
    schema: String(r.schema ?? ''),
    name: String(r.name),
    language: r.language ? String(r.language) : undefined,
  }));
}
