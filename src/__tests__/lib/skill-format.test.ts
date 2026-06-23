import { describe, it, expect } from 'vitest';
import { parseSkillMd, slugifySkillName, validateSkillFrontmatter, validateSkillMd } from '../../lib/skill-format';

describe('skill-format / parseSkillMd', () => {
  it('parses frontmatter and body', () => {
    const { frontmatter, body } = parseSkillMd('---\nname: pr-reviewer\ndescription: Review PRs\n---\n\n# Body\ntext');
    expect(frontmatter.name).toBe('pr-reviewer');
    expect(frontmatter.description).toBe('Review PRs');
    expect(body).toBe('# Body\ntext');
  });

  it('strips surrounding quotes from values', () => {
    const { frontmatter } = parseSkillMd('---\nname: "quoted-name"\n---\nbody');
    expect(frontmatter.name).toBe('quoted-name');
  });

  it('tolerates documents with no frontmatter', () => {
    const { frontmatter, body } = parseSkillMd('just a body, no fences');
    expect(frontmatter).toEqual({});
    expect(body).toBe('just a body, no fences');
  });

  it('handles values containing colons', () => {
    const { frontmatter } = parseSkillMd('---\ndescription: Use when X: do Y\n---\nb');
    expect(frontmatter.description).toBe('Use when X: do Y');
  });
});

describe('skill-format / slugifySkillName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifySkillName('My Cool Skill')).toBe('my-cool-skill');
    expect(slugifySkillName('  Spaces & Symbols!! ')).toBe('spaces-symbols');
  });
});

describe('skill-format / validateSkillFrontmatter', () => {
  it('accepts a valid spec', () => {
    expect(validateSkillFrontmatter({ name: 'pr-reviewer', description: 'Review PRs' }).ok).toBe(true);
  });

  it('requires name and description', () => {
    const r = validateSkillFrontmatter({});
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('name is required');
    expect(r.errors).toContain('description is required');
  });

  it('rejects names with spaces or uppercase', () => {
    expect(validateSkillFrontmatter({ name: 'Bad Name', description: 'd' }).ok).toBe(false);
    expect(validateSkillFrontmatter({ name: 'UPPER', description: 'd' }).ok).toBe(false);
  });

  it('rejects an over-long name', () => {
    expect(validateSkillFrontmatter({ name: 'a'.repeat(65), description: 'd' }).ok).toBe(false);
  });
});

describe('skill-format / validateSkillMd', () => {
  it('parses and validates in one call', () => {
    const r = validateSkillMd('---\nname: ok-skill\ndescription: Does a thing\n---\nbody');
    expect(r.ok).toBe(true);
    expect(r.parsed.frontmatter.name).toBe('ok-skill');
  });
});
