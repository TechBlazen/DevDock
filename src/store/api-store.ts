import { create } from 'zustand';
import { apisApi } from '../lib/api';
import { useAuthStore } from './index';
import { useRepoStore } from './index';
import { parseSpec } from '../lib/openapi';
import {
  fetchGitHubFile, fetchADOFile, listGitHubSpecFiles, listADOSpecFiles,
} from '../lib/repos';
import { useSettingsStore } from './index';
import type { Repository } from '../types';

// ─── API spec store ─────────────────────────────────────────────────────────
// APIs are first-class shared entities like repos. The store mirrors the
// useRepoStore pattern: load on app boot, optimistic mutations + server sync,
// derived reads run over the local cache.
//
// Discovery: discoverFromRepo() walks a repo's tree for openapi/swagger
// files, fetches each, parses it, and creates an API row per spec found.
// The browser already has the user's GitHub/ADO PATs in settings, so
// discovery is browser-driven and the server only persists results.

export interface ApiSpec {
  id: string;
  name: string;
  description: string;
  sourceRepoId?: string;
  sourceRepoName?: string;
  sourceUrl: string;
  specKind: 'swagger' | 'openapi';
  specVersion?: string;
  specRaw: string;
  baseUrl?: string;
  addedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryResult {
  imported: ApiSpec[];
  skipped: { path: string; reason: string }[];
}

interface ApiStore {
  apis: ApiSpec[];
  loadingApis: boolean;
  syncError: string | null;

  loadApis: () => Promise<void>;
  /** Fetch a spec from a URL, parse it, and persist. */
  addApiByUrl: (url: string) => Promise<ApiSpec | null>;
  /** Walk a registered repo for spec files, parse each, and persist them. */
  discoverFromRepo: (repo: Repository) => Promise<DiscoveryResult>;
  removeApi: (id: string) => Promise<void>;
}

export const useApiStore = create<ApiStore>()((set, get) => ({
  apis: [],
  loadingApis: false,
  syncError: null,

  loadApis: async () => {
    set({ loadingApis: true, syncError: null });
    try {
      const apis = (await apisApi.list()) as ApiSpec[];
      set({ apis, loadingApis: false });
    } catch (e) {
      set({ loadingApis: false, syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  addApiByUrl: async (url) => {
    const trimmed = url.trim();
    if (!trimmed) return null;
    try {
      const text = await fetchSpecText(trimmed);
      const parsed = await parseSpec(text);
      const created = (await apisApi.create({
        name: parsed.info.title,
        description: parsed.info.description,
        sourceUrl: trimmed,
        specKind: parsed.kind,
        specVersion: parsed.version,
        specRaw: text,
        baseUrl: parsed.baseUrl,
      })) as ApiSpec;
      set((s) => ({ apis: [created, ...s.apis] }));
      return created;
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  discoverFromRepo: async (repo) => {
    const result: DiscoveryResult = { imported: [], skipped: [] };
    const settings = useSettingsStore.getState().settings;
    const existing = new Set(get().apis.map((a) => a.sourceUrl));

    try {
      const candidates = await listSpecFilesInRepo(repo, settings);
      for (const candidate of candidates) {
        if (existing.has(candidate.sourceUrl)) {
          result.skipped.push({ path: candidate.path, reason: 'already imported' });
          continue;
        }
        try {
          const text = await fetchSpecFromRepo(repo, candidate.path, settings);
          const parsed = await parseSpec(text);
          const created = (await apisApi.create({
            name: parsed.info.title || candidate.path,
            description: parsed.info.description,
            sourceRepoId: repo.id,
            sourceRepoName: repo.name,
            sourceUrl: candidate.sourceUrl,
            specKind: parsed.kind,
            specVersion: parsed.version,
            specRaw: text,
            baseUrl: parsed.baseUrl,
          })) as ApiSpec;
          result.imported.push(created);
        } catch (e) {
          result.skipped.push({ path: candidate.path, reason: e instanceof Error ? e.message : String(e) });
        }
      }
      if (result.imported.length > 0) {
        set((s) => ({ apis: [...result.imported, ...s.apis] }));
      }
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
    return result;
  },

  removeApi: async (id) => {
    set((s) => ({ apis: s.apis.filter((a) => a.id !== id) }));
    try {
      await apisApi.delete(id);
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
  },
}));

// ─── Internal helpers ───────────────────────────────────────────────────────

async function fetchSpecText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
  return res.text();
}

interface RepoSpecCandidate {
  path: string;
  /** Stable URL pointing to the spec inside the repo (used for dedup). */
  sourceUrl: string;
}

async function listSpecFilesInRepo(
  repo: Repository,
  settings: ReturnType<typeof useSettingsStore.getState>['settings'],
): Promise<RepoSpecCandidate[]> {
  if (repo.source === 'github') {
    const token = settings.github.accessToken;
    const [owner, name] = repo.fullName.split('/');
    if (!owner || !name) return [];
    const files = await listGitHubSpecFiles(owner, name, token || undefined);
    return files.map((f) => ({
      path: f.path,
      sourceUrl: `${repo.webUrl}/blob/${repo.defaultBranch}/${f.path}`,
    }));
  }
  // ADO
  const pat = settings.ado.personalAccessToken;
  const m = repo.webUrl.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/(.+)/);
  if (!m || !pat) return [];
  const [, org, project, repoName] = m;
  const files = await listADOSpecFiles(org, project, repoName, pat);
  return files.map((f) => ({
    path: f.path,
    sourceUrl: `${repo.webUrl}?path=${encodeURIComponent(f.path)}`,
  }));
}

async function fetchSpecFromRepo(
  repo: Repository,
  path: string,
  settings: ReturnType<typeof useSettingsStore.getState>['settings'],
): Promise<string> {
  if (repo.source === 'github') {
    const token = settings.github.accessToken;
    const [owner, name] = repo.fullName.split('/');
    const fetched = await fetchGitHubFile(owner, name, path, token || undefined);
    return fetched.content;
  }
  const pat = settings.ado.personalAccessToken;
  const m = repo.webUrl.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/(.+)/);
  if (!m) throw new Error('Cannot parse ADO repo URL');
  const [, org, project, repoName] = m;
  return fetchADOFile(org, project, repoName, path, pat || undefined);
}

// Prevent the unused-import warning on useRepoStore — kept available so
// the page can prompt the user with their registered repo list when they
// trigger discovery.
void useRepoStore;
void useAuthStore;
