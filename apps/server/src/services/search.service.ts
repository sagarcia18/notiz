import { type SearchQuery, type SearchResult, toFtsQuery } from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import * as searchRepo from '../repositories/search.repository.js';

/** Full-text search over titles, page text, diagram labels and database descriptions. */
export function searchPages(db: AppDatabase, { q, limit }: SearchQuery): SearchResult[] {
  const ftsQuery = toFtsQuery(q);
  if (ftsQuery === '') return [];
  return searchRepo.searchPages(db, ftsQuery, limit).map(({ parentKind, ...row }) => ({
    ...row,
    databaseId: parentKind === 'database' ? row.parentId : null,
  }));
}
