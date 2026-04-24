// ─── Helpers shared by the Postgres provider ────────────────────────────────
// Why these exist:
// • better-sqlite3 supports `@name` parameters and an object map; `pg` does not.
//   namedParams() converts `@name` → `$N` and builds the matching positional array.
// • Our column types differ between SQLite (INTEGER for booleans, TEXT for JSON) and
//   Postgres (BOOLEAN, JSONB). The route layer was built against the SQLite shape
//   (booleans as 0/1, JSON as strings). To avoid touching every route, we coerce
//   on both sides at the provider boundary.

// Tables → columns that should be coerced for I/O.
// Update these lists in lockstep with the migrations and the row types in provider.ts.
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
} as const;

export const BOOLEAN_COLUMNS: Record<string, readonly string[]> = {
  repos: ['is_private'],
  bookmarks: ['favorite'],
  federated_sources: ['enabled'],
  forum_answers: ['is_accepted'],
} as const;

/**
 * Convert SQL with `@name` placeholders + an object of params into the `pg`
 * driver's positional `$N` form. The same `@name` reused in the same statement
 * collapses to the same `$N` so we don't push duplicate values.
 */
export function namedParams(
  sql: string,
  params: Record<string, unknown>
): { text: string; values: unknown[] } {
  const order: string[] = [];
  const text = sql.replace(/@(\w+)/g, (_, name: string) => {
    let i = order.indexOf(name);
    if (i === -1) {
      i = order.length;
      order.push(name);
    }
    return `$${i + 1}`;
  });
  const values = order.map((name) => coerceWriteValue(name, params[name], inferTable(sql)));
  return { text, values };
}

/**
 * Coerce a row returned by Postgres back into the SQLite-shaped Row type that
 * the rest of the codebase expects:
 *   • BOOLEAN → 1 or 0
 *   • JSONB (object/array) → JSON-stringified
 * Pass the table name so we know which columns to touch.
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
  for (const col of BOOLEAN_COLUMNS[table] ?? []) {
    const v = out[col];
    if (typeof v === 'boolean') {
      out[col] = v ? 1 : 0;
    }
  }
  return out as T;
}

export function mapRows<T>(rows: Record<string, unknown>[], table: string): T[] {
  return rows.map((r) => mapRow<T>(r, table)!);
}

/**
 * Coerce a value being written to Postgres to a type the driver will accept:
 *   • For BOOLEAN columns, accept either 0/1 (SQLite-style) or true/false.
 *   • For JSONB columns, accept either an already-stringified JSON or a value
 *     to be serialized. We always serialize to a string so `pg` ships it as text,
 *     and the column's JSONB cast parses on the server.
 */
function coerceWriteValue(name: string, value: unknown, table: string | null): unknown {
  if (value === undefined) return null;
  if (!table) return value;

  if ((BOOLEAN_COLUMNS[table] ?? []).includes(name)) {
    if (value === 0) return false;
    if (value === 1) return true;
    return value;
  }
  if ((JSON_COLUMNS[table] ?? []).includes(name)) {
    if (value === null) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }
  return value;
}

/**
 * Best-effort table extraction from the leading SQL keywords. We use it to know
 * which columns need coercion on writes. Returns null for SQL we don't recognise
 * (callers fall back to passing values through unchanged, which is fine for
 * simple types).
 */
function inferTable(sql: string): string | null {
  // INSERT INTO <table> ... | UPDATE <table> SET ...
  const m = sql.match(/(?:INSERT\s+INTO|UPDATE)\s+(\w+)/i);
  return m ? m[1].toLowerCase() : null;
}
