import type { ReactNode } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h1 className="text-[32px] leading-10 font-semibold tracking-[-1.28px]">
            {title}
          </h1>
          <span className="text-xs text-muted-foreground">
            고정 데이터 미리보기
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
export function QueryState({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => unknown;
}) {
  if (error)
    return (
      <Card role="alert">
        <h2 className="font-semibold">데이터를 불러오지 못했습니다</h2>
        <p className="my-3 text-sm text-muted-foreground">
          주소와 필터를 확인한 뒤 다시 시도하세요.
        </p>
        <Button variant="outline" onClick={() => void retry()}>
          다시 시도
        </Button>
      </Card>
    );

  if (pending)
    return (
      <Card
        role="status"
        aria-live="polite"
        className="py-16 text-center text-muted-foreground">
        데이터를 불러오는 중입니다…
      </Card>
    );

  return null;
}
export function Status({ value }: { value: string }) {
  const labels: Record<string, string> = {
    ACTIVE: '정상',
    SUSPENDED: '정지',
    DELETED: '탈퇴',
    COMPLETED: '완료',
    REFUNDED: '환불',
    PUBLIC: '공개',
    PRIVATE: '비공개',
    HELD: '검수 보류',
    APPROVED: '승인',
    GUEST: '게스트',
    MEMBER: '회원',
  };

  return (
    <span className="inline-flex rounded-sm border bg-muted px-2 py-1 text-xs">
      {labels[value] ?? value}
    </span>
  );
}
export function DataTable({
  headers,
  children,
  empty,
  sorting,
}: {
  headers: (string | { label: string; key: string })[];
  sorting?: { key: string; order: string; onSort: (key: string) => void };
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            {headers.map((header) => {
              const label = typeof header === 'string' ? header : header.label;
              const key = typeof header === 'string' ? null : header.key;
              const active = sorting && key === sorting.key;

              return (
                <th
                  key={label}
                  scope="col"
                  aria-sort={
                    active
                      ? sorting.order === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className="px-5 py-4 font-medium whitespace-nowrap text-muted-foreground">
                  {key && sorting ? (
                    <button
                      type="button"
                      onClick={() => sorting.onSort(key)}
                      className="inline-flex items-center gap-2 rounded-sm text-left hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                      {label}
                      {active ? (
                        <span aria-hidden="true">
                          {sorting.order === 'asc' ? '↑' : '↓'}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y [&_td]:px-5 [&_td]:py-4 [&_td]:whitespace-nowrap [&_tr]:transition-colors [&_tr:hover]:bg-muted/50">
          {empty ? (
            <tr>
              <td
                colSpan={headers.length}
                className="h-40 text-center text-muted-foreground">
                조건에 맞는 결과가 없습니다. 필터를 변경해 주세요.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className="text-link underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      href={href}>
      {children}
    </Link>
  );
}
export function NumberValue({ value }: { value: number }) {
  return (
    <span className="font-mono tabular-nums">
      {value.toLocaleString('ko-KR')}
    </span>
  );
}
export function dateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
export function DetailGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="mb-2 text-xs text-muted-foreground">{label}</dt>
          <dd className="text-sm break-all">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
