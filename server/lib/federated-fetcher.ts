import { nanoid } from 'nanoid';
import type { FederatedSourceRow, FederatedDocumentRow } from '../db/provider.js';

interface ResultMapping {
  resultsPath: string;
  titleField: string;
  descriptionField: string;
  urlField: string;
  contentField?: string;
  tagsField?: string;
  iconField?: string;
}

/** Walk a dot-notation path into an object, e.g. "data.items" */
function walkPath(obj: unknown, path: string): unknown {
  let current = obj;
  for (const key of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function getField(item: Record<string, unknown>, field: string): string {
  const val = walkPath(item, field);
  if (val == null) return '';
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

function buildHeaders(source: FederatedSourceRow): Record<string, string> {
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  const auth = JSON.parse(source.auth_config) as Record<string, string>;

  switch (source.auth_type) {
    case 'api-key':
      headers[auth.headerName || 'X-API-Key'] = auth.token || '';
      break;
    case 'bearer':
      headers['Authorization'] = `Bearer ${auth.token || ''}`;
      break;
    case 'basic': {
      const encoded = Buffer.from(`${auth.username || ''}:${auth.password || ''}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
      break;
    }
  }
  return headers;
}

function mapResults(items: unknown[], mapping: ResultMapping, sourceId: string, now: string): FederatedDocumentRow[] {
  return (items as Record<string, unknown>[]).map((item) => ({
    id: nanoid(),
    source_id: sourceId,
    title: getField(item, mapping.titleField) || 'Untitled',
    description: getField(item, mapping.descriptionField),
    url: getField(item, mapping.urlField),
    icon: mapping.iconField ? getField(item, mapping.iconField) : undefined,
    tags: mapping.tagsField ? getField(item, mapping.tagsField) : '',
    content: mapping.contentField ? getField(item, mapping.contentField) : '',
    extra: '',
    meta: '{}',
    fetched_at: now,
  }));
}

// ─── REST API fetcher ───────────────────────────────────────────────────────
async function fetchRestApi(source: FederatedSourceRow): Promise<FederatedDocumentRow[]> {
  const mapping = JSON.parse(source.result_mapping) as ResultMapping;
  const headers = buildHeaders(source);
  const res = await fetch(source.endpoint_url, { headers });
  if (!res.ok) throw new Error(`REST API returned ${res.status}: ${res.statusText}`);
  const body = await res.json();
  const items = walkPath(body, mapping.resultsPath);
  if (!Array.isArray(items)) throw new Error(`resultsPath "${mapping.resultsPath}" did not resolve to an array`);
  return mapResults(items, mapping, source.id, new Date().toISOString());
}

// ─── OpenSearch / RSS fetcher ───────────────────────────────────────────────
async function fetchOpenSearch(source: FederatedSourceRow): Promise<FederatedDocumentRow[]> {
  const mapping = JSON.parse(source.result_mapping) as ResultMapping;
  const headers = buildHeaders(source);
  headers['Accept'] = 'application/json, application/rss+xml, application/atom+xml, text/xml';
  const res = await fetch(source.endpoint_url, { headers });
  if (!res.ok) throw new Error(`OpenSearch returned ${res.status}: ${res.statusText}`);

  const contentType = res.headers.get('content-type') || '';
  const now = new Date().toISOString();

  // Try JSON first (OpenSearch JSON response)
  if (contentType.includes('json')) {
    const body = await res.json();
    const items = walkPath(body, mapping.resultsPath);
    if (Array.isArray(items)) return mapResults(items, mapping, source.id, now);
  }

  // Fallback: parse as XML (RSS/Atom)
  const text = await res.text();
  const items: FederatedDocumentRow[] = [];

  // Simple RSS <item> extraction
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const block = match[1];
    const extract = (tag: string) => {
      const m = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    items.push({
      id: nanoid(),
      source_id: source.id,
      title: extract('title'),
      description: extract('description') || extract('summary'),
      url: extract('link'),
      tags: extract('category'),
      content: extract('content:encoded') || extract('content'),
      extra: '',
      meta: '{}',
      fetched_at: now,
    });
  }

  // Atom <entry> fallback
  if (items.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(text)) !== null) {
      const block = match[1];
      const extract = (tag: string) => {
        const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
        return m ? m[1].trim() : '';
      };
      const linkMatch = /<link[^>]+href="([^"]*)"/.exec(block);
      items.push({
        id: nanoid(),
        source_id: source.id,
        title: extract('title'),
        description: extract('summary') || extract('content'),
        url: linkMatch?.[1] || '',
        tags: '',
        content: extract('content'),
        extra: '',
        meta: '{}',
        fetched_at: now,
      });
    }
  }

  return items;
}

// ─── MCP Tool fetcher ───────────────────────────────────────────────────────
async function fetchMcpTool(source: FederatedSourceRow): Promise<FederatedDocumentRow[]> {
  const mapping = JSON.parse(source.result_mapping) as ResultMapping;
  const headers = buildHeaders(source);
  headers['Content-Type'] = 'application/json';

  // MCP tool call: POST to endpoint with tool invocation
  const res = await fetch(source.endpoint_url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ method: 'tools/call', params: { name: 'search', arguments: {} } }),
  });
  if (!res.ok) throw new Error(`MCP tool returned ${res.status}: ${res.statusText}`);
  const body = await res.json();
  const items = walkPath(body, mapping.resultsPath);
  if (!Array.isArray(items)) throw new Error(`MCP resultsPath "${mapping.resultsPath}" did not resolve to an array`);
  return mapResults(items, mapping, source.id, new Date().toISOString());
}

// ─── Main entry point ───────────────────────────────────────────────────────
export async function fetchFederatedResults(source: FederatedSourceRow): Promise<FederatedDocumentRow[]> {
  switch (source.type) {
    case 'rest-api': return fetchRestApi(source);
    case 'opensearch': return fetchOpenSearch(source);
    case 'mcp-tool': return fetchMcpTool(source);
    default: throw new Error(`Unknown source type: ${source.type}`);
  }
}
