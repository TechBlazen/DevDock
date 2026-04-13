import { describe, it, expect, beforeEach } from 'vitest';
import { useRepoStore } from '../../store';
import type { Repository } from '../../types';

const githubRepo: Repository = {
  id: 'test-gh',
  name: 'test-gh-repo',
  fullName: 'judge/test-gh-repo',
  description: 'Test GH repo',
  source: 'github',
  language: 'TypeScript',
  defaultBranch: 'main',
  isPrivate: false,
  updatedAt: '1h ago',
  cloneUrl: 'https://github.com/judge/test-gh-repo.git',
  webUrl: 'https://github.com/judge/test-gh-repo',
};

const adoRepo: Repository = {
  id: 'test-ado',
  name: 'test-ado-repo',
  fullName: 'Costco/test-ado-repo',
  description: 'Test ADO repo',
  source: 'ado',
  language: 'YAML',
  defaultBranch: 'main',
  isPrivate: true,
  updatedAt: '2h ago',
  cloneUrl: 'https://dev.azure.com/costco/_git/test-ado-repo',
  webUrl: 'https://dev.azure.com/costco/_git/test-ado-repo',
};

describe('useRepoStore', () => {
  const initial = useRepoStore.getInitialState();

  beforeEach(() => {
    useRepoStore.setState({
      githubRepos: structuredClone(initial.githubRepos),
      adoRepos: structuredClone(initial.adoRepos),
      selectedRepo: null,
    });
  });

  it('seeds github and ado repos', () => {
    const { githubRepos, adoRepos } = useRepoStore.getState();
    expect(githubRepos.length).toBeGreaterThan(0);
    expect(adoRepos.length).toBeGreaterThan(0);
  });

  it('addRepo adds a GitHub repo to the github list', () => {
    const before = useRepoStore.getState().githubRepos.length;
    useRepoStore.getState().addRepo(githubRepo);
    const after = useRepoStore.getState().githubRepos;
    expect(after.length).toBe(before + 1);
    expect(after.find((r) => r.id === 'test-gh')).toBeDefined();
  });

  it('addRepo dedupes by id', () => {
    useRepoStore.getState().addRepo(githubRepo);
    useRepoStore.getState().addRepo(githubRepo);
    const count = useRepoStore.getState().githubRepos.filter((r) => r.id === 'test-gh').length;
    expect(count).toBe(1);
  });

  it('addRepo places ADO repos in the ado list', () => {
    useRepoStore.getState().addRepo(adoRepo);
    expect(useRepoStore.getState().adoRepos.find((r) => r.id === 'test-ado')).toBeDefined();
    expect(useRepoStore.getState().githubRepos.find((r) => r.id === 'test-ado')).toBeUndefined();
  });

  it('removeRepo filters from the correct source list', () => {
    useRepoStore.getState().addRepo(githubRepo);
    useRepoStore.getState().removeRepo('test-gh', 'github');
    expect(useRepoStore.getState().githubRepos.find((r) => r.id === 'test-gh')).toBeUndefined();
  });

  it('selectRepo stores and clears the selected repo', () => {
    useRepoStore.getState().selectRepo(githubRepo);
    expect(useRepoStore.getState().selectedRepo?.id).toBe('test-gh');
    useRepoStore.getState().selectRepo(null);
    expect(useRepoStore.getState().selectedRepo).toBeNull();
  });

  it('updateRepoMeta merges metadata fields', () => {
    useRepoStore.getState().addRepo(githubRepo);
    useRepoStore.getState().updateRepoMeta('test-gh', 'github', {
      environments: ['PRD'],
      cloudPlatform: 'GCP',
    });
    const repo = useRepoStore.getState().githubRepos.find((r) => r.id === 'test-gh');
    expect(repo?.environments).toEqual(['PRD']);
    expect(repo?.cloudPlatform).toBe('GCP');
  });

  it('updateRepo merges arbitrary repo fields', () => {
    useRepoStore.getState().addRepo(githubRepo);
    useRepoStore.getState().updateRepo('test-gh', 'github', { description: 'Updated description' });
    const repo = useRepoStore.getState().githubRepos.find((r) => r.id === 'test-gh');
    expect(repo?.description).toBe('Updated description');
  });

  it('setRepos replaces the entire list for one source', () => {
    useRepoStore.getState().setRepos('github', [githubRepo]);
    expect(useRepoStore.getState().githubRepos).toEqual([githubRepo]);
  });
});
