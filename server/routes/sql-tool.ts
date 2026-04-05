import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider } from '../db/provider.js';
import {
  executeQuery,
  testConnection,
  getTables,
  getColumns,
  getStoredProcedures,
  type ProxyConnection,
} from '../lib/db-proxy.js';

function buildConnection(body: Record<string, unknown>): ProxyConnection {
  return {
    engine: String(body.engine ?? 'postgresql'),
    host: String(body.host ?? 'localhost'),
    port: Number(body.port ?? 5432),
    database: String(body.database ?? ''),
    username: String(body.username ?? ''),
    password: String(body.password ?? ''),
    connectionString: body.connectionString ? String(body.connectionString) : undefined,
    ssl: Boolean(body.ssl ?? false),
  };
}

export function registerSqlToolRoutes(app: FastifyInstance, _db: DatabaseProvider, _jwtSecret: string) {
  // Test database connection
  app.post('/api/sql/test', async (request) => {
    const conn = buildConnection(request.body as Record<string, unknown>);
    return testConnection(conn);
  });

  // Execute SQL query
  app.post('/api/sql/query', async (request) => {
    const body = request.body as Record<string, unknown>;
    const conn = buildConnection(body);
    const sql = String(body.sql ?? '');
    if (!sql.trim()) return { columns: [], rows: [], rowCount: 0, duration: 0, error: 'No SQL provided' };
    return executeQuery(conn, sql);
  });

  // Get schema: tables and views
  app.post('/api/sql/tables', async (request) => {
    const conn = buildConnection(request.body as Record<string, unknown>);
    const tables = await getTables(conn);
    return { tables };
  });

  // Get columns for a table
  app.post('/api/sql/columns', async (request) => {
    const body = request.body as Record<string, unknown>;
    const conn = buildConnection(body);
    const table = String(body.table ?? '');
    const schema = body.schema ? String(body.schema) : undefined;
    const columns = await getColumns(conn, table, schema);
    return { columns };
  });

  // Get stored procedures
  app.post('/api/sql/procedures', async (request) => {
    const conn = buildConnection(request.body as Record<string, unknown>);
    const procedures = await getStoredProcedures(conn);
    return { procedures };
  });
}
