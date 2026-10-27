import { type DatabaseRow, MAX_QUERY_LIMIT, databaseQueryResultSchema } from '@notiz/shared';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { sendJson } from '../../lib/apiClient';
import { databaseKeys } from './useDatabase';

/** Active rows of a relation's target database (first 500, manual order). */
export function useRelationRows(databaseId: string): UseQueryResult<DatabaseRow[]> {
  return useQuery({
    // Under databaseKeys.all, so edits in the target database refresh it.
    queryKey: [...databaseKeys.all(databaseId), 'relationRows'],
    queryFn: async () =>
      (
        await sendJson(
          'POST',
          `/api/databases/${databaseId}/query`,
          { limit: MAX_QUERY_LIMIT },
          databaseQueryResultSchema,
        )
      ).rows,
  });
}
