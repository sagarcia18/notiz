import {
  type CreatePageInput,
  type MovePageInput,
  type PageDetail,
  type PageSummary,
  type PageTreeNode,
  type UpdatePageInput,
  pageDetailSchema,
  pageSummarySchema,
  pageTreeSchema,
} from '@notiz/shared';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getJson, sendEmpty, sendJson } from '../../lib/apiClient';

export const pageKeys = {
  tree: ['pages', 'tree'] as const,
  detail: (id: string) => ['pages', 'detail', id] as const,
  trash: ['trash'] as const,
};

export function usePageTree(): UseQueryResult<PageTreeNode[]> {
  return useQuery({
    queryKey: pageKeys.tree,
    queryFn: () => getJson('/api/pages/tree', pageTreeSchema),
  });
}

export function usePage(id: string): UseQueryResult<PageDetail> {
  return useQuery({
    queryKey: pageKeys.detail(id),
    queryFn: () => getJson(`/api/pages/${id}`, pageDetailSchema),
  });
}

export function useCreatePage(): UseMutationResult<PageDetail, Error, CreatePageInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => sendJson('POST', '/api/pages', input, pageDetailSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pageKeys.tree }),
  });
}

export function useUpdatePage(id: string): UseMutationResult<PageDetail, Error, UpdatePageInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => sendJson('PATCH', `/api/pages/${id}`, input, pageDetailSchema),
    onSuccess: async (page) => {
      queryClient.setQueryData(pageKeys.detail(id), page);
      await queryClient.invalidateQueries({ queryKey: pageKeys.tree });
    },
  });
}

export interface MovePageVariables {
  id: string;
  input: MovePageInput;
}

export function useMovePage(): UseMutationResult<PageSummary, Error, MovePageVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) =>
      sendJson('POST', `/api/pages/${id}/move`, input, pageSummarySchema),
    onSettled: () => queryClient.invalidateQueries({ queryKey: pageKeys.tree }),
  });
}

export function useTrashPage(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => sendEmpty('DELETE', `/api/pages/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pageKeys.tree });
      await queryClient.invalidateQueries({ queryKey: pageKeys.trash });
    },
  });
}
