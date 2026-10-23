import type { ReactNode } from 'react';

import Link from 'next/link';

import { FetchError } from '@/api/mutator/custom-instance';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { HelpTooltip } from './help-tooltip';

export function PageHeading({
  title,
  help,
  children,
}: {
  title: string;
  help?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h1 className="text-[32px] leading-10 font-semibold tracking-[-1.28px]">
            {title}
          </h1>
          {help}
        </div>
      </div>
      {children}
    </div>
  );
}
export function QueryState({
  pending,
  error,
  retry,
  source,
  variant = 'panel',
}: {
  pending: boolean;
  error: Error | null;
  retry: () => unknown;
  source?: 'amplitude' | 'play' | 'langfuse';
  variant?: 'panel' | 'inline';
}) {
  const serverNotImplemented =
    error instanceof FetchError &&
    error.status === 503 &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'message' in error.data &&
    error.data.message === '서버 미구현';

  const unavailable = error instanceof FetchError && error.status === 503;

  if (error) {
    const title = serverNotImplemented
      ? '기능 준비 중'
      : unavailable && source === 'amplitude'
        ? 'Amplitude 지표를 불러올 수 없음'
        : unavailable && source === 'play'
          ? '설치 지표 사용 불가'
          : unavailable && source === 'langfuse'
            ? 'AI 비용을 불러올 수 없음'
            : '데이터 불러오기 실패';
    const description = serverNotImplemented
      ? '이 기능은 서버 연결을 준비 중입니다.'
      : unavailable && source === 'amplitude'
        ? '잠시 후 다시 시도해 주세요.'
        : unavailable && source === 'play'
          ? '잠시 후 다시 시도해 주세요. 문제가 계속되면 Play 설치 지표 설정과 보고서 상태를 확인해 주세요.'
          : unavailable && source === 'langfuse'
            ? '잠시 후 다시 시도해 주세요. 문제가 계속되면 서버의 Langfuse 설정을 확인해 주세요.'
            : '잠시 후 다시 시도해 주세요. 문제가 계속되면 담당자에게 문의해 주세요.';

    if (variant === 'inline')
      return (
        <div role="alert" className="mt-3 text-sm leading-5">
          <div className="flex items-start gap-1">
            <h2 className="min-w-0 font-medium break-words">{title}</h2>
            <HelpTooltip label={`${title} 안내`}>{description}</HelpTooltip>
          </div>
          <button
            type="button"
            onClick={() => void retry()}
            className="mt-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            다시 시도
          </button>
        </div>
      );

    return (
      <Card role="alert">
        <h2 className="font-semibold">{title}</h2>
        <p className="my-3 text-sm text-muted-foreground">{description}</p>
        <Button variant="outline" onClick={() => void retry()}>
          다시 시도
        </Button>
      </Card>
    );
  }

  if (pending)
    return variant === 'inline' ? (
      <div
        role="status"
        aria-live="polite"
        className="mt-3 text-sm text-muted-foreground">
        데이터를 불러오는 중입니다…
      </div>
    ) : (
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
  emptyContent,
  sorting,
}: {
  headers: (string | { label: string; key?: string; help?: ReactNode })[];
  sorting?: { key: string; order: string; onSort: (key: string) => void };
  children: ReactNode;
  empty?: boolean;
  emptyContent?: ReactNode;
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
                  {typeof header !== 'string' && header.help ? (
                    <span className="ml-1 inline-flex align-middle">
                      {header.help}
                    </span>
                  ) : null}
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
                {emptyContent ??
                  '조건에 맞는 결과가 없습니다. 필터를 변경해 주세요.'}
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
