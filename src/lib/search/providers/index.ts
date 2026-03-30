import type { SearchProvider } from '../types';
import { MiniSearchProvider } from './minisearch-provider';

export function createSearchProvider(): SearchProvider {
  return new MiniSearchProvider();
}
