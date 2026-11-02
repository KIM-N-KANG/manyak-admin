'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  NumberValue,
  PageHeading,
  QueryState,
} from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import {
  ChartsSkeleton,
  SummaryCardSkeleton,
} from '@/components/admin/loading-ui';
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

import { AiCostCard } from './ai-cost-card';
import { previousPeriod } from './comparison';
import { OverviewCard, overviewGridClassName } from './overview-card';

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
          '결제 금액 (환불 포함)',
          s.payments.amountKrwTotal,
          s.payments.amountKrwToday,
          '/payments',
          '원',
          'revenue',
        ],
        [
          '스토리 생성',
          s.stories.total,
          s.stories.createdToday,
          '/stories',
          '개',
          'stories',
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
      ] as const)
    : [];

  const dbCards = cards.map(([label, total, today, href, unit, key]) => (
    <OverviewCard
      key={key}
      title={label}
      href={href}
      fullLink
      loading={charts.isPending ? 'value' : undefined}
      value={
        status ??
        (c?.totals?.[key] == null ? (
          '준비 중'
        ) : (
          <>
            <NumberValue value={c.totals[key]} />
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {unit}
            </span>
          </>
        ))
      }
      comparison={{
        value: c?.totals?.[key],
        previous: c?.previous?.totals?.[key],
        days,
        status,
      }}
      detail={`오늘 ${today.toLocaleString('ko-KR')}${unit}, 누적 ${total.toLocaleString('ko-KR')}${unit}`}
      detailTitle={`오늘 ${today.toLocaleString('ko-KR')}${unit}, 누적 ${total.toLocaleString('ko-KR')}${unit}`}
      help={
        <HelpTooltip label={`${label} 집계 안내`}>
          <DefinitionText index={77} />
          {key === 'joined' && s ? (
            <p className="mt-2">
              탈퇴한 회원을 포함한 가입자 수입니다. 현재 회원{' '}
              {s.members.active.toLocaleString('ko-KR')}명, 누적 탈퇴{' '}
              {s.members.withdrawn.toLocaleString('ko-KR')}명이며 팀 계정은
              제외합니다.
            </p>
          ) : null}
        </HelpTooltip>
      }
    />
  ));

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
        className={`mb-8 ${overviewGridClassName}`}>
        <AnalyticsSection />
        {dbCards[0] ??
          (summary.isPending ? (
            <SummaryCardSkeleton visible={showSummarySkeleton} />
          ) : null)}

        <PlayInstallsCard range={range} />
        {summary.isPending
          ? Array.from({ length: 4 }, (_, index) => (
              <SummaryCardSkeleton key={index} visible={showSummarySkeleton} />
            ))
          : dbCards.slice(1)}
        <AiCostCard query={range.query} previous={c?.previous} days={days} />
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
