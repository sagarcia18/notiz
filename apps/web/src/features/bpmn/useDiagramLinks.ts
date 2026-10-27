import { type DiagramLink, diagramLinkListSchema } from '@notiz/shared';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { getJson } from '../../lib/apiClient';

export const diagramKeys = {
  links: (pageId: string) => ['diagrams', pageId, 'links'] as const,
  usages: (pageId: string) => ['diagrams', 'usages', pageId] as const,
  allUsages: ['diagrams', 'usages'] as const,
};

/** Linked pages of a diagram with their status; refetched after saves and on focus. */
export function useDiagramLinks(pageId: string): UseQueryResult<DiagramLink[]> {
  return useQuery({
    queryKey: diagramKeys.links(pageId),
    queryFn: () => getJson(`/api/pages/${pageId}/diagram-links`, diagramLinkListSchema),
  });
}
