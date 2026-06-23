// SKILL.md format helpers (the agentskills.io packaging unit).
// A SKILL.md is YAML frontmatter (flat key: value) between `---` fences,
// followed by a markdown body. We parse the top-level frontmatter keys
// (name, description, license, compatibility, allowed-tools) and validate
// against the spec's constraints. Used by the Agent Builder and the Gallery
// submit form; the server re-validates on submit.

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  license?: string;
  compatibility?: string;
  'allowed-tools'?: string;
  [key: string]: string | undefined;
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  body: string;
}

const FENCE = /^---\s*$/;

/** Parse a SKILL.md string into flat frontmatter + body. Tolerant: a document
 *  with no frontmatter returns an empty frontmatter and the whole text as body. */
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
    // Strip matching surrounding quotes.
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) frontmatter[key] = value;
  }
  return { frontmatter, body: lines.slice(end + 1).join('\n').trim() };
}

/** Slugify a name to the SKILL.md `name` constraint (lowercase, hyphens). */
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

/** Validate parsed frontmatter against the SKILL.md spec constraints. */
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

/** Convenience: parse + validate a full SKILL.md string. */
export function validateSkillMd(content: string): SkillValidation & { parsed: ParsedSkill } {
  const parsed = parseSkillMd(content);
  return { ...validateSkillFrontmatter(parsed.frontmatter), parsed };
}
