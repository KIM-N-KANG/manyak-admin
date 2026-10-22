'use client';

import {
  DataTable,
  dateTime,
  NumberValue,
  PageHeading,
  QueryState,
  TextLink,
} from '@/components/admin/data-ui';
import { ListFilterForm } from '@/components/admin/list-search';
import { PageNavigation } from '@/components/admin/page-navigation';
import { creditReasonLabel } from '@/features/credits/reason-label';
import type { CreditTransactionItem } from '@/features/credits/types';
import { useManagementList } from '@/features/management/use-management-list';
import { cn } from '@/lib/utils';

export function CreditTransactionsScreen() {
  const { query, params, href, sort, order, changeSort } =
    useManagementList<CreditTransactionItem>(
      '/api/credits/transactions',
      'createdAt',
      { page: '1', size: '20', order: 'desc' },
    );

  return (
    <>
      <PageHeading
        title="이프 내역"
        description="전체 회원의 이프 원장을 확인하세요."
      />
      <p className="mb-4 text-sm text-muted-foreground">
        팀 계정 거래도 포함하므로 팀 계정을 제외하는 대시보드 카드의 집계와 다를
        수 있습니다. 전체에는 사용 취소·만료·회수 등 모든 사유가 포함됩니다.
      </p>
      <ListFilterForm label="이프 내역" searchEnabled={false}>
        <label className="flex flex-col gap-2 text-xs text-muted-foreground">
          방향
          <select
            name="direction"
            className="control"
            defaultValue={params.get('direction') ?? ''}>
            <option value="">전체</option>
            <option value="granted">지급</option>
            <option value="spent">소진</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs text-muted-foreground">
          기록일 (KST)
          <input
            name="date"
            type="date"
            className="control"
            defaultValue={params.get('date') ?? ''}
          />
        </label>
      </ListFilterForm>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data ? (
        <>
          <DataTable
            headers={[
              { label: '기록 시각 (KST)', key: 'createdAt' },
              '회원',
              '사유',
              '수량 (이프)',
            ]}
            sorting={{ key: sort, order, onSort: changeSort }}
            empty={!query.data.items.length}>
            {query.data.items.map((row, index) => (
              <tr key={`${row.member.memberId}-${row.createdAt}-${index}`}>
                <td>{dateTime(row.createdAt)}</td>
                <td>
                  <TextLink href={`/members/${row.member.memberId}`}>
                    {row.member.nickname}
                  </TextLink>
                </td>
                <td>{creditReasonLabel(row.reason)}</td>
                <td
                  className={cn(
                    row.amount > 0
                      ? 'text-primary-text'
                      : row.amount < 0
                        ? 'text-destructive'
                        : undefined,
                  )}>
                  {row.amount > 0 ? '+' : ''}
                  <NumberValue value={row.amount} />
                </td>
              </tr>
            ))}
          </DataTable>
          <PageNavigation
            data={query.data}
            href={href}
            label="이프 내역 페이지"
          />
        </>
      ) : null}
    </>
  );
}
