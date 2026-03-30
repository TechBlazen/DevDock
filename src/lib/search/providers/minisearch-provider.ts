import MiniSearch from 'minisearch';
import type { SearchProvider, SearchDocument, SearchResult, SearchOptions, SearchCategory } from '../types';

export class MiniSearchProvider implements SearchProvider {
  private engine: MiniSearch<SearchDocument>;
  private docsByCategory: Map<SearchCategory, Set<string>> = new Map();

  constructor() {
    this.engine = new MiniSearch<SearchDocument>({
      fields: ['title', 'description', 'tags', 'content', 'extra'],
      storeFields: ['category', 'title', 'description', 'url', 'icon', 'meta'],
      searchOptions: {
        boost: { title: 3, description: 2, tags: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }

  index(documents: SearchDocument[]): void {
    for (const doc of documents) {
      if (this.docsByCategory.get(doc.category)?.has(doc.id)) {
        this.engine.discard(doc.id);
      }
    }

    this.engine.addAll(documents);

    for (const doc of documents) {
      let set = this.docsByCategory.get(doc.category);
      if (!set) {
        set = new Set();
        this.docsByCategory.set(doc.category, set);
      }
      set.add(doc.id);
    }
  }

  search(query: string, options?: SearchOptions): SearchResult[] {
    if (!query.trim()) return [];

    const miniSearchOptions: Parameters<typeof this.engine.search>[1] = {
      fuzzy: options?.fuzzy ?? 0.2,
      prefix: options?.prefix ?? true,
    };

    if (options?.categories?.length) {
      miniSearchOptions.filter = (result) =>
        options.categories!.includes(result.category as SearchCategory);
    }

    const raw = this.engine.search(query, miniSearchOptions);
    const limited = options?.limit ? raw.slice(0, options.limit) : raw;

    return limited.map((r) => ({
      id: r.id,
      category: r.category as SearchCategory,
      title: r.title as string,
      description: r.description as string,
      url: r.url as string,
      icon: r.icon as string | undefined,
      meta: r.meta as Record<string, string> | undefined,
      score: r.score,
    }));
  }

  removeByCategory(category: SearchCategory): void {
    const ids = this.docsByCategory.get(category);
    if (!ids) return;
    for (const id of ids) {
      this.engine.discard(id);
    }
    this.docsByCategory.delete(category);
    this.engine.vacuum();
  }

  clear(): void {
    this.engine.removeAll();
    this.docsByCategory.clear();
  }
}
