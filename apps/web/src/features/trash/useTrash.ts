import {
  type PageSummary,
  type TrashEntry,
  pageSummarySchema,
  trashListSchema,
} from '@notiz/shared';
import {
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getJson, sendEmpty, sendJson } from '../../lib/apiClient';
import { pageKeys } from '../pages/usePages';

async function refreshTreeAndTrash(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: pageKeys.trash });
  await queryClient.invalidateQueries({ queryKey: pageKeys.tree });
}

export function useTrash(): UseQueryResult<TrashEntry[]> {
  return useQuery({
    queryKey: pageKeys.trash,
    queryFn: () => getJson('/api/trash', trashListSchema),
  });
}

export function useRestorePage(): UseMutationResult<PageSummary, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => sendJson('POST', `/api/trash/${id}/restore`, {}, pageSummarySchema),
    onSuccess: () => refreshTreeAndTrash(queryClient),
  });
}

export function usePurgePage(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => sendEmpty('DELETE', `/api/trash/${id}`),
    onSuccess: () => refreshTreeAndTrash(queryClient),
  });
}

export function useEmptyTrash(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendEmpty('DELETE', '/api/trash'),
    onSuccess: () => refreshTreeAndTrash(queryClient),
  });
}
