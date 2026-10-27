import { type DiagramUsage, diagramUsageListSchema } from '@notiz/shared';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { getJson } from '../../lib/apiClient';
import { diagramKeys } from './useDiagramLinks';

/** Diagrams that link to a page; refetched after diagram saves and on focus. */
export function useDiagramUsages(pageId: string): UseQueryResult<DiagramUsage[]> {
  return useQuery({
    queryKey: diagramKeys.usages(pageId),
    queryFn: () => getJson(`/api/pages/${pageId}/diagram-usages`, diagramUsageListSchema),
  });
}
