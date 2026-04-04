import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider, RepoRow } from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';

export function registerRepoRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  app.get('/api/repos', { preHandler: guard }, async (request) => {
    const { source } = request.query as { source?: 'github' | 'ado' };
    const repos = await db.getRepos(source);
    return repos.map(deserializeRepo);
  });

  app.get('/api/repos/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const repo = await db.getRepoById(id);
    if (!repo) return reply.status(404).send({ error: 'Repo not found' });
    return deserializeRepo(repo);
  });

  app.post('/api/repos', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);
    const body = request.body as Record<string, unknown>;

    const row: RepoRow = {
      id: String(body.id),
      name: String(body.name),
      full_name: String(body.fullName ?? body.full_name),
      description: String(body.description ?? ''),
      source: String(body.source) as 'github' | 'ado',
      language: String(body.language ?? 'Unknown'),
      default_branch: String(body.defaultBranch ?? body.default_branch ?? 'main'),
      stars: Number(body.stars ?? 0),
      forks: Number(body.forks ?? 0),
      is_private: body.isPrivate || body.is_private ? 1 : 0,
      updated_at: String(body.updatedAt ?? body.updated_at ?? new Date().toLocaleDateString()),
      clone_url: String(body.cloneUrl ?? body.clone_url),
      web_url: String(body.webUrl ?? body.web_url),
      topics: JSON.stringify(body.topics ?? []),
      environments: JSON.stringify(body.environments ?? []),
      cloud_platform: body.cloudPlatform as string ?? body.cloud_platform as string ?? undefined,
      owners: JSON.stringify(body.owners ?? []),
      custom_tags: JSON.stringify(body.customTags ?? body.custom_tags ?? []),
      added_by: String(body.addedBy ?? body.added_by ?? caller.userId),
    };

    const created = await db.upsertRepo(row);
    return deserializeRepo(created);
  });

  app.put('/api/repos/:id/meta', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const partial: Partial<RepoRow> = {};
    if (body.environments !== undefined) partial.environments = JSON.stringify(body.environments);
    if (body.cloudPlatform !== undefined) partial.cloud_platform = body.cloudPlatform as string;
    if (body.owners !== undefined) partial.owners = JSON.stringify(body.owners);
    if (body.customTags !== undefined) partial.custom_tags = JSON.stringify(body.customTags);

    const updated = await db.updateRepo(id, partial);
    if (!updated) return reply.status(404).send({ error: 'Repo not found' });
    return deserializeRepo(updated);
  });

  app.delete('/api/repos/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };

    const repo = await db.getRepoById(id);
    if (!repo) return reply.status(404).send({ error: 'Repo not found' });

    // Only the user who added the repo or an admin can delete
    if (repo.added_by !== caller.userId && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only the repo owner or admins can delete repos' });
    }

    await db.deleteRepo(id);
    return { success: true };
  });
}

function deserializeRepo(row: RepoRow) {
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    description: row.description,
    source: row.source,
    language: row.language,
    defaultBranch: row.default_branch,
    stars: row.stars,
    forks: row.forks,
    isPrivate: Boolean(row.is_private),
    updatedAt: row.updated_at,
    cloneUrl: row.clone_url,
    webUrl: row.web_url,
    topics: safeParseJson(row.topics, []),
    environments: safeParseJson(row.environments, []),
    cloudPlatform: row.cloud_platform,
    owners: safeParseJson(row.owners, []),
    customTags: safeParseJson(row.custom_tags, []),
    addedBy: row.added_by,
  };
}

function safeParseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
