'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import {
  DataTable,
  NumberValue,
  PageHeading,
  QueryState,
  TextLink,
} from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AnalyticsSection } from '@/features/dashboard/analytics-section';
import { ChartCrosshair } from '@/features/dashboard/chart-crosshair';
import { chartNumber, periodAverage } from '@/features/dashboard/chart-data';
import {
  getDailyMetricHref,
  paymentHistoryHref,
} from '@/features/dashboard/links';
import { PlayInstallsCard } from '@/features/dashboard/play-installs-card';
import {
  RangePicker,
  useDashboardRange,
} from '@/features/dashboard/range-picker';
import type {
  DashboardCharts,
  DashboardSummary,
  MetricKey,
} from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

const metrics: Record<MetricKey, { label: string; unit: string }> = {
  joined: { label: '가입', unit: '명' },
  chats: { label: '채팅 시작', unit: '개' },
  turns: { label: '턴', unit: '턴' },
  stories: { label: '스토리 생성', unit: '개' },
  granted: {
    label: '이프 적립',
    unit: '이프',
  },
  spent: {
    label: '이프 소모',
    unit: '이프',
  },
  payments: { label: '결제 건수', unit: '건' },
  revenue: { label: '결제 금액 (환불 포함)', unit: '원' },
  attendance: { label: '출석 회원 수', unit: '명' },
};

const axisNumber = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const dailyMetrics = [
  'joined',
  'chats',
  'turns',
  'stories',
  'granted',
  'spent',
  'payments',
  'revenue',
] as const;

export function DashboardScreen() {
  const router = useRouter();
  const range = useDashboardRange();
  const summary = useApi<DashboardSummary>('/api/dashboard/summary');
  const charts = useApi<DashboardCharts>(
    `/api/dashboard/charts?${range.query}`,
  );

  const s = summary.data;
  const c = charts.data;
  const missingValueStatus = charts.isPending ? '불러오는 중' : '불러오기 실패';
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
        pending={summary.isPending}
        error={summary.error}
        retry={summary.refetch}
      />
      <section
        aria-label="요약 지표"
        className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
            <div key={label} className="relative min-h-56">
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
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{`${range.label} 합계 ${periodText}`}</p>
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
        <AnalyticsSection />
        <PlayInstallsCard />
      </section>
      <QueryState
        pending={charts.isPending}
        error={charts.error}
        retry={charts.refetch}
      />
      {c ? (
        <section
          aria-label="일별 지표 추이"
          className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {dailyMetrics.map((metric) => {
            const average = periodAverage(c.daily.map((day) => day[metric]));

            return (
              <Card key={metric} className="min-w-0">
                <h2 className="font-semibold">{metrics[metric].label}</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.from} ~ {c.to} (KST)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  기간 평균 {chartNumber(average)}
                  {metrics[metric].unit}
                </p>
                <ChartContainer
                  config={{
                    [metric]: {
                      label: metrics[metric].label,
                      color: 'var(--primary)',
                    },
                  }}
                  className="mt-5 h-[200px] w-full"
                  aria-label={`${metrics[metric].label} 일별 추이`}>
                  <LineChart
                    accessibilityLayer
                    data={c.daily}
                    margin={{ top: 20, right: 8, bottom: 0, left: 0 }}
                    onClick={(state) => {
                      const i = state.activeTooltipIndex;
                      const date = c.daily[Number(i)]?.date;

                      if (i !== null && i !== undefined && date)
                        router.push(getDailyMetricHref(metric, date));
                    }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => String(v).slice(5)}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={32}
                    />
                    <YAxis
                      width={52}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => axisNumber.format(Number(v))}
                    />
                    <ChartTooltip
                      cursor={<ChartCrosshair />}
                      isAnimationActive={false}
                      content={<ChartTooltipContent />}
                    />
                    <ReferenceLine
                      y={average}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
                    />
                    <Line
                      type="linear"
                      dataKey={metric}
                      stroke={`var(--color-${metric})`}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ChartContainer>
              </Card>
            );
          })}
          <details className="col-span-full">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              일별 수치와 목록 이동
            </summary>
            <div className="mt-4 max-h-64 overflow-auto">
              <DataTable
                headers={[
                  '날짜',
                  ...dailyMetrics.map(
                    (metric) =>
                      `${metrics[metric].label} (${metrics[metric].unit})`,
                  ),
                ]}>
                {c.daily.map((day) => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    {dailyMetrics.map((metric) => (
                      <td key={metric}>
                        <TextLink href={getDailyMetricHref(metric, day.date)}>
                          <NumberValue value={day[metric]} />{' '}
                          {metrics[metric].unit} →
                        </TextLink>
                      </td>
                    ))}
                  </tr>
                ))}
              </DataTable>
            </div>
          </details>
        </section>
      ) : null}
    </>
  );
}
