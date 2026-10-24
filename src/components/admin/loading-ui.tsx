'use client';

import type { ReactNode } from 'react';

import { usePathname } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSkeletonVisible } from '@/features/shared/use-skeleton-visible';
import { cn } from '@/lib/utils';

export function LoadingStatus({
  children,
  immediate = false,
  className,
}: {
  children?: ReactNode;
  className?: string;
  immediate?: boolean;
}) {
  const visible = useSkeletonVisible(true);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('min-w-0', className)}>
      <span className="sr-only">데이터를 불러오는 중입니다…</span>
      <div
        aria-hidden="true"
        style={{ visibility: immediate || visible ? 'visible' : 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

export function InlineSkeleton() {
  return (
    <div className="mt-3" data-loading-layout="inline">
      <Skeleton className="h-4 w-10" />
      <Skeleton className="mt-1 h-9 w-28 max-w-full" />
      <Skeleton className="mt-3 h-5 w-36 max-w-full" />
      <Skeleton className="mt-2 h-5 w-full" />
    </div>
  );
}

export function SummaryCardSkeleton({ visible = true }: { visible?: boolean }) {
  return (
    <Card
      aria-hidden="true"
      style={{ visibility: visible ? 'visible' : 'hidden' }}
      className="min-w-0 p-4"
      data-loading-layout="summary-card">
      <Skeleton className="h-5 w-24" />
      <InlineSkeleton />
    </Card>
  );
}

export function SummarySkeleton({
  count = 4,
  overview = false,
  withDetail = false,
}: {
  count?: number;
  overview?: boolean;
  withDetail?: boolean;
}) {
  return (
    <div
      className={cn(
        'mb-5 grid items-stretch gap-3 sm:grid-cols-2',
        overview ? 'xl:grid-cols-5' : 'gap-5 xl:grid-cols-4',
      )}>
      {Array.from({ length: count }, (_, i) =>
        overview ? (
          <SummaryCardSkeleton key={i} />
        ) : (
          <Card key={i}>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-3 h-8 w-28" />
            {withDetail ? <Skeleton className="mt-2 h-4 w-full" /> : null}
          </Card>
        ),
      )}
    </div>
  );
}

export function TableSkeleton({
  columns = 6,
  rows = 10,
  pagination = true,
}: {
  columns?: number;
  rows?: number;
  pagination?: boolean;
}) {
  return (
    <div data-loading-layout="table">
      <div className="overflow-x-auto rounded-md border bg-card">
        <div className="min-w-[640px]">
          {Array.from({ length: rows + 1 }, (_, row) => (
            <div
              key={row}
              className={cn(
                'grid gap-4 px-5 py-4',
                row === 0 ? 'border-b bg-muted/50' : 'border-b last:border-b-0',
              )}
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}>
              {Array.from({ length: columns }, (_, col) => (
                <Skeleton
                  key={col}
                  className={cn(
                    'h-5',
                    (row + col) % 3 === 0 ? 'w-3/4' : 'w-full',
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {pagination ? (
        <div className="mt-5 flex justify-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="size-9" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DetailSkeleton({ split = false }: { split?: boolean }) {
  return (
    <div className="space-y-5" data-loading-layout="detail">
      <div className={cn('grid gap-5', split && 'xl:grid-cols-[1fr_2fr]')}>
        {(split ? [8, 7] : [8]).map((count, index) => (
          <Card key={index}>
            <Skeleton className="mb-5 h-6 w-32" />
            <div className="space-y-4">
              {Array.from({ length: count }, (_, i) => (
                <div key={i} className="grid grid-cols-[7rem_1fr] gap-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <TableSkeleton columns={4} rows={10} pagination={false} />
    </div>
  );
}

export function ChartsSkeleton({
  count = 2,
  columns = 2,
  compact = false,
  infra = false,
}: {
  count?: number;
  columns?: 2 | 4;
  compact?: boolean;
  infra?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid gap-5',
        columns === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'xl:grid-cols-2',
      )}
      data-loading-layout="charts">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="min-w-0">
          <Skeleton className="h-6 w-36 max-w-full" />
          {compact ? (
            <>
              <Skeleton className="mt-2 h-4 w-40 max-w-full" />
              <Skeleton className="mt-1 h-4 w-28" />
            </>
          ) : null}
          <div
            className={cn(
              'relative mt-5',
              compact ? 'h-[200px]' : infra ? 'h-64' : 'h-72',
            )}>
            <Skeleton
              className={cn(
                'w-full',
                compact ? 'h-full' : 'h-[calc(100%-2rem)]',
              )}
            />
            {!compact ? (
              <div className="absolute inset-x-4 bottom-0 flex justify-center gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function BarsSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div
      className={cn('grid gap-5', count > 1 && 'xl:grid-cols-2')}
      data-loading-layout="bars">
      {Array.from({ length: count }, (_, card) => (
        <Card key={card}>
          <Skeleton className="h-6 w-40" />
          <div className="mt-5 flex h-80 flex-col justify-around">
            {[90, 75, 60, 45, 30].map((width, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-8" style={{ width: `${width}%` }} />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <Card data-loading-layout="form">
      <div className="space-y-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className={i === 2 ? 'h-32 w-full' : 'h-10 w-full'} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export type PageLoadingLayout =
  | 'list'
  | 'detail'
  | 'overview'
  | 'analytics'
  | 'form';
export function PageSkeleton({
  layout = 'list',
  immediate = false,
  columns = 6,
}: {
  layout?: PageLoadingLayout;
  immediate?: boolean;
  columns?: number;
}) {
  return (
    <LoadingStatus immediate={immediate}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-48" />
      </div>
      {layout === 'overview' ? (
        <>
          <SummarySkeleton count={10} overview />
          <ChartsSkeleton count={8} columns={4} compact />
        </>
      ) : layout === 'detail' ? (
        <DetailSkeleton />
      ) : layout === 'analytics' ? (
        <>
          <Skeleton className="mb-5 h-11 w-full" />
          <SummarySkeleton />
          <ChartsSkeleton />
        </>
      ) : layout === 'form' ? (
        <FormSkeleton />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-4">
            <Skeleton className="h-16 w-64" />
            <Skeleton className="h-16 w-40" />
            <Skeleton className="h-16 w-24" />
          </div>
          <TableSkeleton columns={columns} />
        </>
      )}
    </LoadingStatus>
  );
}

export function ShellSkeleton() {
  const pathname = usePathname();
  const layout: PageLoadingLayout =
    pathname === '/dashboard'
      ? 'overview'
      : pathname.startsWith('/analytics') || pathname === '/dashboard/analytics'
        ? 'analytics'
        : /\/(new|edit)$/.test(pathname)
          ? 'form'
          : /\/[0-9a-f-]{8,}$/i.test(pathname)
            ? 'detail'
            : 'list';

  if (pathname === '/login')
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <PageSkeleton immediate layout="form" />
      </main>
    );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <aside
        aria-hidden="true"
        className="border-b bg-sidebar lg:h-dvh lg:border-r lg:border-b-0">
        <div className="border-b px-6 py-5">
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-4 p-3 lg:py-6">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1600px] min-w-0 p-6 lg:p-10">
        <PageSkeleton immediate layout={layout} />
      </main>
    </div>
  );
}
