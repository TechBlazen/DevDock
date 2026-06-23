import type { SearchSource, SearchDocument } from '../types';
import type { BuilderItem, RegistryItem } from '../../../types';
import { aggregateGalleryItems } from '../../gallery-adapters';

interface GallerySourceState {
  builderItems: BuilderItem[];
  registryItems: RegistryItem[];
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
      const { builderItems, registryItems, userId } = getState();
      return aggregateGalleryItems(builderItems, registryItems, userId).map((item) => ({
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
