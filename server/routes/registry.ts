import type { FastifyInstance } from 'fastify';
import type {
  DatabaseProvider, RegistryItemRow, RegistryVersionRow, RegistryInstallRow,
} from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';
import type { VectorRuntime } from '../vector/runtime.js';
import { parseSkillMd, validateSkillFrontmatter, slugifySkillName } from '../lib/skill-format.js';

// Agent & Skill Registry routes (the Gallery's server-backed catalog). One
// unified resource for both agents and skills (kind column). Governance is the
// plugin pattern: create (draft) → submit (pending) → admin approve/reject.
// Votes reuse the forum wholesale-array convention (the client computes the
// post-toggle array via applyVote and PUTs it; the server stores it opaquely).
//
// SKILL.md is validated server-side on create/version so a malformed spec never
// reaches the DB. Approved items are indexed into the shared vector runtime
// (kind='registry-item') so the command palette + semantic search surface them.

type Vote = { userId: string; value: number; createdAt: string };

export function registerRegistryRoutes(
  app: FastifyInstance,
  db: DatabaseProvider,
  jwtSecret: string,
  vector?: VectorRuntime,
) {
  const guard = authGuard(jwtSecret);

  // ─── List (approved + caller's own + everything for admins) ─────────────────
  app.get('/api/registry/items', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);
    const all = await db.getRegistryItems();
    const visible = all.filter(
      (it) => it.status === 'approved' || it.author_id === caller.userId || caller.role === 'admin',
    );
    return visible.map(deserializeItem);
  });

  // ─── Caller's installs ("My Library") ───────────────────────────────────────
  app.get('/api/registry/installs', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);
    const installs = await db.getRegistryInstalls(caller.userId);
    return installs.map(deserializeInstall);
  });

  // ─── Single item (+ versions + caller's install) ────────────────────────────
  app.get('/api/registry/items/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const item = await db.getRegistryItemById(id);
    if (!item) return reply.status(404).send({ error: 'Item not found' });
    const versions = await db.getRegistryVersions(id);
    const install = await db.getRegistryInstall(id, caller.userId);
    return {
      ...deserializeItem(item),
      versions: versions.map(deserializeVersion),
      installed: !!install,
    };
  });

  // ─── Create draft ───────────────────────────────────────────────────────────
  app.post('/api/registry/items', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    if (caller.role === 'viewer') {
      return reply.status(403).send({ error: 'Viewers cannot publish to the registry' });
    }
    const body = request.body as Record<string, unknown>;
    const content = String(body.content ?? '');

    // Validate the SKILL.md; fall back to the provided name/description fields
    // when the document has no frontmatter.
    const parsed = parseSkillMd(content);
    const name = String(parsed.frontmatter.name ?? body.name ?? '').trim();
    const description = String(parsed.frontmatter.description ?? body.description ?? '').trim();
    const { ok, errors } = validateSkillFrontmatter({ name, description });
    if (!ok) return reply.status(400).send({ error: 'Invalid SKILL.md', details: errors });

    const kind = body.kind === 'agent' ? 'agent' : 'skill';
    const slug = slugifySkillName(name);
    if (await db.getRegistryItemBySlug(slug)) {
      return reply.status(409).send({ error: `An item with slug "${slug}" already exists` });
    }

    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();
    const row: RegistryItemRow = {
      id: nanoid(),
      kind,
      name,
      slug,
      description,
      content,
      author_id: caller.userId,
      author_name: String(body.authorName ?? caller.username),
      source: 'community',          // official/verified are admin-granted on approve
      verified: 0,
      visibility: body.visibility === 'public' || body.visibility === 'private' ? String(body.visibility) : 'org',
      category: body.category as string | undefined,
      tags: JSON.stringify(body.tags ?? []),
      capabilities: JSON.stringify(body.capabilities ?? []),
      compatibility: body.compatibility as string | undefined,
      status: 'draft',
      votes: '[]',
      install_count: 0,
      latest_version: undefined,
      reviewed_by: undefined,
      rejection_reason: undefined,
      created_at: now,
      updated_at: now,
    };
    const created = await db.createRegistryItem(row);
    return reply.status(201).send(deserializeItem(created));
  });

  // ─── Edit own draft ─────────────────────────────────────────────────────────
  app.put('/api/registry/items/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const existing = await db.getRegistryItemById(id);
    if (!existing) return reply.status(404).send({ error: 'Item not found' });
    if (existing.author_id !== caller.userId && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only the author or admins can edit' });
    }

    const body = request.body as Record<string, unknown>;
    const partial: Partial<RegistryItemRow> = { updated_at: new Date().toISOString() };
    if (body.description !== undefined) partial.description = String(body.description);
    if (body.content !== undefined) partial.content = String(body.content);
    if (body.category !== undefined) partial.category = body.category as string | undefined;
    if (body.tags !== undefined) partial.tags = JSON.stringify(body.tags);
    if (body.capabilities !== undefined) partial.capabilities = JSON.stringify(body.capabilities);
    if (body.compatibility !== undefined) partial.compatibility = body.compatibility as string | undefined;

    const updated = await db.updateRegistryItem(id, partial);
    if (!updated) return reply.status(404).send({ error: 'Item not found' });
    if (updated.status === 'approved' && (body.content !== undefined || body.description !== undefined)) {
      enqueueItemIndex(vector, updated);
    }
    return deserializeItem(updated);
  });

  // ─── Delete (author or admin) ───────────────────────────────────────────────
  app.delete('/api/registry/items/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const existing = await db.getRegistryItemById(id);
    if (!existing) return reply.status(404).send({ error: 'Item not found' });
    if (existing.author_id !== caller.userId && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only the author or admins can delete' });
    }
    await db.deleteRegistryItem(id);
    vector?.enqueueDelete(id);
    return reply.status(204).send();
  });

  // ─── Submit for review (draft → pending) ────────────────────────────────────
  app.post('/api/registry/items/:id/submit', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const item = await db.getRegistryItemById(id);
    if (!item) return reply.status(404).send({ error: 'Item not found' });
    if (item.author_id !== caller.userId && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only the author can submit' });
    }
    const updated = await db.updateRegistryItem(id, { status: 'pending', updated_at: new Date().toISOString() });
    return deserializeItem(updated!);
  });

  // ─── Approve (admin) ────────────────────────────────────────────────────────
  app.post('/api/registry/items/:id/approve', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    if (caller.role !== 'admin') return reply.status(403).send({ error: 'Admins only' });
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await db.getRegistryItemById(id);
    if (!item) return reply.status(404).send({ error: 'Item not found' });

    const partial: Partial<RegistryItemRow> = {
      status: 'approved',
      reviewed_by: caller.userId,
      rejection_reason: undefined,
      updated_at: new Date().toISOString(),
    };
    // Admins can promote source/verified as part of approval (e.g. mark official).
    if (body.source === 'official' || body.source === 'org' || body.source === 'community') partial.source = String(body.source);
    if (body.verified !== undefined) partial.verified = body.verified ? 1 : 0;

    const updated = await db.updateRegistryItem(id, partial);
    enqueueItemIndex(vector, updated!);
    return deserializeItem(updated!);
  });

  // ─── Reject (admin) ─────────────────────────────────────────────────────────
  app.post('/api/registry/items/:id/reject', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    if (caller.role !== 'admin') return reply.status(403).send({ error: 'Admins only' });
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const updated = await db.updateRegistryItem(id, {
      status: 'rejected',
      reviewed_by: caller.userId,
      rejection_reason: String(body.reason ?? ''),
      updated_at: new Date().toISOString(),
    });
    if (!updated) return reply.status(404).send({ error: 'Item not found' });
    // A rejected item should not linger in search.
    vector?.enqueueDelete(id);
    return deserializeItem(updated);
  });

  // ─── Publish a version (author or admin) ────────────────────────────────────
  app.post('/api/registry/items/:id/versions', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const item = await db.getRegistryItemById(id);
    if (!item) return reply.status(404).send({ error: 'Item not found' });
    if (item.author_id !== caller.userId && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only the author or admins can publish a version' });
    }
    const body = request.body as Record<string, unknown>;
    const version = String(body.version ?? '').trim();
    if (!version) return reply.status(400).send({ error: 'version is required' });

    const content = body.content !== undefined ? String(body.content) : item.content;
    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();
    const row: RegistryVersionRow = {
      id: nanoid(),
      item_id: id,
      version,
      content,
      changelog: body.changelog as string | undefined,
      created_at: now,
    };
    const created = await db.createRegistryVersion(row);
    // Point the item at the new version (and content).
    const updated = await db.updateRegistryItem(id, { latest_version: version, content, updated_at: now });
    if (updated?.status === 'approved') enqueueItemIndex(vector, updated);
    return reply.status(201).send(deserializeVersion(created));
  });

  // ─── Vote (wholesale array, reused forum convention) ────────────────────────
  app.put('/api/registry/items/:id/vote', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    if (body.votes === undefined) return reply.status(400).send({ error: 'votes array required' });
    const updated = await db.updateRegistryItem(id, {
      votes: JSON.stringify(body.votes),
      updated_at: new Date().toISOString(),
    });
    if (!updated) return reply.status(404).send({ error: 'Item not found' });
    return deserializeItem(updated);
  });

  // ─── Install / uninstall / use ──────────────────────────────────────────────
  app.post('/api/registry/items/:id/install', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const item = await db.getRegistryItemById(id);
    if (!item) return reply.status(404).send({ error: 'Item not found' });

    const existing = await db.getRegistryInstall(id, caller.userId);
    if (existing) return deserializeInstall(existing); // idempotent

    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();
    const install: RegistryInstallRow = {
      id: nanoid(),
      item_id: id,
      user_id: caller.userId,
      installed_at: now,
      last_used: undefined,
      use_count: 0,
    };
    const created = await db.createRegistryInstall(install);
    await db.incrementRegistryInstallCount(id, 1);
    return reply.status(201).send(deserializeInstall(created));
  });

  app.delete('/api/registry/items/:id/install', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const existing = await db.getRegistryInstall(id, caller.userId);
    if (!existing) return reply.status(204).send(); // already absent
    await db.deleteRegistryInstall(id, caller.userId);
    await db.incrementRegistryInstallCount(id, -1);
    return reply.status(204).send();
  });

  app.post('/api/registry/items/:id/use', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const existing = await db.getRegistryInstall(id, caller.userId);
    if (!existing) return reply.status(404).send({ error: 'Not installed' });
    const updated = await db.updateRegistryInstall(existing.id, {
      last_used: new Date().toISOString(),
      use_count: existing.use_count + 1,
    });
    return deserializeInstall(updated!);
  });
}

// ─── Deserializers (row → camelCase API shape) ──────────────────────────────
function deserializeItem(row: RegistryItemRow) {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    slug: row.slug,
    description: row.description,
    content: row.content,
    authorId: row.author_id,
    authorName: row.author_name,
    source: row.source,
    verified: Boolean(row.verified),
    visibility: row.visibility,
    category: row.category,
    tags: safeParseJson(row.tags, [] as string[]),
    capabilities: safeParseJson(row.capabilities, [] as string[]),
    compatibility: row.compatibility,
    status: row.status,
    votes: safeParseJson(row.votes, [] as Vote[]),
    installCount: row.install_count,
    latestVersion: row.latest_version,
    reviewedBy: row.reviewed_by,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function deserializeVersion(row: RegistryVersionRow) {
  return {
    id: row.id,
    itemId: row.item_id,
    version: row.version,
    content: row.content,
    changelog: row.changelog,
    createdAt: row.created_at,
  };
}

function deserializeInstall(row: RegistryInstallRow) {
  return {
    id: row.id,
    itemId: row.item_id,
    userId: row.user_id,
    installedAt: row.installed_at,
    lastUsed: row.last_used,
    useCount: row.use_count,
  };
}

function safeParseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

// Item embed = name + description + SKILL.md body. Metadata exposes kind/source
// so semantic-search hits carry meaningful context. Exported for tests.
export function enqueueItemIndex(vector: VectorRuntime | undefined, item: RegistryItemRow): void {
  if (!vector) return;
  vector.enqueueUpsert({
    id: item.id,
    kind: 'registry-item',
    title: item.name,
    text: `${item.name}\n\n${item.description}\n\n${item.content}`.trim(),
    metadata: {
      kind: item.kind,
      source: item.source,
      author_id: item.author_id,
      author_name: item.author_name,
      url: '/gallery',
      created_at: item.created_at,
      updated_at: item.updated_at,
    },
  });
}
