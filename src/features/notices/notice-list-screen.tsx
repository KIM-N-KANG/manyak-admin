'use client';

import Link from 'next/link';

import {
  DataTable,
  dateTime,
  PageHeading,
  QueryState,
  Status,
  TextLink,
} from '@/components/admin/data-ui';
import { ListSearch, SearchEmpty } from '@/components/admin/list-search';
import { PageNavigation } from '@/components/admin/page-navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { useManagementList } from '@/features/management/use-management-list';
import type { NoticeListItem } from '@/features/notices/types';

export function NoticeListScreen() {
  const { query, params, sort, order, changeSort, href, apply } =
    useManagementList<NoticeListItem>('/api/notices');

  return (
    <>
      <PageHeading
        title="공지"
        description="공지의 작성과 게시, 알림 요청을 관리하세요.">
        <Link href="/notices/new" className={buttonVariants()}>
          새 공지
        </Link>
      </PageHeading>
      <ListSearch label="공지 제목 검색" />
      <form
        key={params.toString()}
        action={apply}
        className="mb-6 flex items-end gap-4 rounded-md border bg-card p-5">
        <label className="flex flex-col gap-2 text-sm">
          상태
          <select
            name="status"
            defaultValue={params.get('status') ?? ''}
            className="control">
            <option value="">전체</option>
            <option value="DRAFT">초안</option>
            <option value="PUBLISHED">게시</option>
          </select>
        </label>
        <Button type="submit">적용</Button>
        <TextLink href="/notices">초기화</TextLink>
      </form>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data ? (
        <>
          <DataTable
            headers={[
              { label: '제목', key: 'title' },
              { label: '상태', key: 'status' },
              { label: '게시 시각', key: 'publishedAt' },
              { label: '알림 여부', key: 'notifiedAt' },
            ]}
            sorting={{ key: sort, order, onSort: changeSort }}
            empty={!query.data.items.length}
            emptyContent={params.get('q') ? <SearchEmpty /> : undefined}>
            {query.data.items.map((i) => (
              <tr key={i.noticeId}>
                <td>
                  <TextLink href={`/notices/${i.noticeId}`}>{i.title}</TextLink>
                </td>
                <td>
                  <Status value={i.status} />
                </td>
                <td>{i.publishedAt ? dateTime(i.publishedAt) : '—'}</td>
                <td>{i.notifiedAt ? '알림 요청됨' : '없음'}</td>
              </tr>
            ))}
          </DataTable>
          <PageNavigation data={query.data} href={href} />
        </>
      ) : null}
    </>
  );
}
