'use client';

import Link from 'next/link';

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
import { useManagementList } from '@/features/management/use-management-list';
import type { Campaign } from '@/features/notifications/types';

export function CampaignListScreen() {
  const { query, params, sort, order, changeSort, href } =
    useManagementList<Campaign>('/api/notifications/campaigns');

  return (
    <>
      <PageHeading title="캠페인">
        <Link href="/notifications/campaigns/new" className={buttonVariants()}>
          새 캠페인
        </Link>
      </PageHeading>
      <ListFilterForm label="캠페인 제목·본문 검색">
        <label className="grid gap-2 text-sm">
          상태
          <select
            className="control"
            name="status"
            defaultValue={params.get('status') ?? ''}>
            <option value="">전체</option>
            {['SCHEDULED', 'SENDING', 'SENT', 'CANCELED', 'FAILED'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          종류
          <select
            className="control"
            name="kind"
            defaultValue={params.get('kind') ?? ''}>
            <option value="">전체</option>
            <option value="SERVICE">정보성</option>
            <option value="MARKETING">광고성</option>
          </select>
        </label>
      </ListFilterForm>
      <QueryState
        skeleton={<TableSkeleton columns={9} />}
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
              { label: '종류', key: 'kind' },
              { label: '예약 시각', key: 'scheduledAt' },
              { label: '대상 회원', key: 'targetCount' },
              { label: '발송 요청', key: 'sentCount' },
              { label: '도달 회원', key: 'deliveredMembers' },
              { label: '도달 기기', key: 'deliveredDevices' },
              { label: '실패 기기', key: 'failedDevices' },
            ]}
            sorting={{ key: sort, order, onSort: changeSort }}
            empty={!query.data.items.length}
            emptyContent={params.get('q') ? <SearchEmpty /> : undefined}>
            {query.data.items.map((i) => (
              <tr key={i.campaignId}>
                <td>
                  <TextLink href={`/notifications/campaigns/${i.campaignId}`}>
                    {i.title}
                  </TextLink>
                </td>
                <td>
                  <Status value={i.status} />
                </td>
                <td>{i.kind === 'SERVICE' ? '정보성' : '광고성'}</td>
                <td>{dateTime(i.scheduledAt)}</td>
                {[
                  i.targetCount,
                  i.sentCount,
                  i.deliveredMembers,
                  i.deliveredDevices,
                  i.failedDevices,
                ].map((n, j) => (
                  <td key={j}>
                    {n === null ? '집계 전' : <NumberValue value={n} />}
                  </td>
                ))}
              </tr>
            ))}
          </DataTable>
          <PageNavigation data={query.data} href={href} />
        </>
      ) : null}
    </>
  );
}
