import { create } from 'zustand';
import type { SearchResult, SearchCategory, SearchProvider, SearchSource } from '../lib/search/types';
import { createSearchProvider } from '../lib/search/providers';
import { createSearchSources } from '../lib/search/sources';

interface SearchStore {
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  activeCategory: SearchCategory | null;
  selectedIndex: number;

  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  setActiveCategory: (category: SearchCategory | null) => void;
  setSelectedIndex: (index: number) => void;
  moveSelection: (delta: number) => void;

  _provider: SearchProvider | null;
  _sources: SearchSource[];
  initialize: () => void;
  reindex: (category?: SearchCategory) => void;
}

export const useSearchStore = create<SearchStore>()((set, get) => ({
  isOpen: false,
  query: '',
  results: [],
  activeCategory: null,
  selectedIndex: 0,

  _provider: null,
  _sources: [],

  open: () => set({ isOpen: true, selectedIndex: 0 }),
  close: () => set({ isOpen: false, query: '', results: [], activeCategory: null, selectedIndex: 0 }),

  setQuery: (query: string) => {
    const { _provider, activeCategory } = get();
    if (!_provider) return;

    const results = query.trim()
      ? _provider.search(query, {
          categories: activeCategory ? [activeCategory] : undefined,
          limit: 50,
        })
      : [];

    set({ query, results, selectedIndex: 0 });
  },

  setActiveCategory: (category: SearchCategory | null) => {
    set({ activeCategory: category });
    const { query, _provider } = get();
    if (!_provider || !query.trim()) return;

    const results = _provider.search(query, {
      categories: category ? [category] : undefined,
      limit: 50,
    });
    set({ results, selectedIndex: 0 });
  },

  setSelectedIndex: (index: number) => set({ selectedIndex: index }),

  moveSelection: (delta: number) => {
    const { results, selectedIndex } = get();
    if (results.length === 0) return;
    const next = (selectedIndex + delta + results.length) % results.length;
    set({ selectedIndex: next });
  },

  initialize: () => {
    const provider = createSearchProvider();
    const sources = createSearchSources();

    const documents = sources.flatMap((s) => s.getDocuments());
    provider.index(documents);

    set({ _provider: provider, _sources: sources });
  },

  reindex: (category?: SearchCategory) => {
    const { _provider, _sources, query, activeCategory } = get();
    if (!_provider) return;

    if (category) {
      _provider.removeByCategory(category);
      const source = _sources.find((s) => s.category === category);
      if (source) {
        _provider.index(source.getDocuments());
      }
    } else {
      _provider.clear();
      const documents = _sources.flatMap((s) => s.getDocuments());
      _provider.index(documents);
    }

    if (query.trim()) {
      const results = _provider.search(query, {
        categories: activeCategory ? [activeCategory] : undefined,
        limit: 50,
      });
      set({ results });
    }
  },
}));
