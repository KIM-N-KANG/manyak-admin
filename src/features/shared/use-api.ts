'use client';

import { useQuery } from '@tanstack/react-query';

import { customInstance } from '@/api/mutator/custom-instance';

export function useApi<T>(url: string, enabled = true) {
  return useQuery({
    queryKey: [url],
    enabled,
    queryFn: async ({ signal }) => {
      const response = await customInstance<{
        data: T;
        status: number;
        headers: Headers;
      }>(url, { signal });

      return response.data;
    },
  });
}
