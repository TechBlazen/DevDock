import axios from 'axios';
import { traceRepoFetch } from '../otel';
import type { Repository } from '../types';

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
  return {
    id: String(r.id),
    name: String(r.name),
    fullName: `${org}/${project}/${r.name}`,
    description: String((r as Record<string, unknown>).description ?? ''),
    source: 'ado',
    language: 'Unknown',
    defaultBranch: String(r.defaultBranch ?? 'main').replace('refs/heads/', ''),
    isPrivate: true,
    updatedAt: new Date().toLocaleDateString(),
    cloneUrl: String(r.remoteUrl ?? ''),
    webUrl: String(r.webUrl ?? ''),
  };
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
  return mapADORepo(data, org);
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
  const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?scopePath=${encodeURIComponent(scopePath)}&recursionLevel=OneLevel&api-version=7.1`;
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

export async function fetchADOFile(
  org: string, project: string, repo: string, path: string, pat?: string
): Promise<string> {
  const headers: Record<string, string> = {};
  if (pat) headers.Authorization = `Basic ${btoa(':' + pat)}`;

  const scopePath = path.startsWith('/') ? path : `/${path}`;
  const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?path=${encodeURIComponent(scopePath)}&api-version=7.1`;
  const { data } = await axios.get(url, { headers, responseType: 'text' });
  return typeof data === 'string' ? data : JSON.stringify(data);
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
