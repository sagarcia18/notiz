import { type Settings, type UpdateSettingsInput, settingsSchema } from '@notiz/shared';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getJson, sendJson } from '../../lib/apiClient';

const settingsKey = ['settings'] as const;

/** Polled so "last used" stays current while Claude works in the background. */
const REFRESH_MS = 30_000;

export function useSettings(): UseQueryResult<Settings> {
  return useQuery({
    queryKey: settingsKey,
    queryFn: () => getJson('/api/settings', settingsSchema),
    refetchInterval: REFRESH_MS,
  });
}

export function useUpdateSettings(): UseMutationResult<Settings, Error, UpdateSettingsInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => sendJson('PATCH', '/api/settings', input, settingsSchema),
    onSuccess: (settings) => queryClient.setQueryData(settingsKey, settings),
  });
}
