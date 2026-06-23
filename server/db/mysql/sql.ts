// ─── Helpers shared by the MySQL provider ───────────────────────────────────
// Why these exist:
// • mysql2 uses positional `?` placeholders. Our SQL strings use SQLite-style
//   `@name` placeholders so they read like the SQLite source. namedParams()
//   converts `@name` → `?` and pushes values in the order they appear; unlike
//   the Postgres `$N` adapter, MySQL's `?` does NOT reuse — each `?` consumes
//   one value from the array, so a repeated `@id` produces two `?`s and two
//   values.
// • JSON columns: mysql2 returns parsed JS objects/arrays; the route layer was
//   built against the SQLite shape (JSON-string), so mapRow stringifies on read.
// • TINYINT(1): mysql2 round-trips as 0/1 numbers — no boolean coercion needed
//   for either reads or writes (the route already passes 0/1).

export const JSON_COLUMNS: Record<string, readonly string[]> = {
  users: ['permissions', 'dashboard_widgets', 'favorite_repos', 'preferences'],
  repos: ['topics', 'environments', 'owners', 'custom_tags'],
  settings: ['ai_config', 'otel_config', 'github_config', 'ado_config', 'dashboard_widgets'],
  bookmarks: ['tags'],
  collections: [],
  docs: ['tags'],
  plugins_state: ['enabled_plugins', 'plugin_settings'],
  analytics_page_views: [],
  analytics_errors: [],
  federated_sources: ['auth_config', 'result_mapping', 'trigger_config'],
  federated_documents: ['meta'],
  forum_threads: ['tags', 'votes'],
  forum_answers: ['votes'],
  feature_requests: ['tags', 'votes', 'attachments'],
  mcp_servers: ['args', 'env', 'capabilities'],
  mcp_tools: ['input_schema'],
  registry_items: ['tags', 'capabilities', 'votes'],
} as const;

/**
 * Convert SQL with `@name` placeholders + an object of params into the mysql2
 * driver's positional `?` form. Each `?` consumes one value, so a name that
 * appears twice produces two `?` and two values pushed in order.
 */
export function namedParams(
  sql: string,
  params: Record<string, unknown>
): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const table = inferTable(sql);
  const text = sql.replace(/@(\w+)/g, (_, name: string) => {
    values.push(coerceWriteValue(name, params[name], table));
    return '?';
  });
  return { text, values };
}

/**
 * Coerce a row returned by MySQL back into the SQLite-shaped Row type that
 * the rest of the codebase expects. JSON columns come back as parsed objects
 * from mysql2; we re-stringify so route handlers stay DB-agnostic.
 * (Booleans are already 0/1 numbers — no work needed.)
 */
export function mapRow<T>(
  row: Record<string, unknown> | null | undefined,
  table: string
): T | null {
  if (!row) return null;
  const out: Record<string, unknown> = { ...row };

  for (const col of JSON_COLUMNS[table] ?? []) {
    const v = out[col];
    if (v !== null && v !== undefined && typeof v !== 'string') {
      out[col] = JSON.stringify(v);
    }
  }
  return out as T;
}

export function mapRows<T>(rows: Record<string, unknown>[], table: string): T[] {
  return rows.map((r) => mapRow<T>(r, table)!);
}

/**
 * Coerce a value being written to MySQL:
 *   • undefined → null (mysql2 rejects undefined, accepts null)
 *   • JSON columns: stringify objects/arrays so they ship as text and the
 *     JSON column type parses on the server.
 *   • Booleans / numbers / strings pass through unchanged.
 */
function coerceWriteValue(name: string, value: unknown, table: string | null): unknown {
  if (value === undefined) return null;
  if (!table) return value;

  if ((JSON_COLUMNS[table] ?? []).includes(name)) {
    if (value === null) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }
  return value;
}

function inferTable(sql: string): string | null {
  const m = sql.match(/(?:INSERT\s+INTO|UPDATE)\s+(\w+)/i);
  return m ? m[1].toLowerCase() : null;
}
