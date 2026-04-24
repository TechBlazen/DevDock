import axios from 'axios';

// ─── API Client ─────────────────────────────────────────────────────────────
// Thin wrapper around axios for all backend API calls.
// The Vite dev server proxies /api to http://localhost:3000.

const api = axios.create({ baseURL: '/api' });

// Attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devdock-api-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Health ─────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get<{ status: string; provider: string; uptime: number }>('/health').then(r => r.data),
};

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; user: Record<string, unknown> }>('/auth/login', { username, password }).then(r => r.data),
  verify: () =>
    api.post<{ user: Record<string, unknown> }>('/auth/verify').then(r => r.data),
};

// ─── Users ──────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users').then(r => r.data),
  get: (id: string) => api.get(`/users/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/users', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/users/${id}`).then(r => r.data),
  updatePreferences: (id: string, prefs: Record<string, unknown>) => api.put(`/users/${id}/preferences`, prefs).then(r => r.data),
  toggleFavorite: (id: string, repoId: string) => api.put(`/users/${id}/favorites`, { repoId }).then(r => r.data),
  updateDashboard: (id: string, widgets: string[]) => api.put(`/users/${id}/dashboard`, { widgets }).then(r => r.data),
};

// ─── Semantic Search ────────────────────────────────────────────────────────
export interface SemanticHit {
  parentId: string;
  kind: 'doc' | 'doc-readme' | 'federated' | 'forum-thread' | 'forum-answer';
  title: string;
  snippet: string;
  heading: string | null;
  metadata: Record<string, string | number | boolean>;
  distance: number;
}

export const semanticSearchApi = {
  search: (query: string, opts?: { kind?: string | string[]; k?: number }) =>
    api.post<{ hits: SemanticHit[] }>('/search/semantic', { query, ...opts }).then(r => r.data.hits),
};

// ─── Repos ──────────────────────────────────────────────────────────────────
export const reposApi = {
  list: (source?: 'github' | 'ado') => api.get('/repos', { params: source ? { source } : {} }).then(r => r.data),
  get: (id: string) => api.get(`/repos/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/repos', data).then(r => r.data),
  updateMeta: (id: string, meta: Record<string, unknown>) => api.put(`/repos/${id}/meta`, meta).then(r => r.data),
  delete: (id: string) => api.delete(`/repos/${id}`).then(r => r.data),
};

// ─── Settings ───────────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings').then(r => r.data),
  update: (data: Record<string, unknown>) => api.put('/settings', data).then(r => r.data),
};

// ─── Forum ──────────────────────────────────────────────────────────────────
// Votes: the client computes the post-toggle votes array locally via applyVote
// and PUTs the full array. Keeps the server stateless on vote semantics.
export const forumApi = {
  listThreads: () => api.get('/forum/threads').then(r => r.data),
  getThread: (id: string) => api.get(`/forum/threads/${id}`).then(r => r.data),
  createThread: (data: Record<string, unknown>) => api.post('/forum/threads', data).then(r => r.data),
  updateThread: (id: string, data: Record<string, unknown>) => api.put(`/forum/threads/${id}`, data).then(r => r.data),
  deleteThread: (id: string) => api.delete(`/forum/threads/${id}`).then(r => r.data),

  createAnswer: (threadId: string, data: Record<string, unknown>) => api.post(`/forum/threads/${threadId}/answers`, data).then(r => r.data),
  updateAnswer: (id: string, data: Record<string, unknown>) => api.put(`/forum/answers/${id}`, data).then(r => r.data),
  deleteAnswer: (id: string) => api.delete(`/forum/answers/${id}`).then(r => r.data),
};

// ─── Feature Requests ───────────────────────────────────────────────────────
export const featureRequestsApi = {
  list: () => api.get('/feature-requests').then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/feature-requests', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/feature-requests/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/feature-requests/${id}`).then(r => r.data),
};

// ─── Bookmarks ──────────────────────────────────────────────────────────────
export const bookmarksApi = {
  list: () => api.get('/bookmarks').then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/bookmarks', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/bookmarks/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/bookmarks/${id}`).then(r => r.data),
};

// ─── Collections ────────────────────────────────────────────────────────────
export const collectionsApi = {
  list: () => api.get('/collections').then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/collections', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/collections/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/collections/${id}`).then(r => r.data),
};

// ─── Docs ───────────────────────────────────────────────────────────────────
export const docsApi = {
  list: () => api.get('/docs').then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/docs', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/docs/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/docs/${id}`).then(r => r.data),
};

// ─── Plugins ────────────────────────────────────────────────────────────────
export const pluginsApi = {
  getState: () => api.get('/plugins/state').then(r => r.data),
  updateState: (data: Record<string, unknown>) => api.put('/plugins/state', data).then(r => r.data),
};

// ─── Analytics ──────────────────────────────────────────────────────────────
export const analyticsApi = {
  trackPageView: (path: string) => api.post('/analytics/pageview', { path }).then(r => r.data),
  trackError: (data: { message: string; stack?: string; path: string }) => api.post('/analytics/error', data).then(r => r.data),
  getPageViews: (limit?: number) => api.get('/analytics/pageviews', { params: limit ? { limit } : {} }).then(r => r.data),
  getErrors: (limit?: number) => api.get('/analytics/errors', { params: limit ? { limit } : {} }).then(r => r.data),
};

// ─── SQL Tool ───────────────────────────────────────────────────────────────
export const sqlApi = {
  testConnection: (conn: Record<string, unknown>) => api.post('/sql/test', conn).then(r => r.data),
  executeQuery: (conn: Record<string, unknown>, sql: string) => api.post('/sql/query', { ...conn, sql }).then(r => r.data),
  getTables: (conn: Record<string, unknown>) => api.post('/sql/tables', conn).then(r => r.data),
  getColumns: (conn: Record<string, unknown>, table: string, schema?: string) => api.post('/sql/columns', { ...conn, table, schema }).then(r => r.data),
  getProcedures: (conn: Record<string, unknown>) => api.post('/sql/procedures', conn).then(r => r.data),
};

// ─── Code Runner ────────────────────────────────────────────────────────────
export const codeApi = {
  run: (language: string, code: string) => api.post('/code/run', { language, code }).then(r => r.data),
  getLanguages: () => api.get<Record<string, { installed: boolean; version: string }>>('/code/languages').then(r => r.data),
};

// ─── Directory (LDAP) ───────────────────────────────────────────────────────
export const directoryApi = {
  testConnection: (config: Record<string, unknown>) => api.post('/directory/test', config).then(r => r.data),
  listUsers: (config: Record<string, unknown>, search?: string, limit?: number) =>
    api.post('/directory/users', { ...config, search, limit }).then(r => r.data),
  listGroups: (config: Record<string, unknown>, search?: string, limit?: number) =>
    api.post('/directory/groups', { ...config, search, limit }).then(r => r.data),
  getGroupMembers: (config: Record<string, unknown>, groupDn: string) =>
    api.post('/directory/groups/members', { ...config, groupDn }).then(r => r.data),
};

// ─── Server availability check ──────────────────────────────────────────────
// Returns true if the API server is reachable, false otherwise.
// Used to decide whether to persist via API or fall back to localStorage.
export async function isApiAvailable(): Promise<boolean> {
  try {
    await api.get('/health', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
