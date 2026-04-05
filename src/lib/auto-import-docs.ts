import {
  listGitHubMarkdownFiles,
  fetchGitHubFile,
  listADOMarkdownFiles,
  fetchADOFile,
} from './repos';
import { useDocsStore, useSettingsStore } from '../store';
import type { Repository } from '../types';

/**
 * Auto-discovers and imports markdown files from a repository into the Docs store.
 * Skips files that have already been imported (matched by sourceUrl).
 * Runs silently in the background — errors are logged but don't throw.
 */
export async function autoImportRepoMarkdown(repo: Repository): Promise<number> {
  const settings = useSettingsStore.getState().settings;
  const { docs, addDoc } = useDocsStore.getState();

  // Build existing sourceUrl set for deduplication
  const existingUrls = new Set(docs.filter((d) => d.sourceUrl).map((d) => d.sourceUrl));

  let imported = 0;

  try {
    if (repo.source === 'github') {
      const token = settings.github.accessToken;
      const [owner, repoName] = repo.fullName.split('/');
      if (!owner || !repoName) return 0;

      // Discover markdown files from root
      const files = await listGitHubMarkdownFiles(owner, repoName, '.', token || undefined);

      for (const file of files) {
        const sourceUrl = `${repo.webUrl}/blob/${repo.defaultBranch}/${file.path}`;
        if (existingUrls.has(sourceUrl)) continue;

        try {
          const fetched = await fetchGitHubFile(owner, repoName, file.path, token || undefined);
          // Preserve folder context in title for nested docs (e.g., "docs/setup" instead of just "setup")
          const title = file.path.replace(/\.md$/i, '');
          const folder = file.path.includes('/') ? file.path.split('/').slice(0, -1).join('/') : undefined;

          addDoc({
            title,
            content: fetched.content,
            sourceUrl,
            tags: ['github', 'auto-imported', repo.name, ...(folder ? [folder] : [])],
          });
          imported++;
        } catch {
          // Skip individual file failures silently
        }
      }
    } else if (repo.source === 'ado') {
      const pat = settings.ado.personalAccessToken;

      // Parse org, project, and repo from webUrl: https://dev.azure.com/{org}/{project}/_git/{repo}
      const urlMatch = repo.webUrl.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/(.+)/);
      if (!urlMatch) return 0;
      const [, org, project, repoName] = urlMatch;

      if (!pat) return 0; // ADO requires auth

      const files = await listADOMarkdownFiles(org, project, repoName, '/', pat);

      for (const file of files) {
        const sourceUrl = `${repo.webUrl}?path=${encodeURIComponent(file.path)}`;
        if (existingUrls.has(sourceUrl)) continue;

        try {
          const content = await fetchADOFile(org, project, repoName, file.path, pat || undefined);
          // Preserve folder context in title for nested docs
          const title = file.path.replace(/^\//, '').replace(/\.md$/i, '');
          const folder = file.path.includes('/') ? file.path.replace(/^\//, '').split('/').slice(0, -1).join('/') : undefined;

          addDoc({
            title,
            content,
            sourceUrl,
            tags: ['ado', 'auto-imported', repo.name, ...(folder ? [folder] : [])],
          });
          imported++;
        } catch {
          // Skip individual file failures silently
        }
      }
    }
  } catch {
    // Discovery failed (e.g., no token, repo not accessible) — silently skip
  }

  return imported;
}
