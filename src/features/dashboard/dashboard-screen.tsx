'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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

export function DashboardScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const range = useDashboardRange();
  const rawMetric = params.get('metric') ?? 'joined';
  const metric: MetricKey = Object.hasOwn(metrics, rawMetric)
    ? (rawMetric as MetricKey)
    : 'joined';
  const summary = useApi<DashboardSummary>('/api/dashboard/summary');
  const charts = useApi<DashboardCharts>(
    `/api/dashboard/charts?${range.query}`,
  );

  function update(key: string, value: string) {
    const q = new URLSearchParams(params);

    q.set(key, value);
    router.push(`${pathname}?${q}`);
  }

  const s = summary.data;
  const c = charts.data;
  const missingValueStatus = charts.isPending ? '불러오는 중' : '불러오기 실패';
  const average = periodAverage(c?.daily.map((day) => day[metric]) ?? []);
  const cards = s
    ? ([
        [
          '회원',
          s.members.total,
          s.members.joinedToday,
          '/members?excludeDeleted=true',
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
        pending={summary.isPending}
        error={summary.error}
        retry={summary.refetch}
      />
      {s ? (
        <>
          <section
            aria-label="요약 지표"
            className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                <Link
                  href={href}
                  key={label}
                  className="flex items-center gap-3 rounded-md border bg-card p-4 transition-colors hover:border-foreground-tertiary focus-visible:ring-2 focus-visible:ring-ring">
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
              );
            })}
          </section>
        </>
      ) : null}
      <QueryState
        pending={charts.isPending}
        error={charts.error}
        retry={charts.refetch}
      />
      {c ? (
        <>
          <Card className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">일별 추이</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.from} ~ {c.to} (KST)
                </p>
              </div>
              <label className="flex items-center gap-3 text-sm">
                지표
                <select
                  className="control"
                  value={metric}
                  onChange={(e) => update('metric', e.target.value)}>
                  {Object.entries(metrics).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ChartContainer
              config={{
                [metric]: {
                  label: metrics[metric].label,
                  color: 'var(--primary)',
                },
              }}
              className="mt-8 h-[300px] w-full"
              aria-label={`${metrics[metric].label} 일별 추이`}>
              <LineChart
                accessibilityLayer
                data={c.daily}
                onClick={(state) => {
                  const i = state.activeTooltipIndex;
                  const date = c.daily[Number(i)]?.date;

                  if (i !== null && date) {
                    router.push(getDailyMetricHref(metric, date));
                  }
                }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => String(v).slice(5)}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis width={52} tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={<ChartCrosshair />}
                  isAnimationActive={false}
                  content={<ChartTooltipContent />}
                />
                <ReferenceLine
                  y={average}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  label={{
                    value: `기간 평균 ${chartNumber(average)}`,
                    position: 'insideTopRight',
                    fill: 'var(--muted-foreground)',
                    fontSize: 11,
                  }}
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
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                일별 수치와 목록 이동
              </summary>
              <div className="mt-4 max-h-64 overflow-auto">
                <DataTable
                  headers={['날짜', metrics[metric].label, '관련 목록']}>
                  {c.daily.map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>
                        <NumberValue value={d[metric]} /> {metrics[metric].unit}
                      </td>
                      <td>
                        <TextLink href={getDailyMetricHref(metric, d.date)}>
                          목록 →
                        </TextLink>
                      </td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            </details>
          </Card>
        </>
      ) : null}
      <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <AnalyticsSection query={range.query} label={range.label} />
        <PlayInstallsCard />
      </div>
    </>
  );
}
