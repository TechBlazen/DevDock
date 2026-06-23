import type { SearchSource, SearchDocument } from '../types';
import type { BuilderItem } from '../../../types';
import { aggregateGalleryItems } from '../../gallery-adapters';

interface GallerySourceState {
  builderItems: BuilderItem[];
  userId: string | undefined;
}

// Indexes Gallery items (curated seed + scaffold agents + Agent Builder items)
// into the command palette so agents/skills are discoverable via Cmd+K.
export function createGallerySource(getState: () => GallerySourceState): SearchSource {
  return {
    category: 'gallery',
    label: 'Agents & Skills',
    icon: 'Sparkles',
    getDocuments(): SearchDocument[] {
      const { builderItems, userId } = getState();
      return aggregateGalleryItems(builderItems, userId).map((item) => ({
        id: `gallery:${item.id}`,
        category: 'gallery',
        title: item.name,
        description: item.description,
        url: '/gallery',
        icon: item.icon ?? (item.kind === 'skill' ? 'Sparkles' : 'Bot'),
        tags: item.tags.join(' '),
        extra: item.kind,
        meta: {
          kind: item.kind,
          source: item.source,
          ...(item.category ? { category: item.category } : {}),
        },
      }));
    },
  };
}
