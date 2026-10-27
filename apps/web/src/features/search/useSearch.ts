import { type SearchResult, searchResultListSchema } from '@notiz/shared';
import { type UseQueryResult, keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getJson } from '../../lib/apiClient';

const SEARCH_LIMIT = 20;
const DEBOUNCE_MS = 150;

/** `value`, updated only after it stayed unchanged for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs = DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Full-text search; idle for blank queries, keeps the last results while typing. */
export function useSearch(query: string): UseQueryResult<SearchResult[]> {
  const q = query.trim();
  return useQuery({
    queryKey: ['search', q],
    queryFn: () =>
      getJson(
        `/api/search?q=${encodeURIComponent(q)}&limit=${SEARCH_LIMIT}`,
        searchResultListSchema,
      ),
    enabled: q !== '',
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });
}
