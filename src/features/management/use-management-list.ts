'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { Page } from '@/features/shared/types';
import { useApi } from '@/features/shared/use-api';

export function useManagementList<T>(
  endpoint: string,
  defaultSort = 'createdAt',
  queryDefaults: Record<string, string> = {},
) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const apiParams = new URLSearchParams(params);

  for (const [key, value] of Object.entries(queryDefaults))
    if (!apiParams.has(key)) apiParams.set(key, value);

  const query = useApi<Page<T>>(`${endpoint}?${apiParams}`);
  const sort = params.get('sort') ?? defaultSort;
  const order = params.get('order') ?? 'desc';

  function href(page: number) {
    const next = new URLSearchParams(params);

    next.set('page', String(page));

    return `${pathname}?${next}`;
  }

  function changeSort(key: string) {
    const next = new URLSearchParams(params);

    next.set('sort', key);
    next.set(
      'order',
      params.has('sort') && sort === key && order === 'desc' ? 'asc' : 'desc',
    );
    next.set('page', '1');
    router.push(`${pathname}?${next}`);
  }

  return { query, params, sort, order, href, changeSort };
}
