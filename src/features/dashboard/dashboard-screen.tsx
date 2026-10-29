'use client';

import Link from 'next/link';

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
import { AnalyticsSection } from '@/features/dashboard/analytics-section';
import { DailyTrends } from '@/features/dashboard/daily-trends';
import { paymentHistoryHref } from '@/features/dashboard/links';
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

export function DashboardScreen() {
  const range = useDashboardRange();
  const summary = useApi<DashboardSummary>('/api/dashboard/summary');
  const charts = useApi<DashboardCharts>(
    `/api/dashboard/charts?${range.query}`,
  );

  const showSummarySkeleton = useSkeletonVisible(summary.isPending);
  const s = summary.data;
  const c = charts.data;
  const missingValueStatus = '불러오기 실패';
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
          '스토리',
          s.stories.total,
          s.stories.createdToday,
          '/stories',
          '개',
          'stories',
        ],
        [
          '이프 적립',
          s.credits.grantedTotal,
          s.credits.grantedToday,
          '/credits/transactions?direction=granted',
          '이프',
          'granted',
        ],
        [
          '이프 소모',
          s.credits.spentTotal,
          s.credits.spentToday,
          '/credits/transactions?direction=spent',
          '이프',
          'spent',
        ],
        [
          '결제 건수',
          s.payments.completedTotal,
          s.payments.completedToday,
          paymentHistoryHref,
          '건',
          'payments',
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
        className="mb-8 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AnalyticsSection />
        {summary.isPending
          ? Array.from({ length: 8 }, (_, index) => (
              <SummaryCardSkeleton key={index} visible={showSummarySkeleton} />
            ))
          : null}
        {cards.map(([label, total, today, href, unit, cardMetric]) => {
          const periodTotal = c?.daily.reduce(
            (sum, day) => sum + day[cardMetric],
            0,
          );
          const periodText =
            periodTotal !== undefined
              ? `${periodTotal.toLocaleString('ko-KR')}${unit}`
              : missingValueStatus;

          return (
            <div key={label} className="relative">
              <Link
                href={href}
                className="flex h-full items-start gap-3 rounded-md border bg-card p-4 transition-colors hover:border-foreground-tertiary focus-visible:ring-2 focus-visible:ring-ring">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <dl>
                    <div className="mt-3">
                      <dt className="text-xs text-muted-foreground">누적</dt>
                      <dd className="mt-1 flex flex-wrap items-baseline gap-x-1 text-2xl font-semibold tracking-tight break-all sm:text-3xl">
                        <NumberValue value={total} />
                        <span className="text-xs font-normal text-muted-foreground">
                          {unit}
                        </span>
                      </dd>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2 text-sm text-muted-foreground">
                      <dt>오늘</dt>
                      <dd>
                        <NumberValue value={today} />
                        <span className="ml-1">{unit}</span>
                      </dd>
                    </div>
                  </dl>
                  {charts.isPending ? (
                    <LoadingStatus className="mt-2">
                      <Skeleton className="h-5 w-full" />
                    </LoadingStatus>
                  ) : (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{`${range.label} 합계 ${periodText}`}</p>
                  )}
                </div>
              </Link>
              {cardMetric === 'joined' && s ? (
                <span className="absolute top-4 left-[4.25rem]">
                  <HelpTooltip label="가입자 집계 안내">
                    탈퇴한 회원을 포함한 누적 가입자 수입니다. 현재 회원{' '}
                    {s.members.active.toLocaleString('ko-KR')}명, 누적 탈퇴{' '}
                    {s.members.withdrawn.toLocaleString('ko-KR')}명이며 팀
                    계정은 제외합니다.
                  </HelpTooltip>
                </span>
              ) : null}
            </div>
          );
        })}
        <PlayInstallsCard range={range} />
      </section>
      <QueryState
        skeleton={<ChartsSkeleton count={8} columns={4} compact />}
        pending={charts.isPending}
        error={charts.error}
        retry={charts.refetch}
      />
      {c ? <DailyTrends data={c} /> : null}
    </>
  );
}
