import type { SearchSource, SearchDocument } from '../types';
import type { DocEntry } from '../../../types';

interface DocsStoreState {
  docs: DocEntry[];
}

export function createDocsSource(getState: () => DocsStoreState): SearchSource {
  return {
    category: 'doc',
    label: 'Documentation',
    icon: 'FileText',
    getDocuments(): SearchDocument[] {
      return getState().docs.map((doc) => ({
        id: `doc:${doc.id}`,
        category: 'doc',
        title: doc.title,
        description: doc.content.slice(0, 200),
        url: '/docs',
        icon: 'FileText',
        tags: doc.tags?.join(' ') ?? '',
        content: doc.content.slice(0, 500),
        meta: {
          updatedAt: doc.updatedAt,
        },
      }));
    },
  };
}
