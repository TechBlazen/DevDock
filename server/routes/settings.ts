import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider, SettingsRow } from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';

export function registerSettingsRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  app.get('/api/settings', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);

    // Get global settings first
    const global = await db.getSettings();
    // Get per-user overrides
    const userSettings = await db.getSettings(caller.userId);

    // Merge: user settings override global
    const base = global ? deserializeSettings(global) : null;
    const user = userSettings ? deserializeSettings(userSettings) : null;

    return user ?? base ?? {};
  });

  app.put('/api/settings', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);
    const body = request.body as Record<string, unknown>;

    const { nanoid } = await import('nanoid');

    // Check if user-specific settings exist
    const existing = await db.getSettings(caller.userId);

    const row: SettingsRow = {
      id: existing?.id ?? nanoid(),
      user_id: caller.userId,
      ai_config: body.ai ? JSON.stringify(body.ai) : existing?.ai_config ?? '{}',
      otel_config: body.otel ? JSON.stringify(body.otel) : existing?.otel_config ?? '{}',
      github_config: body.github ? JSON.stringify(body.github) : existing?.github_config ?? '{}',
      ado_config: body.ado ? JSON.stringify(body.ado) : existing?.ado_config ?? '{}',
      theme: (body.theme as string) ?? existing?.theme ?? 'dark',
      dashboard_widgets: body.dashboardWidgets ? JSON.stringify(body.dashboardWidgets) : existing?.dashboard_widgets ?? '[]',
    };

    const saved = await db.upsertSettings(row);
    return deserializeSettings(saved);
  });
}

function deserializeSettings(row: SettingsRow) {
  return {
    ai: safeParseJson(row.ai_config, {}),
    otel: safeParseJson(row.otel_config, {}),
    github: safeParseJson(row.github_config, {}),
    ado: safeParseJson(row.ado_config, {}),
    theme: row.theme,
    dashboardWidgets: safeParseJson(row.dashboard_widgets, []),
  };
}

function safeParseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
