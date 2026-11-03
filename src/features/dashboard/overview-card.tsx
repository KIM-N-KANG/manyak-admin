'use client';

import { type ReactNode } from 'react';

import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSkeletonVisible } from '@/features/shared/use-skeleton-visible';
import { cn } from '@/lib/utils';

import { changeText } from './comparison';
import { Sparkline, type TrendPoint } from './overview-sparkline';

export const overviewGridClassName =
  'grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4';

const linkClassName =
  'after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring';

export function OverviewCard({
  title,
  href,
  help,
  value,
  comparison,
  detail,
  detailTitle,
  fullLink = false,
  loading,
  visible,
  trend,
}: {
  title?: string;
  href?: string;
  help?: ReactNode;
  value?: ReactNode;
  comparison?: {
    value?: number | null;
    previous?: number | null;
    days: number;
    status?: string;
  };
  detail?: ReactNode;
  detailTitle?: string;
  fullLink?: boolean;
  loading?: 'all' | 'data' | 'value';
  visible?: boolean;
  trend?: TrendPoint[];
}) {
  const showSkeleton = useSkeletonVisible(!!loading);
  const skeleton = (className: string) => (
    <div
      aria-hidden="true"
      style={{ visibility: (visible ?? showSkeleton) ? 'visible' : 'hidden' }}>
      <Skeleton className={className} />
    </div>
  );
  const body = (
    <>
      <div
        data-overview-slot="title"
        className="flex h-10 min-w-0 items-start pr-6 text-sm text-muted-foreground">
        {loading === 'all' ? (
          skeleton('h-5 w-24')
        ) : (
          <h3>
            {href && !fullLink ? (
              <Link href={href} className={linkClassName}>
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
        )}
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_36%] gap-x-2 gap-y-1 2xl:grid-cols-[minmax(0,1fr)_46%]">
        <div
          data-overview-slot="value"
          className="col-start-1 row-start-1 min-h-8 min-w-0 text-lg font-semibold tracking-tight whitespace-nowrap tabular-nums min-[1800px]:text-2xl sm:text-xl lg:text-2xl xl:text-lg 2xl:text-xl">
          {loading && loading !== 'all' ? (
            <span role="status" className="sr-only">
              데이터를 불러오는 중입니다…
            </span>
          ) : null}
          {loading ? skeleton('h-8 w-24 max-w-full') : value}
        </div>
        <div
          data-overview-slot="change"
          className="col-start-1 min-h-4 text-xs font-normal text-muted-foreground">
          {loading
            ? skeleton('h-4 w-20')
            : comparison
              ? (comparison.status ??
                (comparison.value == null || comparison.previous == null
                  ? '준비 중'
                  : changeText(comparison.value, comparison.previous)))
              : null}
        </div>
        <div
          data-overview-slot="comparison"
          className="col-start-1 min-h-4 text-xs font-normal text-muted-foreground">
          {loading
            ? skeleton('h-4 w-24')
            : comparison
              ? `이전 ${comparison.days}일 대비`
              : null}
        </div>
        <Sparkline trend={loading ? undefined : trend} />
      </div>
      <div
        data-overview-slot="detail"
        title={detailTitle}
        className="mt-2 h-4 min-w-0 truncate text-xs text-muted-foreground">
        {loading === 'all' || loading === 'data'
          ? skeleton('h-4 w-full')
          : detail}
      </div>
    </>
  );

  return (
    <Card
      data-overview-card=""
      data-loading-layout={loading === 'all' ? 'summary-card' : undefined}
      role={title ? 'region' : undefined}
      aria-label={title}
      aria-hidden={loading === 'all' ? true : undefined}
      aria-busy={loading ? true : undefined}
      style={
        loading === 'all'
          ? { visibility: (visible ?? showSkeleton) ? 'visible' : 'hidden' }
          : undefined
      }
      className={cn(
        'relative h-full min-w-0 p-4',
        href && 'transition-colors hover:border-foreground-tertiary',
      )}>
      {fullLink && href ? (
        <Link
          href={href}
          className={cn(
            'grid h-full min-w-0 content-start gap-1',
            linkClassName,
          )}>
          {body}
        </Link>
      ) : (
        <div className="grid h-full min-w-0 content-start gap-1">{body}</div>
      )}
      {help ? (
        <span className="absolute top-4 right-4 z-10">{help}</span>
      ) : null}
    </Card>
  );
}
