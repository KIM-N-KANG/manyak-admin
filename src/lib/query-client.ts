import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 1000 * 60 * 5,
        staleTime: 1000 * 60,
        refetchOnWindowFocus: false,
        throwOnError: false,
      },
      mutations: { throwOnError: false },
    },
  });
}
