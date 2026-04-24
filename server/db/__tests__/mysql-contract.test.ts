// MySQL provider contract test.
//
// Mirrors postgres-contract.test.ts so the two providers stay in lockstep.
// Gated by TEST_MYSQL_URL — without it set, the suite is skipped.
//
//   docker compose -f docker-compose.test.yml up -d mysql-test
//   TEST_MYSQL_URL=mysql://devdock:devdock@localhost:3307/devdock_test \
//     npm run test:server
//
// Uses TRUNCATE between tests for speed; FK_CHECKS toggled around it because
// MySQL refuses to TRUNCATE a parent table while children reference it.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mysql from 'mysql2/promise';
import { MysqlProvider } from '../mysql/client.js';
import type {
  RepoRow, UserRow, SettingsRow, BookmarkRow, CollectionRow, DocRow,
  FederatedSourceRow, FederatedDocumentRow,
  ForumThreadRow, ForumAnswerRow, FeatureRequestRow,
} from '../provider.js';

const TEST_URL = process.env.TEST_MYSQL_URL;
const describeIfMysql = TEST_URL ? describe : describe.skip;

describeIfMysql('MysqlProvider (integration)', () => {
  let provider: MysqlProvider;

  beforeAll(async () => {
    provider = new MysqlProvider(TEST_URL!);
    await provider.connect();
    await provider.migrate();
  });

  afterAll(async () => {
    if (provider) await provider.disconnect();
  });

  beforeEach(async () => {
    const conn = await mysql.createConnection(TEST_URL!);
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      const tables = [
        'federated_documents', 'federated_sources', 'analytics_errors',
        'analytics_page_views', 'plugins_state', 'docs', 'bookmarks',
        'collections', 'repos', 'settings',
        'feature_requests', 'forum_answers', 'forum_threads',
        'users',
      ];
      for (const t of tables) {
        await conn.query(`TRUNCATE TABLE ${t}`);
      }
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      await conn.end();
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
    await provider.createUser(user);

    const byId = await provider.getUserById('u1');
    expect(byId?.username).toBe('alice');
    expect(typeof byId?.permissions).toBe('string');
    expect(JSON.parse(byId!.permissions)).toEqual({ canEditDocs: true });

    const byName = await provider.getUserByUsername('alice');
    expect(byName?.id).toBe('u1');

    await provider.updateUser('u1', { display_name: 'Alice A.' });
    expect((await provider.getUserById('u1'))?.display_name).toBe('Alice A.');

    await provider.deleteUser('u1');
    expect(await provider.getUserById('u1')).toBeNull();
  });

  // ─── Repos ───────────────────────────────────────────────────────────────
  it('round-trips a repo with JSON arrays and a TINYINT(1) is_private', async () => {
    const repo: RepoRow = {
      id: 'r1', name: 'test', full_name: 'org/test', description: 'd',
      source: 'github', language: 'TypeScript', default_branch: 'main',
      stars: 5, forks: 1, is_private: 1,
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
    expect(got!.is_private).toBe(1);
    expect(typeof got!.topics).toBe('string');
    expect(JSON.parse(got!.topics!)).toEqual(['a', 'b']);
    expect(JSON.parse(got!.owners!)).toEqual([{ name: 'x', type: 'user' }]);

    // Upsert idempotency: same id replaces.
    await provider.upsertRepo({ ...repo, description: 'updated' });
    expect((await provider.getRepoById('r1'))?.description).toBe('updated');

    expect(await provider.getRepos('github')).toHaveLength(1);

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
    expect(JSON.parse((await provider.getSettings())!.ai_config)).toEqual({ provider: 'anthropic' });

    await provider.upsertSettings({ ...s, theme: 'light' });
    expect((await provider.getSettings())!.theme).toBe('light');
  });

  // ─── Collections + Bookmarks ────────────────────────────────────────────
  it('scopes bookmarks by user and SET NULL on collection delete', async () => {
    await provider.createCollection({
      id: 'c1', user_id: 'u1', name: 'Reading', created_at: 't', updated_at: 't',
    } as CollectionRow);

    await provider.createBookmark({
      id: 'b1', user_id: 'u1', title: 'A post', url: 'https://x',
      collection_id: 'c1', tags: '["ai"]', favorite: 1,
      content_type: 'article', created_at: 't', updated_at: 't',
    } as BookmarkRow);

    const mine = await provider.getBookmarks('u1');
    expect(mine).toHaveLength(1);
    expect(mine[0].favorite).toBe(1);
    expect(JSON.parse(mine[0].tags)).toEqual(['ai']);

    expect(await provider.getBookmarks('u2')).toEqual([]);

    await provider.deleteCollection('c1');
    expect((await provider.getBookmarks('u1'))[0].collection_id).toBeNull();
  });

  // ─── Docs ────────────────────────────────────────────────────────────────
  it('CRUDs a doc', async () => {
    const d: DocRow = {
      id: 'd1', title: 'Hello', content: '# Hi', tags: '["intro"]',
      created_at: 't', updated_at: 't',
    };
    await provider.createDoc(d);
    expect((await provider.getDocs())[0].title).toBe('Hello');

    await provider.updateDoc('d1', { title: 'Hi' });
    expect((await provider.getDocs())[0].title).toBe('Hi');

    await provider.deleteDoc('d1');
    expect(await provider.getDocs()).toEqual([]);
  });

  // ─── Plugin state ────────────────────────────────────────────────────────
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
    expect(await provider.getPageViews(2)).toHaveLength(2);
    expect(await provider.getErrors()).toHaveLength(1);
  });

  // ─── Federated sources + documents (tx path) ─────────────────────────────
  it('atomically replaces federated documents for a source', async () => {
    await provider.createUser({
      id: 'u1', username: 'alice', password_hash: 'x', display_name: 'Alice',
      role: 'admin', permissions: '{}', created_at: 't',
    } as UserRow);

    const src: FederatedSourceRow = {
      id: 's1', name: 'Intranet', type: 'rest-api',
      endpoint_url: 'https://intra', auth_type: 'none',
      auth_config: '{}', result_mapping: '{}', trigger_config: '{}',
      sync_interval_minutes: 0, document_count: 0, enabled: 1,
      created_by: 'u1', created_at: 't', updated_at: 't',
    };
    await provider.createFederatedSource(src);
    expect((await provider.getFederatedSourceById('s1'))?.enabled).toBe(1);

    const docs: FederatedDocumentRow[] = [
      { id: 'fd1', source_id: 's1', title: 'Doc 1', description: '', url: '', tags: '', content: '', extra: '', meta: '{}', fetched_at: 't' },
      { id: 'fd2', source_id: 's1', title: 'Doc 2', description: '', url: '', tags: '', content: '', extra: '', meta: '{}', fetched_at: 't' },
    ];
    await provider.replaceFederatedDocuments('s1', docs);
    expect(await provider.getFederatedDocuments('s1')).toHaveLength(2);

    await provider.replaceFederatedDocuments('s1', [docs[0]]);
    expect(await provider.getFederatedDocuments('s1')).toHaveLength(1);

    await provider.deleteFederatedSource('s1');
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
