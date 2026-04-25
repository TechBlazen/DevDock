import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

// Mock the API client and the spec-fetch helpers so the store runs end-to-end
// in a pure-Node environment. The mocks are designed to round-trip the data
// the real server would persist (id + timestamps), so the store-level
// invariants (prepend on create, optimistic remove, dedup in discover) stay
// meaningfully assertable.
vi.mock('../../lib/api', () => {
  let nextId = 1;
  const mkId = () => `mock-${nextId++}`;
  const apisApi = {
    list: vi.fn(async () => []),
    get: vi.fn(),
    create: vi.fn(async (data: Record<string, unknown>) => ({
      id: mkId(),
      name: data.name ?? '(untitled)',
      description: data.description ?? '',
      sourceRepoId: data.sourceRepoId,
      sourceRepoName: data.sourceRepoName,
      sourceUrl: data.sourceUrl,
      specKind: data.specKind ?? 'openapi',
      specVersion: data.specVersion,
      specRaw: data.specRaw,
      baseUrl: data.baseUrl,
      addedBy: 'test-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  };
  return { apisApi };
});

const SAMPLE_SPEC = `
openapi: 3.0.1
info:
  title: Sample
  version: 1.0.0
servers:
  - url: https://api.sample.test
paths:
  /ping:
    get:
      operationId: ping
      responses:
        '200':
          description: OK
`;

vi.mock('../../lib/repos', () => ({
  fetchGitHubFile: vi.fn(async () => ({ content: SAMPLE_SPEC })),
  fetchADOFile: vi.fn(async () => SAMPLE_SPEC),
  listGitHubSpecFiles: vi.fn(async () => [
    { path: 'openapi.yaml', name: 'openapi.yaml' },
    { path: 'docs/swagger.json', name: 'swagger.json' },
  ]),
  listADOSpecFiles: vi.fn(async () => []),
}));

// fetch is used by addApiByUrl
const realFetch = global.fetch;
beforeEach(() => {
  global.fetch = vi.fn(async () => ({
    ok: true,
    text: async () => SAMPLE_SPEC,
  })) as unknown as typeof global.fetch;
});

const { useApiStore } = await import('../../store/api-store');

describe('useApiStore', () => {
  beforeEach(() => {
    useApiStore.setState({ apis: [], loadingApis: false, syncError: null });
  });

  it('addApiByUrl fetches, parses, and prepends the new API', async () => {
    const created = await useApiStore.getState().addApiByUrl('https://example.com/openapi.yaml');
    expect(created).not.toBeNull();
    expect(created!.name).toBe('Sample');
    expect(created!.specKind).toBe('openapi');
    expect(created!.baseUrl).toBe('https://api.sample.test');

    const apis = useApiStore.getState().apis;
    expect(apis).toHaveLength(1);
    expect(apis[0].id).toBe(created!.id);
  });

  it('addApiByUrl returns null and sets syncError on fetch failure', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, text: async () => '' })) as unknown as typeof global.fetch;
    const result = await useApiStore.getState().addApiByUrl('https://broken.example/spec.yaml');
    expect(result).toBeNull();
    expect(useApiStore.getState().syncError).toMatch(/HTTP 500/);
  });

  it('addApiByUrl ignores empty URLs', async () => {
    const result = await useApiStore.getState().addApiByUrl('   ');
    expect(result).toBeNull();
    expect(useApiStore.getState().apis).toHaveLength(0);
  });

  it('removeApi optimistically removes from state', async () => {
    const created = await useApiStore.getState().addApiByUrl('https://example.com/openapi.yaml');
    expect(useApiStore.getState().apis).toHaveLength(1);
    await useApiStore.getState().removeApi(created!.id);
    expect(useApiStore.getState().apis).toHaveLength(0);
  });

  it('discoverFromRepo imports each spec found and tracks skipped duplicates', async () => {
    const repo = {
      id: 'r1',
      name: 'demo',
      fullName: 'org/demo',
      description: '',
      source: 'github' as const,
      language: 'TypeScript',
      defaultBranch: 'main',
      isPrivate: false,
      updatedAt: '1h ago',
      cloneUrl: 'https://github.com/org/demo.git',
      webUrl: 'https://github.com/org/demo',
    };

    const first = await useApiStore.getState().discoverFromRepo(repo);
    expect(first.imported).toHaveLength(2);
    expect(first.skipped).toHaveLength(0);
    expect(useApiStore.getState().apis).toHaveLength(2);

    // Second run dedupes by sourceUrl — both candidates should be skipped.
    const second = await useApiStore.getState().discoverFromRepo(repo);
    expect(second.imported).toHaveLength(0);
    expect(second.skipped).toHaveLength(2);
    expect(second.skipped[0].reason).toMatch(/already imported/);
  });

  it('loadApis populates the store from the API', async () => {
    const { apisApi } = await import('../../lib/api');
    (apisApi.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 'a1', name: 'Existing', description: '', sourceUrl: 'u', specKind: 'openapi', specRaw: 'x', createdAt: 't', updatedAt: 't' },
    ]);
    await useApiStore.getState().loadApis();
    expect(useApiStore.getState().apis).toHaveLength(1);
    expect(useApiStore.getState().apis[0].name).toBe('Existing');
    expect(useApiStore.getState().loadingApis).toBe(false);
  });
});

afterAll(() => {
  global.fetch = realFetch;
});
