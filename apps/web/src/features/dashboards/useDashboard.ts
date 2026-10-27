import {
  type CreateWidgetInput,
  type DashboardDetail,
  type DashboardWidget,
  type UpdateDashboardLayoutInput,
  type UpdateWidgetInput,
  type WidgetConfig,
  type WidgetData,
  dashboardDetailSchema,
  dashboardWidgetSchema,
  widgetDataSchema,
} from '@notiz/shared';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getJson, sendEmpty, sendJson } from '../../lib/apiClient';

export const dashboardKeys = {
  detail: (dashboardId: string) => ['dashboards', dashboardId] as const,
  /**
   * Under the database prefix, so every database mutation (rows, properties,
   * views) refreshes the widgets reading from it. The config is part of the
   * key: a changed widget fetches fresh data at once.
   */
  data: (widgetId: string, config: WidgetConfig) =>
    ['databases', config.databaseId ?? 'none', 'widget-data', widgetId, config] as const,
};

export function useDashboard(dashboardId: string): UseQueryResult<DashboardDetail> {
  return useQuery({
    queryKey: dashboardKeys.detail(dashboardId),
    queryFn: () => getJson(`/api/dashboards/${dashboardId}`, dashboardDetailSchema),
  });
}

export function useWidgetData(widget: DashboardWidget): UseQueryResult<WidgetData> {
  return useQuery({
    queryKey: dashboardKeys.data(widget.id, widget.config),
    queryFn: () => getJson(`/api/widgets/${widget.id}/data`, widgetDataSchema),
  });
}

function useDashboardMutation<TData, TVariables>(
  dashboardId: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
): UseMutationResult<TData, Error, TVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) }),
  });
}

export function useCreateWidget(
  dashboardId: string,
): UseMutationResult<DashboardWidget, Error, CreateWidgetInput> {
  return useDashboardMutation(dashboardId, (input: CreateWidgetInput) =>
    sendJson('POST', `/api/dashboards/${dashboardId}/widgets`, input, dashboardWidgetSchema),
  );
}

export interface UpdateWidgetVariables {
  id: string;
  input: UpdateWidgetInput;
}

export function useUpdateWidget(
  dashboardId: string,
): UseMutationResult<DashboardWidget, Error, UpdateWidgetVariables> {
  return useDashboardMutation(dashboardId, ({ id, input }: UpdateWidgetVariables) =>
    sendJson('PATCH', `/api/widgets/${id}`, input, dashboardWidgetSchema),
  );
}

export function useDeleteWidget(dashboardId: string): UseMutationResult<void, Error, string> {
  return useDashboardMutation(dashboardId, (id: string) =>
    sendEmpty('DELETE', `/api/widgets/${id}`),
  );
}

/** Saves dragged/resized positions; the answer replaces the cached dashboard. */
export function useSaveLayout(
  dashboardId: string,
): UseMutationResult<DashboardDetail, Error, UpdateDashboardLayoutInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDashboardLayoutInput) =>
      sendJson('PUT', `/api/dashboards/${dashboardId}/layout`, input, dashboardDetailSchema),
    onSuccess: (detail) => queryClient.setQueryData(dashboardKeys.detail(dashboardId), detail),
  });
}
