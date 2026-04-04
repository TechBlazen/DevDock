import type { SearchSource, SearchDocument } from '../types';
import { useFederatedSourceStore } from '../../../store/federated-source-store';

export function createFederatedSource(): SearchSource {
  return {
    category: 'federated',
    label: 'External Sources',
    icon: 'Globe',
    getDocuments(): SearchDocument[] {
      const { documents, sources } = useFederatedSourceStore.getState();
      return documents.map((doc) => {
        const source = sources.find((s) => s.id === doc.sourceId);
        return {
          id: `federated:${doc.id}`,
          category: 'federated',
          title: doc.title,
          description: doc.description,
          url: doc.url,
          icon: doc.icon || 'Globe',
          tags: doc.tags || '',
          content: doc.content || '',
          extra: doc.extra || '',
          meta: {
            ...(doc.meta ?? {}),
            sourceId: doc.sourceId,
            sourceName: source?.name || 'External',
          },
        };
      });
    },
  };
}
