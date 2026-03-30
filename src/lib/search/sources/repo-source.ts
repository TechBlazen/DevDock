import type { SearchSource, SearchDocument } from '../types';
import type { Repository } from '../../../types';

interface RepoStoreState {
  githubRepos: Repository[];
  adoRepos: Repository[];
}

export function createRepoSource(getState: () => RepoStoreState): SearchSource {
  return {
    category: 'repository',
    label: 'Repositories',
    icon: 'GitFork',
    getDocuments(): SearchDocument[] {
      const { githubRepos, adoRepos } = getState();
      return [...githubRepos, ...adoRepos].map((repo) => ({
        id: `repository:${repo.id}`,
        category: 'repository',
        title: repo.name,
        description: repo.description || '',
        url: repo.source === 'github' ? '/github' : '/ado',
        icon: repo.source === 'github' ? 'GitFork' : 'GitBranch',
        tags: repo.topics?.join(' ') ?? '',
        extra: repo.language || '',
        meta: {
          source: repo.source,
          language: repo.language || '',
          private: repo.isPrivate ? 'private' : 'public',
        },
      }));
    },
  };
}
