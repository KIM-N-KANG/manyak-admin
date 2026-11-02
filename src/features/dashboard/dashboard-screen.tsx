'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  NumberValue,
  PageHeading,
  QueryState,
} from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import {
  ChartsSkeleton,
  LoadingStatus,
  SummaryCardSkeleton,
} from '@/components/admin/loading-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { DefinitionText } from '@/features/analytics/metric-definition';
import { AnalyticsSection } from '@/features/dashboard/analytics-section';
import {
  dailyMetrics,
  DailyTrends,
  metrics,
} from '@/features/dashboard/daily-trends';
import { PlayInstallsCard } from '@/features/dashboard/play-installs-card';
import {
  RangePicker,
  useDashboardRange,
} from '@/features/dashboard/range-picker';
import type {
  DashboardCharts,
  DashboardSummary,
} from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';
import { useSkeletonVisible } from '@/features/shared/use-skeleton-visible';

import { Comparison, previousPeriod } from './comparison';

export function DashboardScreen() {
  const range = useDashboardRange();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const metric =
    dailyMetrics.find((key) => key === params.get('metric')) ?? 'joined';
  const summary = useApi<DashboardSummary>('/api/dashboard/summary');
  const charts = useApi<DashboardCharts>(
    `/api/dashboard/charts?${range.query}`,
  );
  const showSummarySkeleton = useSkeletonVisible(summary.isPending);
  const s = summary.isError ? undefined : summary.data;
  const c = charts.isError ? undefined : charts.data;
  const days = c?.previous
    ? previousPeriod({ from: c.previous.from, to: c.previous.to }).days
    : previousPeriod(range).days;
  const status = charts.isError ? '불러오기 실패' : undefined;
  const cards = s
    ? ([
        [
          '가입자',
          s.members.total,
          s.members.joinedToday,
          '/members',
          '명',
          'joined',
        ],
        [
          '채팅 시작',
          s.chats.startedTotal,
          s.chats.startedToday,
          '/chats',
          '개',
          'chats',
        ],
        [
          '턴',
          s.chats.turnsTotal,
          s.chats.turnsToday,
          '/chats?sort=turnCount',
          '턴',
          'turns',
        ],
        [
          '결제 금액 (환불 포함)',
          s.payments.amountKrwTotal,
          s.payments.amountKrwToday,
          '/payments',
          '원',
          'revenue',
        ],
      ] as const)
    : [];

  return (
    <>
      <PageHeading title="개요">
        <RangePicker range={range} />
      </PageHeading>
      <QueryState
        variant="inline"
        skeleton={<span />}
        pending={summary.isPending}
        error={summary.error}
        retry={summary.refetch}
      />
      <section
        aria-label="요약 지표"
        aria-busy={summary.isPending}
        className="mb-8 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <AnalyticsSection />
        {summary.isPending
          ? Array.from({ length: 4 }, (_, index) => (
              <SummaryCardSkeleton key={index} visible={showSummarySkeleton} />
            ))
          : null}
        {cards.map(([label, total, today, href, unit, key]) => (
          <div key={key} className="relative">
            <Link
              href={href}
              className="flex h-full items-start gap-3 rounded-md border bg-card p-6 transition-colors hover:border-foreground-tertiary focus-visible:ring-2 focus-visible:ring-ring">
              <div className="min-w-0 flex-1">
                <p className="pr-7 text-sm text-muted-foreground">{label}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {charts.isPending ? (
                    <LoadingStatus>
                      <Skeleton className="h-9 w-24" />
                    </LoadingStatus>
                  ) : (
                    <span className="text-2xl font-semibold tracking-tight break-all sm:text-3xl">
                      {status ??
                        (c?.totals?.[key] == null ? (
                          '준비 중'
                        ) : (
                          <>
                            <NumberValue value={c.totals[key]} />
                            {unit}
                          </>
                        ))}
                    </span>
                  )}
                  <Comparison
                    value={c?.totals?.[key]}
                    previous={c?.previous?.totals?.[key]}
                    days={days}
                    status={status}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  오늘 {today.toLocaleString('ko-KR')}
                  {unit}, 누적 {total.toLocaleString('ko-KR')}
                  {unit}
                </p>
              </div>
            </Link>
            <span className="absolute top-6 right-6">
              <HelpTooltip label={`${label} 집계 안내`}>
                <DefinitionText index={77} />
                {key === 'joined' && s ? (
                  <p className="mt-2">
                    탈퇴한 회원을 포함한 가입자 수입니다. 현재 회원{' '}
                    {s.members.active.toLocaleString('ko-KR')}명, 누적 탈퇴{' '}
                    {s.members.withdrawn.toLocaleString('ko-KR')}명이며 팀
                    계정은 제외합니다.
                  </p>
                ) : null}
              </HelpTooltip>
            </span>
          </div>
        ))}
        <PlayInstallsCard range={range} />
      </section>
      <QueryState
        skeleton={<ChartsSkeleton count={1} overview />}
        pending={charts.isPending}
        error={charts.error}
        retry={charts.refetch}
      />
      {c ? (
        <DailyTrends
          data={c}
          selectedMetrics={[metric]}
          tableMetrics={dailyMetrics}
          controls={
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              지표
              <select
                aria-label="지표"
                className="control"
                value={metric}
                onChange={(event) => {
                  const next = new URLSearchParams(params);

                  next.set('metric', event.target.value);
                  router.push(`${pathname}?${next}`, { scroll: false });
                }}>
                {dailyMetrics.map((key) => (
                  <option key={key} value={key}>
                    {metrics[key].label}
                  </option>
                ))}
              </select>
            </label>
          }
        />
      ) : null}
    </>
  );
}
