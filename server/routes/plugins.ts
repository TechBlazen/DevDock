import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider } from '../db/provider.js';
import { authGuard } from '../middleware/auth.js';

export function registerPluginRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  app.get('/api/plugins/state', { preHandler: guard }, async () => {
    const state = await db.getPluginState();
    return {
      enabledPlugins: safeParseJson(state.enabled_plugins, {}),
      pluginSettings: safeParseJson(state.plugin_settings, {}),
    };
  });

  app.put('/api/plugins/state', { preHandler: guard }, async (request) => {
    const body = request.body as Record<string, unknown>;
    const partial: Record<string, string> = {};
    if (body.enabledPlugins !== undefined) partial.enabled_plugins = JSON.stringify(body.enabledPlugins);
    if (body.pluginSettings !== undefined) partial.plugin_settings = JSON.stringify(body.pluginSettings);

    const updated = await db.updatePluginState(partial);
    return {
      enabledPlugins: safeParseJson(updated.enabled_plugins, {}),
      pluginSettings: safeParseJson(updated.plugin_settings, {}),
    };
  });
}

function safeParseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
