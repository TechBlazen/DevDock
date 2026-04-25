import axios from 'axios';
import { traceRepoFetch } from '../otel';
import type { Repository, RepoCommit, RepoMerge, RepoBuild, MergeStatus, BuildStatus } from '../types';

// ─── GitHub ───────────────────────────────────────────────────────────────────
export async function fetchGitHubRepos(token: string, orgs: string[], includePersonal: boolean): Promise<Repository[]> {
  const span = traceRepoFetch('github', 'list_repos');
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const results: Repository[] = [];

    if (includePersonal) {
      const { data } = await axios.get('https://api.github.com/user/repos', {
        headers,
        params: { per_page: 100, sort: 'updated', type: 'all' },
      });
      results.push(...data.map(mapGitHubRepo));
    }

    for (const org of orgs) {
      const { data } = await axios.get(`https://api.github.com/orgs/${org}/repos`, {
        headers,
        params: { per_page: 100, sort: 'updated', type: 'all' },
      });
      results.push(...data.map(mapGitHubRepo));
    }

    span.end('ok');
    return results;
  } catch (e) {
    span.end('error');
    throw e;
  }
}

function mapGitHubRepo(r: Record<string, unknown>): Repository {
  return {
    id: String(r.id),
    name: String(r.name),
    fullName: String(r.full_name),
    description: String(r.description ?? ''),
    source: 'github',
    language: String(r.language ?? 'Unknown'),
    defaultBranch: String(r.default_branch ?? 'main'),
    stars: Number(r.stargazers_count ?? 0),
    forks: Number(r.forks_count ?? 0),
    isPrivate: Boolean(r.private),
    updatedAt: new Date(String(r.updated_at)).toLocaleDateString(),
    cloneUrl: String(r.clone_url),
    webUrl: String(r.html_url),
    topics: (r.topics as string[]) ?? [],
  };
}

// ─── Azure DevOps ─────────────────────────────────────────────────────────────
export async function fetchADORepos(org: string, pat: string, projects: string[]): Promise<Repository[]> {
  const span = traceRepoFetch('ado', 'list_repos');
  try {
    const headers = {
      Authorization: `Basic ${btoa(':' + pat)}`,
      'Content-Type': 'application/json',
    };

    const results: Repository[] = [];

    for (const project of projects) {
      const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories?api-version=7.1`;
      const { data } = await axios.get(url, { headers });
      results.push(...(data.value ?? []).map((r: Record<string, unknown>) => mapADORepo(r, org)));
    }

    span.end('ok');
    return results;
  } catch (e) {
    span.end('error');
    throw e;
  }
}

function mapADORepo(r: Record<string, unknown>, org: string): Repository {
  const project = (r.project as Record<string, unknown>)?.name ?? '';
  const size = Number(r.size ?? 0);
  const isFork = Boolean(r.isFork);
  return {
    id: String(r.id),
    name: String(r.name),
    fullName: `${org}/${project}/${r.name}`,
    description: String(r.description ?? ''),
    source: 'ado',
    language: 'Unknown',
    defaultBranch: String(r.defaultBranch ?? 'main').replace('refs/heads/', ''),
    stars: 0,
    forks: isFork ? 1 : 0,
    isPrivate: true,
    updatedAt: r.lastUpdatedDate
      ? new Date(String(r.lastUpdatedDate)).toLocaleDateString()
      : new Date().toLocaleDateString(),
    cloneUrl: String(r.remoteUrl ?? ''),
    webUrl: String(r.webUrl ?? ''),
    topics: size > 0 ? [`${Math.round(size / 1024)} KB`] : [],
  };
}

// Detect primary language from file extensions in an ADO repo
async function detectADOLanguage(org: string, project: string, repo: string, branch: string, pat?: string): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (pat) headers.Authorization = `Basic ${btoa(':' + pat)}`;

  try {
    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?recursionLevel=OneLevel&versionDescriptor.version=${encodeURIComponent(branch)}&api-version=7.1`;
    const { data } = await axios.get(url, { headers });

    const extMap: Record<string, string> = {
      '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript',
      '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.java': 'Java', '.cs': 'C#',
      '.rb': 'Ruby', '.php': 'PHP', '.swift': 'Swift', '.kt': 'Kotlin',
      '.tf': 'HCL', '.hcl': 'HCL', '.yaml': 'YAML', '.yml': 'YAML',
      '.sh': 'Shell', '.bash': 'Shell', '.ps1': 'PowerShell',
      '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS',
      '.sql': 'SQL', '.md': 'Markdown', '.json': 'JSON',
      '.cpp': 'C++', '.c': 'C', '.h': 'C',
    };

    const counts: Record<string, number> = {};
    for (const item of (data.value ?? [])) {
      if (item.isFolder) continue;
      const path = String(item.path ?? '');
      const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
      const lang = extMap[ext];
      if (lang) counts[lang] = (counts[lang] ?? 0) + 1;
    }

    // Return the most common language
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// ─── URL Parsing ─────────────────────────────────────────────────────────────
export type ParsedRepoUrl =
  | { source: 'github'; owner: string; repo: string }
  | { source: 'ado'; org: string; project: string; repo: string }
  | null;

export function parseRepoUrl(url: string): ParsedRepoUrl {
  try {
    const u = new URL(url.trim());

    // GitHub: https://github.com/owner/repo
    if (u.hostname === 'github.com') {
      const parts = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
      if (parts.length >= 2) {
        return { source: 'github', owner: parts[0], repo: parts[1] };
      }
    }

    // Azure DevOps: https://dev.azure.com/org/project/_git/repo
    if (u.hostname === 'dev.azure.com') {
      const parts = u.pathname.replace(/^\//, '').split('/');
      // pattern: org/project/_git/repo
      const gitIdx = parts.indexOf('_git');
      if (gitIdx >= 2 && parts[gitIdx + 1]) {
        return { source: 'ado', org: parts[0], project: parts[1], repo: parts[gitIdx + 1] };
      }
    }

    // ADO alternate: https://org.visualstudio.com/project/_git/repo
    if (u.hostname.endsWith('.visualstudio.com')) {
      const org = u.hostname.replace('.visualstudio.com', '');
      const parts = u.pathname.replace(/^\//, '').split('/');
      const gitIdx = parts.indexOf('_git');
      if (gitIdx >= 1 && parts[gitIdx + 1]) {
        return { source: 'ado', org, project: parts[0], repo: parts[gitIdx + 1] };
      }
    }
  } catch {
    // invalid URL
  }
  return null;
}

// ─── Single Repo Fetch ───────────────────────────────────────────────────────
export async function fetchGitHubRepo(owner: string, repo: string, token?: string): Promise<Repository> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  return mapGitHubRepo(data);
}

export async function fetchADORepo(org: string, project: string, repo: string, pat?: string): Promise<Repository> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (pat) headers.Authorization = `Basic ${btoa(':' + pat)}`;

  const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}?api-version=7.1`;
  const { data } = await axios.get(url, { headers });
  const mapped = mapADORepo(data, org);

  // Enrich with language detection, last commit date, and description
  if (pat) {
    const branch = mapped.defaultBranch;
    const [language, lastCommitDate, description] = await Promise.all([
      detectADOLanguage(org, project, repo, branch, pat),
      fetchADOLastCommitDate(org, project, repo, pat),
      fetchADORepoDescription(org, project, repo, branch, pat),
    ]);
    if (language !== 'Unknown') mapped.language = language;
    if (lastCommitDate) mapped.updatedAt = lastCommitDate;
    if (description) mapped.description = description;
  }

  return mapped;
}

async function fetchADOLastCommitDate(org: string, project: string, repo: string, pat?: string): Promise<string | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (pat) headers.Authorization = `Basic ${btoa(':' + pat)}`;

  try {
    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/commits?$top=1&api-version=7.1`;
    const { data } = await axios.get(url, { headers });
    const commit = data.value?.[0];
    if (commit?.author?.date) {
      return new Date(String(commit.author.date)).toLocaleDateString();
    }
  } catch { /* non-critical */ }
  return null;
}

// Fetch a description for an ADO repo:
// 1. Try the project description from the Projects API
// 2. Fall back to reading the first line of README.md
async function fetchADORepoDescription(org: string, project: string, repo: string, branch: string, pat?: string): Promise<string | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (pat) headers.Authorization = `Basic ${btoa(':' + pat)}`;

  // Try project description first
  try {
    const url = `https://dev.azure.com/${org}/_apis/projects/${project}?api-version=7.1`;
    const { data } = await axios.get(url, { headers });
    if (data.description && String(data.description).trim()) {
      return String(data.description).trim();
    }
  } catch { /* non-critical */ }

  // Fall back to first meaningful line of README.md
  try {
    const readmeHeaders: Record<string, string> = { Accept: 'text/plain' };
    if (pat) readmeHeaders.Authorization = `Basic ${btoa(':' + pat)}`;

    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?path=%2FREADME.md&includeContent=true&$format=text&api-version=7.1`;
    const { data } = await axios.get(url, { headers: readmeHeaders, responseType: 'text', transformResponse: [(d) => d] });
    const content = String(data);

    // Extract first non-heading, non-empty line as description
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) continue; // skip headings
      if (trimmed.startsWith('![') || trimmed.startsWith('<!--')) continue; // skip images/comments
      // Truncate to 200 chars
      return trimmed.length > 200 ? trimmed.slice(0, 200) + '...' : trimmed;
    }
  } catch { /* no README or inaccessible */ }

  return null;
}

// ─── GitHub Markdown Import/Export ────────────────────────────────────────────
export interface GitHubFileInfo {
  path: string;
  sha: string;
  content: string;
}

export async function listGitHubMarkdownFiles(
  owner: string, repo: string, path: string, token?: string
): Promise<{ path: string; name: string; sha: string }[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // If scanning from root, use the Git Trees API for full recursive listing
  if (!path || path === '.' || path === '/') {
    return listGitHubMarkdownFilesRecursive(owner, repo, headers);
  }

  // For a specific subdirectory, use Contents API (single level)
  const { data } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  );

  const items = Array.isArray(data) ? data : [data];
  return items
    .filter((f: Record<string, unknown>) =>
      String(f.type) === 'file' && String(f.name).endsWith('.md')
    )
    .map((f: Record<string, unknown>) => ({
      path: String(f.path),
      name: String(f.name),
      sha: String(f.sha),
    }));
}

// Recursively list all markdown files in a GitHub repo using the Git Trees API
async function listGitHubMarkdownFilesRecursive(
  owner: string, repo: string, headers: Record<string, string>
): Promise<{ path: string; name: string; sha: string }[]> {
  // Get default branch SHA first
  const { data: repoData } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}`,
    { headers }
  );
  const branch = String(repoData.default_branch ?? 'main');

  // Fetch full tree recursively
  const { data: treeData } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  );

  return (treeData.tree ?? [])
    .filter((f: Record<string, unknown>) =>
      String(f.type) === 'blob' && String(f.path).endsWith('.md')
    )
    .map((f: Record<string, unknown>) => ({
      path: String(f.path),
      name: String(f.path).split('/').pop() ?? '',
      sha: String(f.sha),
    }));
}

export async function fetchGitHubFile(
  owner: string, repo: string, path: string, token?: string
): Promise<GitHubFileInfo> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  );

  const content = atob(String(data.content).replace(/\n/g, ''));
  return { path: String(data.path), sha: String(data.sha), content };
}

export async function pushGitHubFile(
  owner: string, repo: string, path: string, content: string,
  message: string, token: string, sha?: string
): Promise<void> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
  };

  await axios.put(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      ...(sha ? { sha } : {}),
    },
    { headers }
  );
}

// ─── ADO Markdown Import/Export ──────────────────────────────────────────────
export async function listADOMarkdownFiles(
  org: string, project: string, repo: string, path: string, pat?: string
): Promise<{ path: string; name: string; objectId: string }[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (pat) headers.Authorization = `Basic ${btoa(':' + pat)}`;

  const scopePath = path.startsWith('/') ? path : `/${path}`;
  // Use Full recursion to discover markdown files in all subdirectories
  const recursion = (!path || path === '/' || path === '.') ? 'Full' : 'OneLevel';
  const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?scopePath=${encodeURIComponent(scopePath)}&recursionLevel=${recursion}&api-version=7.1`;
  const { data } = await axios.get(url, { headers });

  return (data.value ?? [])
    .filter((f: Record<string, unknown>) =>
      !f.isFolder && String(f.path).endsWith('.md')
    )
    .map((f: Record<string, unknown>) => ({
      path: String(f.path),
      name: String(f.path).split('/').pop() ?? '',
      objectId: String(f.objectId),
    }));
}

// ─── Spec File Discovery (Swagger / OpenAPI) ─────────────────────────────────
// Matches filenames like openapi.yaml, openapi-v1.yaml, swagger.json — but
// NOT package.json or tsconfig.json. The leading filename token must be
// "openapi" or "swagger" (case-insensitive).
function isSpecFilename(filename: string): boolean {
  return /^(openapi|swagger)([.-][\w.-]*)?\.(ya?ml|json)$/i.test(filename);
}

/** Walk a GitHub repo's tree for OpenAPI / Swagger spec files. */
export async function listGitHubSpecFiles(
  owner: string, repo: string, token?: string
): Promise<{ path: string; name: string; sha: string }[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data: repoData } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}`,
    { headers }
  );
  const branch = String(repoData.default_branch ?? 'main');

  const { data: treeData } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  );

  return (treeData.tree ?? [])
    .filter((f: Record<string, unknown>) => {
      if (String(f.type) !== 'blob') return false;
      const name = String(f.path).split('/').pop() ?? '';
      return isSpecFilename(name);
    })
    .map((f: Record<string, unknown>) => ({
      path: String(f.path),
      name: String(f.path).split('/').pop() ?? '',
      sha: String(f.sha),
    }));
}

/** Walk an Azure DevOps repo for OpenAPI / Swagger spec files. */
export async function listADOSpecFiles(
  org: string, project: string, repo: string, pat?: string
): Promise<{ path: string; name: string; objectId: string }[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (pat) headers.Authorization = `Basic ${btoa(':' + pat)}`;

  const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?scopePath=/&recursionLevel=Full&api-version=7.1`;
  const { data } = await axios.get(url, { headers });

  return (data.value ?? [])
    .filter((f: Record<string, unknown>) => {
      if (f.isFolder) return false;
      const name = String(f.path).split('/').pop() ?? '';
      return isSpecFilename(name);
    })
    .map((f: Record<string, unknown>) => ({
      path: String(f.path),
      name: String(f.path).split('/').pop() ?? '',
      objectId: String(f.objectId),
    }));
}

export async function fetchADOFile(
  org: string, project: string, repo: string, path: string, pat?: string
): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'text/plain',
  };
  if (pat) headers.Authorization = `Basic ${btoa(':' + pat)}`;

  const scopePath = path.startsWith('/') ? path : `/${path}`;
  const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?path=${encodeURIComponent(scopePath)}&includeContent=true&$format=text&api-version=7.1`;
  const { data } = await axios.get(url, { headers, responseType: 'text', transformResponse: [(d) => d] });
  return String(data);
}

export async function pushADOFile(
  org: string, project: string, repo: string, branch: string,
  path: string, content: string, message: string, pat: string,
  oldObjectId?: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${btoa(':' + pat)}`,
  };

  // Get latest commit to use as oldObjectId if not provided
  if (!oldObjectId) {
    const refsUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/refs?filter=heads/${branch}&api-version=7.1`;
    const { data: refsData } = await axios.get(refsUrl, { headers });
    oldObjectId = refsData.value?.[0]?.objectId;
  }

  const pushUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pushes?api-version=7.1`;
  await axios.post(pushUrl, {
    refUpdates: [{ name: `refs/heads/${branch}`, oldObjectId }],
    commits: [{
      comment: message,
      changes: [{
        changeType: 'edit',
        item: { path: path.startsWith('/') ? path : `/${path}` },
        newContent: { content, contentType: 'rawtext' },
      }],
    }],
  }, { headers });
}

// ─── GitHub Commits, PRs, Builds ────────────────────────────────────────────
export async function fetchGitHubCommits(owner: string, repo: string, token?: string, count = 10): Promise<RepoCommit[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits`, {
    headers,
    params: { per_page: count },
  });

  return data.map((c: Record<string, unknown>) => {
    const commit = c.commit as Record<string, unknown>;
    const author = commit.author as Record<string, unknown>;
    return {
      sha: String(c.sha).slice(0, 7),
      message: String((commit.message as string)?.split('\n')[0] ?? ''),
      author: String(author?.name ?? 'unknown'),
      date: new Date(String(author?.date)).toLocaleDateString(),
      url: String(c.html_url),
    };
  });
}

export async function fetchGitHubPRs(owner: string, repo: string, token?: string, count = 10): Promise<RepoMerge[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    headers,
    params: { per_page: count, state: 'all', sort: 'updated', direction: 'desc' },
  });

  return data.map((pr: Record<string, unknown>) => {
    const head = pr.head as Record<string, unknown>;
    const base = pr.base as Record<string, unknown>;
    let status: MergeStatus = 'open';
    if (pr.merged_at) status = 'merged';
    else if (pr.state === 'closed') status = 'closed';
    return {
      id: String(pr.number),
      title: String(pr.title),
      author: String((pr.user as Record<string, unknown>)?.login ?? 'unknown'),
      status,
      sourceBranch: String(head?.ref ?? ''),
      targetBranch: String(base?.ref ?? ''),
      date: new Date(String(pr.updated_at)).toLocaleDateString(),
      url: String(pr.html_url),
    };
  });
}

export async function fetchGitHubBuilds(owner: string, repo: string, token?: string, count = 10): Promise<RepoBuild[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/actions/runs`, {
    headers,
    params: { per_page: count },
  });

  return (data.workflow_runs ?? []).map((run: Record<string, unknown>) => {
    const statusMap: Record<string, BuildStatus> = {
      completed: run.conclusion === 'success' ? 'succeeded' : run.conclusion === 'failure' ? 'failed' : 'canceled',
      in_progress: 'running',
      queued: 'queued',
    };
    return {
      id: String(run.id),
      name: String(run.name),
      status: statusMap[String(run.status)] ?? 'queued',
      branch: String(run.head_branch ?? ''),
      commit: String(run.head_sha ?? '').slice(0, 7),
      duration: run.run_started_at
        ? `${Math.round((new Date(String(run.updated_at)).getTime() - new Date(String(run.run_started_at)).getTime()) / 1000)}s`
        : '—',
      date: new Date(String(run.updated_at)).toLocaleDateString(),
      url: String(run.html_url),
    };
  });
}

// ─── ADO Commits, PRs, Builds ───────────────────────────────────────────────
export async function fetchADOCommits(org: string, project: string, repo: string, pat?: string, count = 10): Promise<RepoCommit[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (pat) headers.Authorization = `Basic ${btoa(':' + pat)}`;

  const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/commits?$top=${count}&api-version=7.1`;
  const { data } = await axios.get(url, { headers });

  return (data.value ?? []).map((c: Record<string, unknown>) => {
    const author = c.author as Record<string, unknown>;
    return {
      sha: String(c.commitId ?? '').slice(0, 7),
      message: String((c.comment as string)?.split('\n')[0] ?? ''),
      author: String(author?.name ?? 'unknown'),
      date: new Date(String(author?.date)).toLocaleDateString(),
      url: String(c.remoteUrl ?? ''),
    };
  });
}

export async function fetchADOPRs(org: string, project: string, repo: string, pat?: string, count = 10): Promise<RepoMerge[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (pat) headers.Authorization = `Basic ${btoa(':' + pat)}`;

  const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullrequests?$top=${count}&searchCriteria.status=all&api-version=7.1`;
  const { data } = await axios.get(url, { headers });

  return (data.value ?? []).map((pr: Record<string, unknown>) => {
    const statusMap: Record<string, MergeStatus> = { completed: 'merged', active: 'open', abandoned: 'closed' };
    return {
      id: String(pr.pullRequestId),
      title: String(pr.title),
      author: String((pr.createdBy as Record<string, unknown>)?.displayName ?? 'unknown'),
      status: statusMap[String(pr.status)] ?? 'open',
      sourceBranch: String(pr.sourceRefName ?? '').replace('refs/heads/', ''),
      targetBranch: String(pr.targetRefName ?? '').replace('refs/heads/', ''),
      date: new Date(String(pr.closedDate ?? pr.creationDate)).toLocaleDateString(),
      url: `https://dev.azure.com/${org}/${project}/_git/${repo}/pullrequest/${pr.pullRequestId}`,
    };
  });
}

export async function fetchADOBuilds(org: string, project: string, pat?: string, count = 10): Promise<RepoBuild[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (pat) headers.Authorization = `Basic ${btoa(':' + pat)}`;

  const url = `https://dev.azure.com/${org}/${project}/_apis/build/builds?$top=${count}&api-version=7.1`;
  const { data } = await axios.get(url, { headers });

  return (data.value ?? []).map((b: Record<string, unknown>) => {
    const statusMap: Record<string, BuildStatus> = {
      completed: (b.result as string) === 'succeeded' ? 'succeeded' : (b.result as string) === 'failed' ? 'failed' : 'canceled',
      inProgress: 'running',
      notStarted: 'queued',
    };
    const def = b.definition as Record<string, unknown>;
    return {
      id: String(b.id),
      name: String(def?.name ?? 'Build'),
      status: statusMap[String(b.status)] ?? 'queued',
      branch: String(b.sourceBranch ?? '').replace('refs/heads/', ''),
      commit: String(b.sourceVersion ?? '').slice(0, 7),
      duration: b.startTime && b.finishTime
        ? `${Math.round((new Date(String(b.finishTime)).getTime() - new Date(String(b.startTime)).getTime()) / 1000)}s`
        : '—',
      date: new Date(String(b.finishTime ?? b.queueTime)).toLocaleDateString(),
      url: String((b._links as Record<string, Record<string, string>>)?.web?.href ?? ''),
    };
  });
}

// ─── VS Code deep-link helpers ────────────────────────────────────────────────
export function openInVSCode(cloneUrl: string): void {
  const encoded = encodeURIComponent(cloneUrl);
  const link = document.createElement('a');
  link.href = `vscode://vscode.git/clone?url=${encoded}`;
  link.click();
}

export function openInVSCodeWeb(webUrl: string): void {
  if (webUrl.includes('github.com')) {
    // github.dev opens a full VS Code editor in the browser
    window.open(webUrl.replace('github.com', 'github.dev'), '_blank');
  } else if (webUrl.includes('dev.azure.com')) {
    // For ADO repos, open vscode.dev with the repo URL directly
    window.open(`https://vscode.dev/azurerepos/${webUrl.replace('https://dev.azure.com/', '')}`, '_blank');
  } else {
    window.open(webUrl, '_blank');
  }
}
