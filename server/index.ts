import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadConfig } from './config.js';
import { createProvider } from './db/factory.js';
import { seed } from './db/sqlite/seed.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerUserRoutes } from './routes/users.js';
import { registerRepoRoutes } from './routes/repos.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerBookmarkRoutes } from './routes/bookmarks.js';
import { registerDocRoutes } from './routes/docs.js';
import { registerPluginRoutes } from './routes/plugins.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';

async function main() {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  // CORS for dev
  await app.register(cors, { origin: true });

  // Database
  console.log(`Initializing ${config.db.provider} database...`);
  const db = await createProvider(config.db);
  await db.connect();
  await db.migrate();
  await seed(db);
  console.log(`Database ready (${config.db.provider})`);

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    provider: config.db.provider,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  // Register routes
  registerAuthRoutes(app, db, config.jwtSecret);
  registerUserRoutes(app, db, config.jwtSecret);
  registerRepoRoutes(app, db, config.jwtSecret);
  registerSettingsRoutes(app, db, config.jwtSecret);
  registerBookmarkRoutes(app, db, config.jwtSecret);
  registerDocRoutes(app, db, config.jwtSecret);
  registerPluginRoutes(app, db, config.jwtSecret);
  registerAnalyticsRoutes(app, db, config.jwtSecret);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await app.close();
    await db.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`DevDock API server running on http://localhost:${config.port}`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
