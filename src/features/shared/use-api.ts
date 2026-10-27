'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { customInstance } from '@/api/mutator/custom-instance';
import { finishInitialLoading } from '@/features/shared/loading-timing';
import { adminResponseValues } from '@/features/shared/response-values';

export function useApi<T>(
  url: string,
  enabled = true,
  options: Pick<UseQueryOptions<T>, 'refetchInterval' | 'placeholderData'> = {},
) {
  return useQuery<T>({
    ...options,
    queryKey: [url],
    enabled,
    queryFn: async ({ signal, client }) => {
      const startedAt = performance.now();
      const initial = client.getQueryData([url]) === undefined;

      try {
        const response = await customInstance<{
          data: T;
          status: number;
          headers: Headers;
        }>(url, { signal });

        return adminResponseValues(response.data, url) as T;
      } finally {
        await finishInitialLoading(startedAt, initial, signal);
      }
    },
  });
}
