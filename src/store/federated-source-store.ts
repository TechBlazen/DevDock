import { create } from 'zustand';
import type { FederatedSource, FederatedDocument } from '../lib/search/federated-types';

interface FederatedSourceStore {
  sources: FederatedSource[];
  documents: FederatedDocument[];
  loading: boolean;
  syncing: Record<string, boolean>;

  fetchSources: () => Promise<void>;
  fetchDocuments: () => Promise<void>;
  createSource: (source: Partial<FederatedSource>) => Promise<FederatedSource | null>;
  updateSource: (id: string, partial: Partial<FederatedSource>) => Promise<void>;
  deleteSource: (id: string) => Promise<void>;
  syncSource: (id: string) => Promise<{ documentCount: number } | null>;
}

function toClient(row: Record<string, unknown>): FederatedSource {
  return {
    id: String(row.id),
    name: String(row.name),
    type: row.type as FederatedSource['type'],
    endpointUrl: String(row.endpoint_url),
    authType: row.auth_type as FederatedSource['authType'],
    authConfig: typeof row.auth_config === 'string' ? JSON.parse(row.auth_config) : (row.auth_config ?? {}),
    resultMapping: typeof row.result_mapping === 'string' ? JSON.parse(row.result_mapping) : (row.result_mapping ?? {}),
    triggerConfig: typeof row.trigger_config === 'string' ? JSON.parse(row.trigger_config) : (row.trigger_config ?? {}),
    syncIntervalMinutes: Number(row.sync_interval_minutes ?? 0),
    lastSyncedAt: row.last_synced_at ? String(row.last_synced_at) : null,
    documentCount: Number(row.document_count ?? 0),
    enabled: Boolean(row.enabled),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toDocClient(row: Record<string, unknown>): FederatedDocument {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    title: String(row.title),
    description: String(row.description ?? ''),
    url: String(row.url ?? ''),
    icon: row.icon ? String(row.icon) : undefined,
    tags: row.tags ? String(row.tags) : undefined,
    content: row.content ? String(row.content) : undefined,
    extra: row.extra ? String(row.extra) : undefined,
    meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : (row.meta as Record<string, string> | undefined),
    fetchedAt: String(row.fetched_at),
  };
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const useFederatedSourceStore = create<FederatedSourceStore>()((set, get) => ({
  sources: [],
  documents: [],
  loading: false,
  syncing: {},

  fetchSources: async () => {
    set({ loading: true });
    try {
      const rows = await api('/api/federated-sources');
      set({ sources: (rows as Record<string, unknown>[]).map(toClient) });
    } catch { /* ignore if server unavailable */ }
    set({ loading: false });
  },

  fetchDocuments: async () => {
    try {
      const rows = await api('/api/federated-documents');
      set({ documents: (rows as Record<string, unknown>[]).map(toDocClient) });
    } catch { /* ignore */ }
  },

  createSource: async (source) => {
    const body = {
      name: source.name,
      type: source.type,
      endpoint_url: source.endpointUrl,
      auth_type: source.authType,
      auth_config: source.authConfig,
      result_mapping: source.resultMapping,
      trigger_config: source.triggerConfig,
      sync_interval_minutes: source.syncIntervalMinutes,
    };
    const row = await api('/api/federated-sources', { method: 'POST', body: JSON.stringify(body) });
    if (!row) return null;
    const created = toClient(row as Record<string, unknown>);
    set((s) => ({ sources: [created, ...s.sources] }));
    return created;
  },

  updateSource: async (id, partial) => {
    const body: Record<string, unknown> = {};
    if (partial.name !== undefined) body.name = partial.name;
    if (partial.type !== undefined) body.type = partial.type;
    if (partial.endpointUrl !== undefined) body.endpoint_url = partial.endpointUrl;
    if (partial.authType !== undefined) body.auth_type = partial.authType;
    if (partial.authConfig !== undefined) body.auth_config = partial.authConfig;
    if (partial.resultMapping !== undefined) body.result_mapping = partial.resultMapping;
    if (partial.triggerConfig !== undefined) body.trigger_config = partial.triggerConfig;
    if (partial.syncIntervalMinutes !== undefined) body.sync_interval_minutes = partial.syncIntervalMinutes;
    if (partial.enabled !== undefined) body.enabled = partial.enabled;

    const row = await api(`/api/federated-sources/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    if (row) {
      const updated = toClient(row as Record<string, unknown>);
      set((s) => ({ sources: s.sources.map((src) => src.id === id ? updated : src) }));
    }
  },

  deleteSource: async (id) => {
    await api(`/api/federated-sources/${id}`, { method: 'DELETE' });
    set((s) => ({
      sources: s.sources.filter((src) => src.id !== id),
      documents: s.documents.filter((d) => d.sourceId !== id),
    }));
  },

  syncSource: async (id) => {
    set((s) => ({ syncing: { ...s.syncing, [id]: true } }));
    try {
      const result = await api(`/api/federated-sources/${id}/sync`, { method: 'POST' });
      await get().fetchSources();
      await get().fetchDocuments();
      return result as { documentCount: number };
    } finally {
      set((s) => ({ syncing: { ...s.syncing, [id]: false } }));
    }
  },
}));
