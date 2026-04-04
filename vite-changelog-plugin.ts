import type { Plugin } from 'vite';
import { execSync } from 'child_process';

interface ChangelogCommit {
  sha: string;
  message: string;
  date: string;
  type: 'feat' | 'fix' | 'chore' | 'refactor' | 'docs' | 'perf' | 'test' | 'other';
}

interface ChangelogRelease {
  version: string;
  date: string;
  title: string;
  commits: ChangelogCommit[];
}

function parseCommitType(message: string): ChangelogCommit['type'] {
  const lower = message.toLowerCase();
  if (lower.startsWith('feat:') || lower.startsWith('feat(')) return 'feat';
  if (lower.startsWith('fix:') || lower.startsWith('fix(')) return 'fix';
  if (lower.startsWith('chore:') || lower.startsWith('chore(')) return 'chore';
  if (lower.startsWith('refactor:') || lower.startsWith('refactor(')) return 'refactor';
  if (lower.startsWith('docs:') || lower.startsWith('docs(')) return 'docs';
  if (lower.startsWith('perf:') || lower.startsWith('perf(')) return 'perf';
  if (lower.startsWith('test:') || lower.startsWith('test(')) return 'test';
  return 'other';
}

function stripPrefix(message: string): string {
  return message.replace(/^(feat|fix|chore|refactor|docs|perf|test)(\([^)]*\))?:\s*/i, '').trim();
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function generateTitle(commits: ChangelogCommit[]): string {
  // Pick a title from the most significant feat commit, or summarize
  const feats = commits.filter((c) => c.type === 'feat');
  if (feats.length === 0) {
    const fixes = commits.filter((c) => c.type === 'fix');
    if (fixes.length > 0) return 'Bug Fixes & Improvements';
    return 'Maintenance & Updates';
  }
  if (feats.length === 1) {
    return capitalize(stripPrefix(feats[0].message));
  }
  // Summarize from first feat
  const first = capitalize(stripPrefix(feats[0].message));
  // Truncate if too long
  if (first.length > 50) return first.slice(0, 47) + '...';
  return first + ' & More';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildChangelog(): ChangelogRelease[] {
  let raw: string;
  try {
    raw = execSync(
      'git log --format="%H|%s|%ai" --no-merges',
      { encoding: 'utf-8', maxBuffer: 1024 * 1024 },
    );
  } catch {
    return [];
  }

  const lines = raw.trim().split('\n').filter(Boolean);
  const commits: ChangelogCommit[] = lines
    .map((line) => {
      const [sha, message, date] = line.split('|');
      if (!sha || !message) return null;
      return {
        sha: sha.slice(0, 7),
        message,
        date,
        type: parseCommitType(message),
      } satisfies ChangelogCommit;
    })
    .filter((c): c is ChangelogCommit => c !== null);

  // Group into releases of 5-10 commits each
  const GROUP_SIZE = 7;
  const releases: ChangelogRelease[] = [];
  const totalGroups = Math.ceil(commits.length / GROUP_SIZE);

  for (let i = 0; i < commits.length; i += GROUP_SIZE) {
    const group = commits.slice(i, i + GROUP_SIZE);
    const groupIndex = Math.floor(i / GROUP_SIZE);
    // Version: count down from total groups so newest is highest version
    const major = Math.floor((totalGroups - groupIndex - 1) / 10);
    const minor = (totalGroups - groupIndex - 1) % 10;
    const version = `${major}.${minor}.0`;
    const date = formatMonth(group[0].date);
    const title = generateTitle(group);

    releases.push({ version, date, title, commits: group });
  }

  return releases;
}

const VIRTUAL_ID = 'virtual:changelog';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

export function changelogPlugin(): Plugin {
  return {
    name: 'vite-changelog-plugin',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        const releases = buildChangelog();
        return `export default ${JSON.stringify(releases, null, 2)};`;
      }
    },
  };
}
