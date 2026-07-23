import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider } from '../db/provider.js';
import type { FeaturesConfig } from '../config.js';
import { authGuard, roleGuard } from '../middleware/auth.js';
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

export function registerSqlToolRoutes(
  app: FastifyInstance,
  _db: DatabaseProvider,
  jwtSecret: string,
  features: FeaturesConfig,
) {
  // All SQL-tool endpoints are admin-only and disabled in production by default.
  // Enable explicitly with DEVDOCK_SQL_TOOL_ENABLED=true.
  const guard = [authGuard(jwtSecret), roleGuard('admin')];

  const featureDisabled = (reply: Parameters<Parameters<typeof app.post>[1]>[1]) =>
    reply.status(503).send({ error: 'SQL tool is disabled in this environment' });

  // Test database connection
  app.post('/api/sql/test', { preHandler: guard }, async (request, reply) => {
    if (!features.sqlToolEnabled) return featureDisabled(reply);
    const conn = buildConnection(request.body as Record<string, unknown>);
    return testConnection(conn);
  });

  // Execute SQL query
  app.post('/api/sql/query', { preHandler: guard }, async (request, reply) => {
    if (!features.sqlToolEnabled) return featureDisabled(reply);
    const body = request.body as Record<string, unknown>;
    const conn = buildConnection(body);
    const sql = String(body.sql ?? '');
    if (!sql.trim()) return { columns: [], rows: [], rowCount: 0, duration: 0, error: 'No SQL provided' };
    return executeQuery(conn, sql);
  });

  // Get schema: tables and views
  app.post('/api/sql/tables', { preHandler: guard }, async (request, reply) => {
    if (!features.sqlToolEnabled) return featureDisabled(reply);
    const conn = buildConnection(request.body as Record<string, unknown>);
    const tables = await getTables(conn);
    return { tables };
  });

  // Get columns for a table
  app.post('/api/sql/columns', { preHandler: guard }, async (request, reply) => {
    if (!features.sqlToolEnabled) return featureDisabled(reply);
    const body = request.body as Record<string, unknown>;
    const conn = buildConnection(body);
    const table = String(body.table ?? '');
    const schema = body.schema ? String(body.schema) : undefined;
    const columns = await getColumns(conn, table, schema);
    return { columns };
  });

  // Get stored procedures
  app.post('/api/sql/procedures', { preHandler: guard }, async (request, reply) => {
    if (!features.sqlToolEnabled) return featureDisabled(reply);
    const conn = buildConnection(request.body as Record<string, unknown>);
    const procedures = await getStoredProcedures(conn);
    return { procedures };
  });
}
