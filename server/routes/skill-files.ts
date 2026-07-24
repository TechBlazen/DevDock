/**
 * Skill-files API — scan, read, and save SKILL.md / agent.md files on disk.
 *
 * Security model
 * ──────────────
 * All paths are validated against an allowlist of root directories (the
 * user's skill dirs + Warp bundled resources).  Any request for a path
 * outside these roots is rejected with 403.  Reads require a valid JWT;
 * writes (save) additionally require the admin role.
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, homedir, dirname, basename } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { authGuard, roleGuard, getRequestUser } from '../middleware/auth.js';

// ─── Skill file descriptor ────────────────────────────────────────────────────

export interface SkillFileEntry {
  /** Absolute path on the server's filesystem. */
  path: string;
  /** Relative display path (from its provider root). */
  relativePath: string;
  /** Skill / agent name (from SKILL.md frontmatter `name` key, or directory). */
  name: string;
  /** One-line description from frontmatter. */
  description: string;
  /** Provider bucket: 'codex' | 'agents' | 'warp-bundled' | 'custom'. */
  provider: string;
  /** 'skill' or 'agent' — inferred from directory path or frontmatter. */
  kind: 'skill' | 'agent';
}

// ─── Allowed root directories ─────────────────────────────────────────────────

function buildAllowedRoots(): { root: string; provider: string; kind: 'skill' | 'agent' }[] {
  const home = homedir();
  return [
    { root: join(home, '.codex', 'skills'),  provider: 'codex',        kind: 'skill' },
    { root: join(home, '.agents', 'skills'), provider: 'agents',       kind: 'skill' },
    { root: join(home, '.warp', 'remote-server', 'bundled_resources', 'bundled', 'skills'),
      provider: 'warp-bundled', kind: 'skill' },
    { root: join(home, '.warp', 'remote-server', 'bundled_resources', 'bundled', 'mcp_skills'),
      provider: 'warp-bundled', kind: 'skill' },
    // Agent dirs (look for agent.md files)
    { root: join(home, '.codex', 'agents'),  provider: 'codex',        kind: 'agent' },
    { root: join(home, '.agents', 'agents'), provider: 'agents',       kind: 'agent' },
  ].filter(({ root }) => existsSync(root));
}

/** Is `absPath` safely inside one of the allowed roots? */
function isAllowedPath(absPath: string, roots: { root: string }[]): boolean {
  const norm = resolve(absPath);
  return roots.some(({ root }) => norm.startsWith(resolve(root) + '/'));
}

// ─── Frontmatter parser ───────────────────────────────────────────────────────

function extractFrontmatter(content: string): { name: string; description: string } {
  const lines = content.split('\n');
  if (!lines[0]?.trim().match(/^---/)) return { name: '', description: '' };
  const end = lines.findIndex((l, i) => i > 0 && l.trim().match(/^---/));
  if (end === -1) return { name: '', description: '' };
  const fm: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let val = line.slice(colon + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) fm[key] = val;
  }
  return { name: fm.name ?? '', description: fm.description ?? '' };
}

// ─── Directory scanner ────────────────────────────────────────────────────────

function scanRoot(
  root: string,
  provider: string,
  defaultKind: 'skill' | 'agent',
): SkillFileEntry[] {
  const results: SkillFileEntry[] = [];

  function walk(dir: string) {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return; }

    for (const entry of entries) {
      const full = join(dir, entry);
      let stat;
      try { stat = statSync(full); } catch { continue; }

      if (stat.isDirectory()) {
        walk(full);
        continue;
      }

      // Accept SKILL.md, skill.md, agent.md, any *.md in a skills/ dir
      const lc = entry.toLowerCase();
      if (!lc.endsWith('.md')) continue;

      let content: string;
      try { content = readFileSync(full, 'utf-8'); } catch { continue; }

      const { name, description } = extractFrontmatter(content);
      const dirName = basename(dirname(full));
      const rel = relative(root, full);

      // Infer kind from path or filename
      const kind: 'skill' | 'agent' =
        full.toLowerCase().includes('/agent') || lc.includes('agent') ? 'agent' : defaultKind;

      results.push({
        path: full,
        relativePath: rel,
        name: name || dirName,
        description: description || '',
        provider,
        kind,
      });
    }
  }

  walk(root);
  return results;
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerSkillFileRoutes(app: FastifyInstance, jwtSecret: string) {
  const guard = authGuard(jwtSecret);
  const adminGuard = [authGuard(jwtSecret), roleGuard('admin')];

  // ── GET /api/skill-files ──────────────────────────────────────────────────
  // Returns a list of all skill/agent MD files found in the allowed directories.
  app.get('/api/skill-files', { preHandler: [guard] }, async () => {
    const roots = buildAllowedRoots();
    const files: SkillFileEntry[] = [];
    for (const { root, provider, kind } of roots) {
      files.push(...scanRoot(root, provider, kind));
    }
    // Deduplicate by path (a file might appear in multiple roots if dirs overlap)
    const seen = new Set<string>();
    const unique = files.filter((f) => {
      if (seen.has(f.path)) return false;
      seen.add(f.path);
      return true;
    });
    return { files: unique };
  });

  // ── GET /api/skill-files/content ──────────────────────────────────────────
  // Reads a single file. Rejects paths outside the allowlist.
  app.get('/api/skill-files/content', { preHandler: [guard] }, async (request, reply) => {
    const { path: filePath } = request.query as { path?: string };
    if (!filePath) return reply.status(400).send({ error: 'path query param is required' });

    const roots = buildAllowedRoots();
    const abs = resolve(filePath);
    if (!isAllowedPath(abs, roots)) {
      return reply.status(403).send({ error: 'Path is outside the allowed skill directories' });
    }
    if (!existsSync(abs)) return reply.status(404).send({ error: 'File not found' });

    try {
      const content = readFileSync(abs, 'utf-8');
      return { path: abs, content };
    } catch (e) {
      return reply.status(500).send({ error: e instanceof Error ? e.message : 'Read failed' });
    }
  });

  // ── POST /api/skill-files/save ────────────────────────────────────────────
  // Writes content to a file. Admin-only. Path must be in the allowlist.
  app.post('/api/skill-files/save', { preHandler: adminGuard }, async (request, reply) => {
    const { path: filePath, content } = request.body as { path?: string; content?: string };
    if (!filePath || content === undefined) {
      return reply.status(400).send({ error: 'path and content are required' });
    }

    const roots = buildAllowedRoots();
    const abs = resolve(filePath);
    if (!isAllowedPath(abs, roots)) {
      return reply.status(403).send({ error: 'Path is outside the allowed skill directories' });
    }
    // Only allow writing to files that already exist (no creation of arbitrary paths)
    if (!existsSync(abs)) {
      return reply.status(404).send({ error: 'File not found — cannot create new files via this API' });
    }

    try {
      const user = getRequestUser(request);
      writeFileSync(abs, content, 'utf-8');
      console.log(`[skill-files] ${user.username} saved ${abs}`);
      return { ok: true, path: abs };
    } catch (e) {
      return reply.status(500).send({ error: e instanceof Error ? e.message : 'Write failed' });
    }
  });
}
