'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { ChatRoom } from '@/features/chats/types';
import type { MemberListItem } from '@/features/members/types';
import type { PaymentOrder } from '@/features/payments/types';
import { defaultSort, type ListDomain } from '@/features/shared/list-config';
import type { Page } from '@/features/shared/types';
import { useApi } from '@/features/shared/use-api';
import type { Story } from '@/features/stories/types';

export function usePagedList(
  domain: ListDomain,
  scope?: Record<string, string>,
) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const key = (name: string) =>
    scope ? `${domain}${name[0].toUpperCase()}${name.slice(1)}` : name;
  const apiParams = new URLSearchParams(scope ?? params);

  if (scope)
    for (const name of ['page', 'size', 'sort', 'order', 'deleted']) {
      const value = params.get(key(name));

      if (value !== null) apiParams.set(name, value);
    }

  // 삭제 필터의 제외와 알 수 없는 값은 요청에 싣지 않는다.
  if (!['include', 'only'].includes(apiParams.get('deleted') ?? ''))
    apiParams.delete('deleted');

  const query = useApi<Page<Story | MemberListItem | PaymentOrder | ChatRoom>>(
    `/api/${domain}?${apiParams}`,
  );
  const sort = apiParams.get('sort') ?? defaultSort[domain];
  const order = apiParams.get('order') ?? 'desc';

  function href(page: number) {
    const next = new URLSearchParams(params);

    next.set(key('page'), String(page));

    return `${pathname}?${next}`;
  }

  function changeSort(column: string) {
    const next = new URLSearchParams(params);

    next.set(key('sort'), column);
    next.set(
      key('order'),
      apiParams.has('sort') && sort === column && order === 'desc'
        ? 'asc'
        : 'desc',
    );
    next.set(key('page'), '1');
    router.push(`${pathname}?${next}`);
  }

  function changeDeleted(value: string) {
    const next = new URLSearchParams(params);

    if (value) next.set(key('deleted'), value);
    else next.delete(key('deleted'));

    next.set(key('page'), '1');
    router.push(`${pathname}?${next}`, { scroll: false });
  }

  return {
    query,
    sort,
    order,
    deleted: apiParams.get('deleted') ?? '',
    changeSort,
    changeDeleted,
    href,
  };
}
