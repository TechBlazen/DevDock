// SKILL.md helpers (server side). Mirror of src/lib/skill-format.ts — the two
// module trees can't share code (server uses ESM .js imports, client is bundled
// by Vite), so this is a deliberate small duplicate kept in sync. The route
// re-validates submitted SKILL.md here so a bad spec never reaches the DB.

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  [key: string]: string | undefined;
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  body: string;
}

const FENCE = /^---\s*$/;

export function parseSkillMd(content: string): ParsedSkill {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  if (lines.length === 0 || !FENCE.test(lines[0] ?? '')) {
    return { frontmatter: {}, body: content.trim() };
  }
  const end = lines.findIndex((l, i) => i > 0 && FENCE.test(l));
  if (end === -1) return { frontmatter: {}, body: content.trim() };

  const frontmatter: SkillFrontmatter = {};
  for (const line of lines.slice(1, end)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) frontmatter[key] = value;
  }
  return { frontmatter, body: lines.slice(end + 1).join('\n').trim() };
}

export function slugifySkillName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface SkillValidation {
  ok: boolean;
  errors: string[];
}

export function validateSkillFrontmatter(fm: SkillFrontmatter): SkillValidation {
  const errors: string[] = [];
  const name = (fm.name ?? '').trim();
  const description = (fm.description ?? '').trim();

  if (!name) errors.push('name is required');
  else {
    if (name.length > 64) errors.push('name must be 64 characters or fewer');
    if (!NAME_RE.test(name)) errors.push('name must be lowercase letters, numbers, and single hyphens');
  }

  if (!description) errors.push('description is required');
  else if (description.length > 1024) errors.push('description must be 1024 characters or fewer');

  return { ok: errors.length === 0, errors };
}
