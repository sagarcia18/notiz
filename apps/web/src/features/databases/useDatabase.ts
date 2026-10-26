import {
  type CreatePropertyInput,
  type CreateRowInput,
  type CreateViewInput,
  type DatabaseDetail,
  type DatabaseProperty,
  type DatabaseRow,
  type DatabaseView,
  type MovePageInput,
  type PageDetail,
  type UpdatePageInput,
  type UpdatePropertyInput,
  type UpdateViewInput,
  databaseDetailSchema,
  databasePropertySchema,
  databaseRowListSchema,
  databaseRowSchema,
  databaseViewSchema,
  pageDetailSchema,
  pageSummarySchema,
} from '@notiz/shared';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getJson, sendEmpty, sendJson } from '../../lib/apiClient';
import { pageKeys } from '../pages/usePages';

export const databaseKeys = {
  all: (databaseId: string) => ['databases', databaseId] as const,
  detail: (databaseId: string) => ['databases', databaseId, 'detail'] as const,
  rows: (databaseId: string, viewId: string) => ['databases', databaseId, 'rows', viewId] as const,
};

export function useDatabase(databaseId: string): UseQueryResult<DatabaseDetail> {
  return useQuery({
    queryKey: databaseKeys.detail(databaseId),
    queryFn: () => getJson(`/api/databases/${databaseId}`, databaseDetailSchema),
  });
}

export function useViewRows(databaseId: string, viewId: string): UseQueryResult<DatabaseRow[]> {
  return useQuery({
    queryKey: databaseKeys.rows(databaseId, viewId),
    queryFn: () => getJson(`/api/views/${viewId}/rows`, databaseRowListSchema),
  });
}

/** A mutation that refreshes everything cached for the database afterwards. */
function useDatabaseMutation<TData, TVariables>(
  databaseId: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
): UseMutationResult<TData, Error, TVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: databaseKeys.all(databaseId) }),
  });
}

export function useCreateProperty(
  databaseId: string,
): UseMutationResult<DatabaseProperty, Error, CreatePropertyInput> {
  return useDatabaseMutation(databaseId, (input: CreatePropertyInput) =>
    sendJson('POST', `/api/databases/${databaseId}/properties`, input, databasePropertySchema),
  );
}

export interface UpdatePropertyVariables {
  id: string;
  input: UpdatePropertyInput;
}

export function useUpdateProperty(
  databaseId: string,
): UseMutationResult<DatabaseProperty, Error, UpdatePropertyVariables> {
  return useDatabaseMutation(databaseId, ({ id, input }: UpdatePropertyVariables) =>
    sendJson('PATCH', `/api/properties/${id}`, input, databasePropertySchema),
  );
}

export function useDeleteProperty(databaseId: string): UseMutationResult<void, Error, string> {
  return useDatabaseMutation(databaseId, (id: string) =>
    sendEmpty('DELETE', `/api/properties/${id}`),
  );
}

export function useCreateView(
  databaseId: string,
): UseMutationResult<DatabaseView, Error, CreateViewInput> {
  return useDatabaseMutation(databaseId, (input: CreateViewInput) =>
    sendJson('POST', `/api/databases/${databaseId}/views`, input, databaseViewSchema),
  );
}

export interface UpdateViewVariables {
  id: string;
  input: UpdateViewInput;
}

export function useUpdateView(
  databaseId: string,
): UseMutationResult<DatabaseView, Error, UpdateViewVariables> {
  return useDatabaseMutation(databaseId, ({ id, input }: UpdateViewVariables) =>
    sendJson('PATCH', `/api/views/${id}`, input, databaseViewSchema),
  );
}

export function useDeleteView(databaseId: string): UseMutationResult<void, Error, string> {
  return useDatabaseMutation(databaseId, (id: string) => sendEmpty('DELETE', `/api/views/${id}`));
}

export function useCreateRow(
  databaseId: string,
): UseMutationResult<DatabaseRow, Error, CreateRowInput> {
  return useDatabaseMutation(databaseId, (input: CreateRowInput) =>
    sendJson('POST', `/api/databases/${databaseId}/rows`, input, databaseRowSchema),
  );
}

export interface UpdateRowVariables {
  id: string;
  input: UpdatePageInput;
}

/** Updates a row's title or values; also refreshes the row's page if it is cached. */
export function useUpdateRow(
  databaseId: string,
): UseMutationResult<PageDetail, Error, UpdateRowVariables> {
  const queryClient = useQueryClient();
  return useDatabaseMutation(databaseId, async ({ id, input }: UpdateRowVariables) => {
    const page = await sendJson('PATCH', `/api/pages/${id}`, input, pageDetailSchema);
    queryClient.setQueryData(pageKeys.detail(id), page);
    return page;
  });
}

export interface MoveRowVariables {
  id: string;
  input: MovePageInput;
}

export function useMoveRow(
  databaseId: string,
): UseMutationResult<unknown, Error, MoveRowVariables> {
  return useDatabaseMutation(databaseId, ({ id, input }: MoveRowVariables) =>
    sendJson('POST', `/api/pages/${id}/move`, input, pageSummarySchema),
  );
}

export function useTrashRow(databaseId: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useDatabaseMutation(databaseId, async (id: string) => {
    await sendEmpty('DELETE', `/api/pages/${id}`);
    await queryClient.invalidateQueries({ queryKey: pageKeys.trash });
  });
}
