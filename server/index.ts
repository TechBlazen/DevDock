import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
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
import { registerFederatedSourceRoutes } from './routes/federated-sources.js';
import { registerForumRoutes } from './routes/forum.js';
import { registerFeatureRequestRoutes } from './routes/feature-requests.js';
import { registerApiRoutes } from './routes/apis.js';
import { registerN8nRoutes } from './routes/n8n.js';
import { registerDirectoryRoutes } from './routes/directory.js';
import { registerSqlToolRoutes } from './routes/sql-tool.js';
import { registerCodeRunnerRoutes } from './routes/code-runner.js';
import { registerAiProxyRoutes } from './routes/ai-proxy.js';
import { registerSemanticSearchRoutes } from './routes/semantic-search.js';
import { registerApiConverterRoutes } from './routes/api-converter.js';
import { registerMcpRoutes } from './routes/mcp.js';
import { registerRegistryRoutes } from './routes/registry.js';
import { registerChatHistoryRoutes } from './routes/chat-history.js';
import { McpManager } from './services/mcp-manager.js';
import { Neo4jService } from './services/neo4j-service.js';
import { createVectorRuntime } from './vector/runtime.js';

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

  // MCP Register runtime — reconciles persisted servers to 'stopped' and
  // auto-starts any opted in. Owns live status, logs, and JSON-RPC connections.
  const mcpManager = new McpManager(db);
  await mcpManager.init();
  console.log('MCP Register ready');

  // Neo4j — optional chat history + context graph.
  const neo4jService = new Neo4jService(config.neo4j);
  if (neo4jService.enabled) {
    await neo4jService.connect();
  } else {
    console.log('Neo4j disabled (set DEVDOCK_NEO4J_URL + DEVDOCK_NEO4J_PASSWORD to enable chat history)');
  }

  // Vector / semantic search (no-op if GEMINI_API_KEY is unset).
  const vector = createVectorRuntime(config.vector);
  if (vector.enabled) {
    console.log(`Semantic search enabled (chroma: ${config.vector.chromaUrl})`);
  } else {
    console.log('Semantic search disabled (set GEMINI_API_KEY to enable)');
  }

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
  registerDocRoutes(app, db, config.jwtSecret, vector);
  registerPluginRoutes(app, db, config.jwtSecret);
  registerAnalyticsRoutes(app, db, config.jwtSecret);
  registerFederatedSourceRoutes(app, db, config.jwtSecret, vector);
  registerForumRoutes(app, db, config.jwtSecret, vector);
  registerFeatureRequestRoutes(app, db, config.jwtSecret);
  registerApiRoutes(app, db, config.jwtSecret);
  registerN8nRoutes(app, config.jwtSecret);
  registerSemanticSearchRoutes(app, config.jwtSecret, vector);
  registerDirectoryRoutes(app, db, config.jwtSecret);
  registerSqlToolRoutes(app, db, config.jwtSecret, config.features);
  registerCodeRunnerRoutes(app, db, config.jwtSecret, config.features);
  registerAiProxyRoutes(app, db, config.jwtSecret, mcpManager);
  registerApiConverterRoutes(app, config.jwtSecret);
  registerMcpRoutes(app, db, config.jwtSecret, mcpManager);
  registerRegistryRoutes(app, db, config.jwtSecret, vector);
  registerChatHistoryRoutes(app, config.jwtSecret, neo4jService);

  // Serve the built Vite client from the same process when present. In dev,
  // Vite runs its own server on :5173 and proxies /api to us, so `dist/`
  // won't exist and we skip this block. In the container, `dist/` is copied
  // alongside the compiled server, and this is how the SPA is delivered.
  const clientDir = resolve(process.env.DEVDOCK_CLIENT_DIR ?? process.cwd(), 'dist');
  const clientIndex = resolve(clientDir, 'index.html');
  if (existsSync(clientIndex)) {
    await app.register(fastifyStatic, { root: clientDir, wildcard: false });
    // SPA fallback: anything that isn't an /api/* route and doesn't match a
    // static file falls back to index.html so client-side routing works.
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api')) return reply.code(404).send({ error: 'Not found' });
      return reply.sendFile('index.html');
    });
    console.log(`Serving client from ${clientDir}`);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await app.close();
    await mcpManager.shutdown();
    await neo4jService.close();
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
