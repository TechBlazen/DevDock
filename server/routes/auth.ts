import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider } from '../db/provider.js';
import { createToken, type JwtPayload } from '../middleware/auth.js';

// Simple hash matching the frontend's hashPassword
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `forge_${Math.abs(hash).toString(36)}`;
}

export function registerAuthRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  app.post('/api/auth/login', async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string };

    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password required' });
    }

    const user = await db.getUserByUsername(username);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    if (user.password_hash !== hashPassword(password)) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.updateUser(user.id, { last_login: new Date().toISOString() });

    const payload: JwtPayload = { userId: user.id, username: user.username, role: user.role };
    const token = createToken(payload, jwtSecret);

    // Return user info + token
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        avatarUrl: user.avatar_url,
        role: user.role,
        permissions: JSON.parse(user.permissions),
      },
    };
  });

  app.post('/api/auth/verify', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'No token' });
    }
    const { verifyToken } = await import('../middleware/auth.js');
    const payload = verifyToken(authHeader.slice(7), jwtSecret);
    if (!payload) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    const user = await db.getUserById(payload.userId);
    if (!user) {
      return reply.status(401).send({ error: 'User not found' });
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        avatarUrl: user.avatar_url,
        role: user.role,
        permissions: JSON.parse(user.permissions),
      },
    };
  });
}
