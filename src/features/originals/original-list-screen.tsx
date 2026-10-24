'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  DataTable,
  dateTime,
  NumberValue,
  PageHeading,
  QueryState,
  Status,
  TextLink,
} from '@/components/admin/data-ui';
import { ListFilterForm, SearchEmpty } from '@/components/admin/list-search';
import { TableSkeleton } from '@/components/admin/loading-ui';
import { PageNavigation } from '@/components/admin/page-navigation';
import { buttonVariants } from '@/components/ui/button';
import type { OriginalListItem } from '@/features/originals/types';
import type { Page } from '@/features/shared/types';
import { useApi } from '@/features/shared/use-api';

export function OriginalListScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const query = useApi<Page<OriginalListItem>>(`/api/originals?${params}`);
  const sort = params.get('sort') ?? 'updatedAt';
  const order = params.get('order') ?? 'desc';
  const href = (page: number) => {
    const next = new URLSearchParams(params);

    next.set('page', String(page));

    return `/originals?${next}`;
  };

  function changeSort(key: string) {
    const next = new URLSearchParams(params);

    next.set('sort', key);
    next.set(
      'order',
      params.has('sort') && sort === key && order === 'desc' ? 'asc' : 'desc',
    );
    next.set('page', '1');
    router.push(`/originals?${next}`);
  }

  return (
    <>
      <PageHeading title="오리지널">
        <Link href="/originals/new" className={buttonVariants()}>
          새 오리지널
        </Link>
      </PageHeading>
      <ListFilterForm label="오리지널 검색">
        <label className="flex flex-col gap-2 text-xs text-muted-foreground">
          공개 상태
          <select
            name="visibility"
            defaultValue={params.get('visibility') ?? ''}
            className="control">
            <option value="">전체</option>
            <option value="PUBLIC">공개</option>
            <option value="PRIVATE">비공개</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs text-muted-foreground">
          작성 상태
          <select
            name="status"
            defaultValue={params.get('status') ?? ''}
            className="control">
            <option value="">전체</option>
            <option value="DRAFT">초안</option>
            <option value="PUBLISHED">발행</option>
          </select>
        </label>
      </ListFilterForm>
      <QueryState
        skeleton={<TableSkeleton columns={6} />}
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data ? (
        <>
          <DataTable
            headers={[
              '제목',
              '장르',
              '공개 상태',
              { label: '채팅 수', key: 'chatCount' },
              { label: '총 턴 수', key: 'totalTurns' },
              { label: '수정 시각', key: 'updatedAt' },
            ]}
            sorting={{ key: sort, order, onSort: changeSort }}
            empty={!query.data.items.length}
            emptyContent={params.get('q') ? <SearchEmpty /> : undefined}>
            {query.data.items.map((item) => (
              <tr key={item.storyId}>
                <td>
                  <TextLink href={`/originals/${item.storyId}`}>
                    {item.title || '(제목 없는 초안)'}
                  </TextLink>
                  {item.status === 'DRAFT' ? (
                    <span className="ml-2 rounded-sm border px-2 py-1 text-xs text-muted-foreground">
                      초안
                    </span>
                  ) : null}
                </td>
                <td>{item.genres.join(' · ') || '—'}</td>
                <td>
                  <Status value={item.visibility} />
                </td>
                <td>
                  <NumberValue value={item.chatCount} />
                </td>
                <td>
                  <NumberValue value={item.totalTurns} />
                </td>
                <td>{dateTime(item.updatedAt)}</td>
              </tr>
            ))}
          </DataTable>
          <PageNavigation data={query.data} href={href} />
        </>
      ) : null}
    </>
  );
}
