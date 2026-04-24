// Postgres provider contract test.
//
// Verifies the PostgresProvider implements the same observable behavior as the
// SQLite provider for the common CRUD paths the app actually exercises.
// Gated by TEST_POSTGRES_URL so contributors without a running Postgres instance
// still pass. Bring one up with:
//
//   docker compose -f docker-compose.test.yml up -d
//   TEST_POSTGRES_URL=postgres://devdock:devdock@localhost:5433/devdock_test \
//     npm run test:server
//
// The test uses `TRUNCATE … RESTART IDENTITY CASCADE` between runs rather than
// tearing down tables, so repeated runs are fast.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PostgresProvider } from '../postgres/client.js';
import type {
  RepoRow, UserRow, SettingsRow, BookmarkRow, CollectionRow, DocRow,
  FederatedSourceRow, FederatedDocumentRow,
  ForumThreadRow, ForumAnswerRow, FeatureRequestRow,
} from '../provider.js';

const TEST_URL = process.env.TEST_POSTGRES_URL;
const describeIfPg = TEST_URL ? describe : describe.skip;

describeIfPg('PostgresProvider (integration)', () => {
  let provider: PostgresProvider;

  beforeAll(async () => {
    provider = new PostgresProvider(TEST_URL!);
    await provider.connect();
    await provider.migrate();
  });

  afterAll(async () => {
    if (provider) await provider.disconnect();
  });

  beforeEach(async () => {
    // Fast reset between tests — keeps schema, drops rows.
    const client = new pg.Client({ connectionString: TEST_URL });
    await client.connect();
    try {
      await client.query(`
        TRUNCATE TABLE
          federated_documents, federated_sources, analytics_errors, analytics_page_views,
          plugins_state, docs, bookmarks, collections, repos, settings,
          feature_requests, forum_answers, forum_threads, users
        RESTART IDENTITY CASCADE
      `);
    } finally {
      await client.end();
    }
  });

  // ─── Users ───────────────────────────────────────────────────────────────
  it('creates, reads, updates, and deletes a user', async () => {
    const user: UserRow = {
      id: 'u1', username: 'alice', password_hash: 'x', display_name: 'Alice',
      role: 'admin', permissions: '{"canEditDocs":true}',
      dashboard_widgets: '["repos_github"]',
      favorite_repos: '[]',
      preferences: '{}',
      created_at: '2026-01-01T00:00:00Z',
    };
    const created = await provider.createUser(user);
    expect(created.id).toBe('u1');

    const byId = await provider.getUserById('u1');
    expect(byId?.username).toBe('alice');
    // JSON columns must come back as strings for route-layer compatibility.
    expect(typeof byId?.permissions).toBe('string');
    expect(JSON.parse(byId!.permissions)).toEqual({ canEditDocs: true });

    const byName = await provider.getUserByUsername('alice');
    expect(byName?.id).toBe('u1');

    await provider.updateUser('u1', { display_name: 'Alice A.' });
    const updated = await provider.getUserById('u1');
    expect(updated?.display_name).toBe('Alice A.');

    await provider.deleteUser('u1');
    expect(await provider.getUserById('u1')).toBeNull();
  });

  // ─── Repos ───────────────────────────────────────────────────────────────
  it('round-trips a repo with JSON arrays and a boolean is_private', async () => {
    const repo: RepoRow = {
      id: 'r1', name: 'test', full_name: 'org/test', description: 'd',
      source: 'github', language: 'TypeScript', default_branch: 'main',
      stars: 5, forks: 1, is_private: 1, // SQLite-shaped input
      updated_at: '2026-01-01', clone_url: 'https://g/c', web_url: 'https://g/w',
      topics: JSON.stringify(['a', 'b']),
      environments: JSON.stringify(['PRD']),
      cloud_platform: 'GCP',
      owners: JSON.stringify([{ name: 'x', type: 'user' }]),
      custom_tags: JSON.stringify(['critical']),
      added_by: 'u1',
    };

    await provider.upsertRepo(repo);
    const got = await provider.getRepoById('r1');

    expect(got).not.toBeNull();
    // Boolean round-trip: stored as BOOLEAN, read back as 0/1 for route compat.
    expect(got!.is_private).toBe(1);
    expect(typeof got!.topics).toBe('string');
    expect(JSON.parse(got!.topics!)).toEqual(['a', 'b']);
    expect(JSON.parse(got!.owners!)).toEqual([{ name: 'x', type: 'user' }]);

    // Upsert is idempotent — same id replaces.
    await provider.upsertRepo({ ...repo, description: 'updated' });
    const after = await provider.getRepoById('r1');
    expect(after?.description).toBe('updated');

    const list = await provider.getRepos('github');
    expect(list).toHaveLength(1);

    await provider.deleteRepo('r1');
    expect(await provider.getRepoById('r1')).toBeNull();
  });

  // ─── Settings ────────────────────────────────────────────────────────────
  it('upserts settings and replaces on conflict', async () => {
    const s: SettingsRow = {
      id: 'global',
      ai_config: '{"provider":"anthropic"}',
      otel_config: '{}',
      github_config: '{}',
      ado_config: '{}',
      theme: 'dark',
      dashboard_widgets: '["quick_actions"]',
    };
    await provider.upsertSettings(s);
    const got = await provider.getSettings();
    expect(JSON.parse(got!.ai_config)).toEqual({ provider: 'anthropic' });

    await provider.upsertSettings({ ...s, theme: 'light' });
    const after = await provider.getSettings();
    expect(after!.theme).toBe('light');
  });

  // ─── Collections + Bookmarks ────────────────────────────────────────────
  it('scopes bookmarks by user and cascades collection deletion', async () => {
    const coll: CollectionRow = {
      id: 'c1', user_id: 'u1', name: 'Reading',
      created_at: 't', updated_at: 't',
    };
    await provider.createCollection(coll);

    const bookmark: BookmarkRow = {
      id: 'b1', user_id: 'u1', title: 'A post', url: 'https://x',
      collection_id: 'c1', tags: '["ai"]', favorite: 1,
      content_type: 'article', created_at: 't', updated_at: 't',
    };
    await provider.createBookmark(bookmark);

    const mine = await provider.getBookmarks('u1');
    expect(mine).toHaveLength(1);
    // Boolean round-trip
    expect(mine[0].favorite).toBe(1);
    expect(JSON.parse(mine[0].tags)).toEqual(['ai']);

    const other = await provider.getBookmarks('u2');
    expect(other).toEqual([]);

    // Deleting the collection sets bookmark.collection_id → NULL per FK rule.
    await provider.deleteCollection('c1');
    const afterDelete = await provider.getBookmarks('u1');
    expect(afterDelete[0].collection_id).toBeNull();
  });

  // ─── Docs ────────────────────────────────────────────────────────────────
  it('CRUDs a doc', async () => {
    const d: DocRow = {
      id: 'd1', title: 'Hello', content: '# Hi', tags: '["intro"]',
      created_at: 't', updated_at: 't',
    };
    await provider.createDoc(d);
    const got = (await provider.getDocs())[0];
    expect(got.title).toBe('Hello');

    await provider.updateDoc('d1', { title: 'Hi' });
    expect((await provider.getDocs())[0].title).toBe('Hi');

    await provider.deleteDoc('d1');
    expect(await provider.getDocs()).toEqual([]);
  });

  // ─── Plugin state (singleton row) ────────────────────────────────────────
  it('lazily initialises the plugin state singleton', async () => {
    const first = await provider.getPluginState();
    expect(first.id).toBe('singleton');

    await provider.updatePluginState({ enabled_plugins: '{"notes":true}' });
    const second = await provider.getPluginState();
    expect(JSON.parse(second.enabled_plugins)).toEqual({ notes: true });
  });

  // ─── Analytics ───────────────────────────────────────────────────────────
  it('records page views and errors bounded by limit', async () => {
    for (let i = 0; i < 3; i++) {
      await provider.trackPageView({
        id: `pv${i}`, user_id: 'u1', user_name: 'Alice',
        path: `/p/${i}`, timestamp: new Date(Date.now() + i).toISOString(),
      });
    }
    await provider.trackError({
      id: 'e1', user_id: 'u1', user_name: 'Alice', message: 'boom',
      path: '/x', timestamp: '2026-01-01',
    });

    expect(await provider.getPageViews()).toHaveLength(3);
    expect((await provider.getPageViews(2))).toHaveLength(2);
    expect(await provider.getErrors()).toHaveLength(1);
  });

  // ─── Federated sources + documents (tx path) ─────────────────────────────
  it('atomically replaces federated documents for a source', async () => {
    // Source creation requires a user because of FK created_by → users(id).
    await provider.createUser({
      id: 'u1', username: 'alice', password_hash: 'x', display_name: 'Alice',
      role: 'admin', permissions: '{}', created_at: 't',
    });
    const src: FederatedSourceRow = {
      id: 's1', name: 'Intranet', type: 'rest-api',
      endpoint_url: 'https://intra', auth_type: 'none',
      auth_config: '{}', result_mapping: '{}', trigger_config: '{}',
      sync_interval_minutes: 0, document_count: 0, enabled: 1,
      created_by: 'u1', created_at: 't', updated_at: 't',
    };
    await provider.createFederatedSource(src);
    const byId = await provider.getFederatedSourceById('s1');
    expect(byId?.enabled).toBe(1);

    const docs: FederatedDocumentRow[] = [
      { id: 'fd1', source_id: 's1', title: 'Doc 1', description: '', url: '', tags: '', content: '', extra: '', meta: '{}', fetched_at: 't' },
      { id: 'fd2', source_id: 's1', title: 'Doc 2', description: '', url: '', tags: '', content: '', extra: '', meta: '{}', fetched_at: 't' },
    ];
    await provider.replaceFederatedDocuments('s1', docs);
    expect(await provider.getFederatedDocuments('s1')).toHaveLength(2);

    // Second replace wipes + re-inserts in one tx.
    await provider.replaceFederatedDocuments('s1', [docs[0]]);
    expect(await provider.getFederatedDocuments('s1')).toHaveLength(1);

    await provider.deleteFederatedSource('s1');
    // ON DELETE CASCADE should have removed the docs.
    expect(await provider.getAllFederatedDocuments()).toEqual([]);
  });

  // ─── Forum threads + answers + feature requests ──────────────────────────
  it('round-trips a forum thread with JSON tags/votes', async () => {
    const thread: ForumThreadRow = {
      id: 't1', title: 'How do I X?', body: 'Body text', category: 'how-to',
      tags: JSON.stringify(['kubernetes', 'gke']),
      author_id: 'u1', author_name: 'Alice',
      votes: JSON.stringify([{ userId: 'u2', value: 1, createdAt: 't' }]),
      view_count: 3, created_at: 't', updated_at: 't',
    };
    await provider.createForumThread(thread);
    const got = await provider.getForumThreadById('t1');
    expect(got).not.toBeNull();
    expect(JSON.parse(got!.tags)).toEqual(['kubernetes', 'gke']);
    expect(JSON.parse(got!.votes)).toHaveLength(1);

    await provider.updateForumThread('t1', { view_count: 10 });
    expect((await provider.getForumThreadById('t1'))?.view_count).toBe(10);

    await provider.deleteForumThread('t1');
    expect(await provider.getForumThreadById('t1')).toBeNull();
  });

  it('cascade-deletes answers when thread is removed and round-trips is_accepted', async () => {
    const thread: ForumThreadRow = {
      id: 't2', title: 'T', body: '', category: 'question',
      tags: '[]', author_id: 'u1', author_name: 'A',
      votes: '[]', view_count: 0, created_at: 't', updated_at: 't',
    };
    await provider.createForumThread(thread);

    const answer: ForumAnswerRow = {
      id: 'a1', thread_id: 't2', author_id: 'u2', author_name: 'B',
      body: 'Answer body',
      votes: JSON.stringify([{ userId: 'u1', value: 1, createdAt: 't' }]),
      is_accepted: 1, created_at: 't', updated_at: 't',
    };
    await provider.createForumAnswer(answer);
    const got = (await provider.getForumAnswersByThread('t2'))[0];
    // BOOLEAN round-trips as 0/1 via mapRow for route-layer parity.
    expect(got.is_accepted).toBe(1);
    expect(JSON.parse(got.votes)).toHaveLength(1);

    await provider.deleteForumThread('t2');
    expect(await provider.getForumAnswersByThread('t2')).toEqual([]);
  });

  it('CRUDs a feature request with attachments JSON', async () => {
    const req: FeatureRequestRow = {
      id: 'fr1', title: 'Dark mode scheduler',
      description: 'Auto-switch by time of day',
      author_id: 'u1', author_name: 'Alice',
      status: 'open',
      votes: JSON.stringify([{ userId: 'u2', value: 1, createdAt: 't' }]),
      attachments: JSON.stringify([{ id: 'att1', name: 'mock.png', url: 'data:', type: 'image/png', size: 123 }]),
      tags: JSON.stringify(['Platform']),
      created_at: 't', updated_at: 't',
    };
    await provider.createFeatureRequest(req);
    const got = await provider.getFeatureRequestById('fr1');
    expect(got?.status).toBe('open');
    expect(JSON.parse(got!.attachments)).toHaveLength(1);

    await provider.updateFeatureRequest('fr1', { status: 'planned' });
    expect((await provider.getFeatureRequestById('fr1'))?.status).toBe('planned');

    await provider.deleteFeatureRequest('fr1');
    expect(await provider.getFeatureRequestById('fr1')).toBeNull();
  });
});
