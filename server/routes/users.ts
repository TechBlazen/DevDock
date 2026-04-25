import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider, UserRow } from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';

export function registerUserRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  app.get('/api/users', { preHandler: guard }, async () => {
    const users = await db.getUsers();
    return users.map(stripPasswordHash);
  });

  app.get('/api/users/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await db.getUserById(id);
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return stripPasswordHash(user);
  });

  app.post('/api/users', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    if (caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only admins can create users' });
    }

    const body = request.body as Partial<UserRow> & { password?: string };
    if (!body.username || !body.password || !body.display_name) {
      return reply.status(400).send({ error: 'username, password, and display_name required' });
    }

    const existing = await db.getUserByUsername(body.username);
    if (existing) return reply.status(409).send({ error: 'Username already exists' });

    const { nanoid } = await import('nanoid');
    const user: UserRow = {
      id: nanoid(),
      username: body.username,
      password_hash: hashPassword(body.password),
      display_name: body.display_name,
      email: body.email,
      avatar_url: body.avatar_url,
      role: body.role ?? 'viewer',
      permissions: body.permissions ?? '{}',
      dashboard_widgets: body.dashboard_widgets ?? '[]',
      favorite_repos: body.favorite_repos ?? '[]',
      preferences: body.preferences ?? '{}',
      created_at: new Date().toISOString(),
    };

    const created = await db.createUser(user);
    return stripPasswordHash(created);
  });

  app.put('/api/users/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };

    // Users can update themselves; admins can update anyone
    if (caller.userId !== id && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const body = request.body as Partial<UserRow>;
    // Don't allow non-admins to change their own role
    if (caller.role !== 'admin') {
      delete body.role;
      delete body.permissions;
    }

    const updated = await db.updateUser(id, body);
    if (!updated) return reply.status(404).send({ error: 'User not found' });
    return stripPasswordHash(updated);
  });

  app.delete('/api/users/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    if (caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only admins can delete users' });
    }

    const { id } = request.params as { id: string };
    if (id === caller.userId) {
      return reply.status(400).send({ error: 'Cannot delete your own account' });
    }

    await db.deleteUser(id);
    return { success: true };
  });

  // ─── Preferences & Favorites ────────────────────────────────────────────
  app.put('/api/users/:id/preferences', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    if (caller.userId !== id && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const prefs = request.body as Record<string, unknown>;
    const user = await db.getUserById(id);
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const existing = user.preferences ? JSON.parse(user.preferences) : {};
    const merged = JSON.stringify({ ...existing, ...prefs });
    await db.updateUser(id, { preferences: merged });
    return { preferences: JSON.parse(merged) };
  });

  app.put('/api/users/:id/favorites', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    if (caller.userId !== id && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const { repoId } = request.body as { repoId: string };
    const user = await db.getUserById(id);
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const favs: string[] = user.favorite_repos ? JSON.parse(user.favorite_repos) : [];
    const idx = favs.indexOf(repoId);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(repoId);

    await db.updateUser(id, { favorite_repos: JSON.stringify(favs) });
    return { favoriteRepos: favs };
  });

  app.put('/api/users/:id/dashboard', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    if (caller.userId !== id && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const { widgets } = request.body as { widgets: string[] };
    await db.updateUser(id, { dashboard_widgets: JSON.stringify(widgets) });
    return { dashboardWidgets: widgets };
  });
}

function stripPasswordHash(user: UserRow): Omit<UserRow, 'password_hash'> & { password_hash?: never } {
  const { password_hash: _, ...rest } = user;
  return rest;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `forge_${Math.abs(hash).toString(36)}`;
}
