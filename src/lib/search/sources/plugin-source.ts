import type { SearchSource, SearchDocument } from '../types';
import type { ForgePlugin } from '../../../types';

interface PluginStoreState {
  plugins: ForgePlugin[];
}

export function createPluginSource(getState: () => PluginStoreState): SearchSource {
  return {
    category: 'plugin',
    label: 'Plugins',
    icon: 'Puzzle',
    getDocuments(): SearchDocument[] {
      return getState().plugins.map((plugin) => ({
        id: `plugin:${plugin.id}`,
        category: 'plugin',
        title: plugin.name,
        description: plugin.description,
        url: '/plugins',
        icon: 'Puzzle',
        tags: plugin.tags?.join(' ') ?? '',
        extra: plugin.category,
        meta: {
          category: plugin.category,
          author: plugin.author,
          version: plugin.version,
        },
      }));
    },
  };
}
