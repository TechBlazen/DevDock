export type SearchCategory =
  | 'repository'
  | 'mcp-server'
  | 'doc'
  | 'plugin'
  | 'scaffold-agent'
  | 'telemetry'
  | 'activity'
  | 'forum';

export interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  description: string;
  url: string;
  icon?: string;
  meta?: Record<string, string>;
  score: number;
}

export interface SearchDocument {
  id: string;
  category: SearchCategory;
  title: string;
  description: string;
  url: string;
  icon?: string;
  tags?: string;
  content?: string;
  extra?: string;
  meta?: Record<string, string>;
}

export interface SearchSource {
  category: SearchCategory;
  label: string;
  icon: string;
  getDocuments(): SearchDocument[];
}

export interface SearchProvider {
  index(documents: SearchDocument[]): void;
  search(query: string, options?: SearchOptions): SearchResult[];
  removeByCategory(category: SearchCategory): void;
  clear(): void;
}

export interface SearchOptions {
  categories?: SearchCategory[];
  limit?: number;
  fuzzy?: number;
  prefix?: boolean;
}
