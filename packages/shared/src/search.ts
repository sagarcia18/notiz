import { z } from 'zod';
import { pageIdSchema, pageKindSchema } from './pages.js';

export const MAX_SEARCH_RESULTS = 50;
export const DEFAULT_SEARCH_RESULTS = 20;

/** Query string of `GET /api/search`. */
export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_RESULTS).default(DEFAULT_SEARCH_RESULTS),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

/** An active page whose title or text matches, best matches first. */
export const searchResultSchema = z.object({
  id: pageIdSchema,
  parentId: pageIdSchema.nullable(),
  kind: pageKindSchema,
  title: z.string(),
  icon: z.string().nullable(),
  /** Set when the page is a row of a database page. */
  databaseId: pageIdSchema.nullable(),
  /** Short plain-text excerpt around the match. */
  snippet: z.string(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchResultListSchema = z.array(searchResultSchema);

/**
 * Turns free text into an FTS5 query: every word must match as a prefix.
 * Quotes are dropped so user input never becomes FTS syntax.
 */
export function toFtsQuery(text: string): string {
  return text
    .replaceAll('"', ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => `"${word}"*`)
    .join(' ');
}
