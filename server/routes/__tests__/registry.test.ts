import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import type {
  DatabaseProvider, RegistryItemRow, RegistryVersionRow, RegistryInstallRow,
} from '../../db/provider.js';
import { registerRegistryRoutes } from '../registry.js';
import { createToken } from '../../middleware/auth.js';

// In-memory fake provider implementing only the registry surface the routes
// touch — keeps the test off the native sqlite binding while exercising the
// real route + governance + validation code paths via Fastify inject().
class FakeDb {
  items = new Map<string, RegistryItemRow>();
  versions: RegistryVersionRow[] = [];
  installs: RegistryInstallRow[] = [];

  async getRegistryItems() { return [...this.items.values()]; }
  async getRegistryItemById(id: string) { return this.items.get(id) ?? null; }
  async getRegistryItemBySlug(slug: string) { return [...this.items.values()].find((i) => i.slug === slug) ?? null; }
  async createRegistryItem(item: RegistryItemRow) { this.items.set(item.id, item); return item; }
  async updateRegistryItem(id: string, partial: Partial<RegistryItemRow>) {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...partial };
    this.items.set(id, updated);
    return updated;
  }
  async deleteRegistryItem(id: string) { this.items.delete(id); }
  async incrementRegistryInstallCount(id: string, delta: number) {
    const it = this.items.get(id);
    if (it) it.install_count = Math.max(0, it.install_count + delta);
  }
  async getRegistryVersions(itemId: string) { return this.versions.filter((v) => v.item_id === itemId); }
  async createRegistryVersion(v: RegistryVersionRow) { this.versions.push(v); return v; }
  async getRegistryInstalls(userId: string) { return this.installs.filter((i) => i.user_id === userId); }
  async getRegistryInstall(itemId: string, userId: string) { return this.installs.find((i) => i.item_id === itemId && i.user_id === userId) ?? null; }
  async createRegistryInstall(i: RegistryInstallRow) { this.installs.push(i); return i; }
  async updateRegistryInstall(id: string, partial: Partial<RegistryInstallRow>) {
    const ex = this.installs.find((i) => i.id === id);
    if (!ex) return null;
    Object.assign(ex, partial);
    return ex;
  }
  async deleteRegistryInstall(itemId: string, userId: string) {
    this.installs = this.installs.filter((i) => !(i.item_id === itemId && i.user_id === userId));
  }
}

const SECRET = 'test-secret';
const tok = (userId: string, username: string, role: string) =>
  ({ authorization: `Bearer ${createToken({ userId, username, role }, SECRET)}` });
const admin = tok('admin-1', 'admin', 'admin');
const editor = tok('editor-1', 'editor', 'editor');
const viewer = tok('viewer-1', 'viewer', 'viewer');

const VALID = '---\nname: my-skill\ndescription: Does a useful thing.\n---\n\n# My Skill\nbody';

describe('Registry routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    registerRegistryRoutes(app, new FakeDb() as unknown as DatabaseProvider, SECRET);
    await app.ready();
  });
  afterAll(async () => { await app.close(); });

  it('rejects unauthenticated requests', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/registry/items' })).statusCode).toBe(401);
  });

  it('forbids viewers from creating', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/registry/items', headers: viewer, payload: { kind: 'skill', content: VALID } });
    expect(res.statusCode).toBe(403);
  });

  it('rejects an invalid SKILL.md', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/registry/items', headers: editor, payload: { kind: 'skill', content: '---\nname: Bad Name\n---\nx' } });
    expect(res.statusCode).toBe(400);
  });

  it('runs the full create → submit → approve flow', async () => {
    const create = await app.inject({ method: 'POST', url: '/api/registry/items', headers: editor, payload: { kind: 'skill', content: VALID, tags: ['t'] } });
    expect(create.statusCode).toBe(201);
    const item = create.json();
    expect(item.slug).toBe('my-skill');
    expect(item.status).toBe('draft');
    expect(item.source).toBe('community');

    // Duplicate slug → 409
    const dup = await app.inject({ method: 'POST', url: '/api/registry/items', headers: editor, payload: { kind: 'skill', content: VALID } });
    expect(dup.statusCode).toBe(409);

    // Submit → pending
    expect((await app.inject({ method: 'POST', url: `/api/registry/items/${item.id}/submit`, headers: editor })).json().status).toBe('pending');

    // Non-admin approve → 403
    expect((await app.inject({ method: 'POST', url: `/api/registry/items/${item.id}/approve`, headers: editor })).statusCode).toBe(403);

    // Admin approve as official + verified
    const approved = await app.inject({ method: 'POST', url: `/api/registry/items/${item.id}/approve`, headers: admin, payload: { verified: true, source: 'official' } });
    expect(approved.json().status).toBe('approved');
    expect(approved.json().verified).toBe(true);
    expect(approved.json().source).toBe('official');

    // Version + vote + install
    expect((await app.inject({ method: 'POST', url: `/api/registry/items/${item.id}/versions`, headers: editor, payload: { version: '1.0.0' } })).statusCode).toBe(201);
    const voted = await app.inject({ method: 'PUT', url: `/api/registry/items/${item.id}/vote`, headers: admin, payload: { votes: [{ userId: 'admin-1', value: 1, createdAt: 'now' }] } });
    expect(voted.json().votes).toHaveLength(1);

    expect((await app.inject({ method: 'POST', url: `/api/registry/items/${item.id}/install`, headers: viewer })).statusCode).toBe(201);
    const detail = await app.inject({ method: 'GET', url: `/api/registry/items/${item.id}`, headers: viewer });
    expect(detail.json().installCount).toBe(1);
    expect(detail.json().installed).toBe(true);
    expect(detail.json().latestVersion).toBe('1.0.0');
    expect((await app.inject({ method: 'GET', url: '/api/registry/installs', headers: viewer })).json()).toHaveLength(1);
  });

  it('hides other users’ drafts from viewers but shows approved items', async () => {
    // editor's draft (created below) must not leak to the viewer's list
    await app.inject({ method: 'POST', url: '/api/registry/items', headers: editor, payload: { kind: 'agent', content: '---\nname: secret-draft\ndescription: hidden draft\n---\nx' } });
    const list = await app.inject({ method: 'GET', url: '/api/registry/items', headers: viewer });
    const slugs = list.json().map((i: { slug: string }) => i.slug);
    expect(slugs).toContain('my-skill');       // approved → visible
    expect(slugs).not.toContain('secret-draft'); // others' draft → hidden
  });
});
