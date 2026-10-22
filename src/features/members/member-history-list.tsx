'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import {
  DataTable,
  dateTime,
  NumberValue,
  QueryState,
} from '@/components/admin/data-ui';
import { PageNavigation } from '@/components/admin/page-navigation';
import { creditReasonLabel } from '@/features/credits/reason-label';
import type {
  AttendanceRecord,
  CreditTransaction,
} from '@/features/members/types';
import type { Page } from '@/features/shared/types';
import { useApi } from '@/features/shared/use-api';

export function MemberHistoryList({
  memberId,
  kind,
}: {
  memberId: string;
  kind: 'transactions' | 'attendance';
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const apiParams = new URLSearchParams();

  for (const name of ['page', 'size']) {
    const value = params.get(`${kind}${name === 'page' ? 'Page' : 'Size'}`);

    if (value !== null) apiParams.set(name, value);
  }

  const query = useApi<Page<CreditTransaction | AttendanceRecord>>(
    `/api/members/${encodeURIComponent(memberId)}/${kind}?${apiParams}`,
  );
  const title = kind === 'transactions' ? '이프 거래 내역' : '출석 기록';

  function href(page: number) {
    const next = new URLSearchParams(params);

    next.set(`${kind}Page`, String(page));

    return `${pathname}?${next}`;
  }

  return (
    <>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data ? (
        <>
          <DataTable
            headers={
              kind === 'transactions'
                ? ['시각', '사유', '변동 이프', '거래 후 잔액']
                : ['출석일 (KST)', '지급 이프']
            }
            empty={!query.data.items.length}>
            {query.data.items.map((row, index) =>
              'createdAt' in row ? (
                <tr key={`${row.createdAt}-${index}`}>
                  <td>{dateTime(row.createdAt)}</td>
                  <td>{creditReasonLabel(row.reason)}</td>
                  <td>
                    {row.amount > 0 ? '+' : ''}
                    <NumberValue value={row.amount} />
                  </td>
                  <td>
                    <NumberValue value={row.balanceAfter} />
                  </td>
                </tr>
              ) : (
                <tr key={`${row.date}-${index}`}>
                  <td>{row.date}</td>
                  <td>
                    <NumberValue value={row.creditAmount} />
                  </td>
                </tr>
              ),
            )}
          </DataTable>
          <PageNavigation
            data={query.data}
            href={href}
            label={`${title} 페이지`}
          />
        </>
      ) : null}
    </>
  );
}
