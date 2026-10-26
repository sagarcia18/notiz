import { type HealthResponse, healthResponseSchema } from '@notiz/shared';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { getJson } from '../../lib/apiClient';

export function useHealth(): UseQueryResult<HealthResponse> {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => getJson('/api/health', healthResponseSchema),
  });
}
