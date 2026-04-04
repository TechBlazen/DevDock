import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider, PageViewRow, ErrorRow } from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';

export function registerAnalyticsRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  app.post('/api/analytics/pageview', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);
    const body = request.body as Record<string, unknown>;
    const { nanoid } = await import('nanoid');

    const view: PageViewRow = {
      id: nanoid(),
      user_id: caller.userId,
      user_name: caller.username,
      path: String(body.path),
      timestamp: new Date().toISOString(),
    };

    await db.trackPageView(view);
    return { success: true };
  });

  app.post('/api/analytics/error', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);
    const body = request.body as Record<string, unknown>;
    const { nanoid } = await import('nanoid');

    const error: ErrorRow = {
      id: nanoid(),
      user_id: caller.userId,
      user_name: caller.username,
      message: String(body.message),
      stack: body.stack as string,
      path: String(body.path),
      timestamp: new Date().toISOString(),
    };

    await db.trackError(error);
    return { success: true };
  });

  app.get('/api/analytics/pageviews', { preHandler: guard }, async (request) => {
    const { limit } = request.query as { limit?: string };
    return db.getPageViews(limit ? parseInt(limit, 10) : 100);
  });

  app.get('/api/analytics/errors', { preHandler: guard }, async (request) => {
    const { limit } = request.query as { limit?: string };
    return db.getErrors(limit ? parseInt(limit, 10) : 100);
  });
}
