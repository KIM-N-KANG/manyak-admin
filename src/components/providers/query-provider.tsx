'use client';

import { type PropsWithChildren, useState } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { makeQueryClient } from '@/lib/query-client';

export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
