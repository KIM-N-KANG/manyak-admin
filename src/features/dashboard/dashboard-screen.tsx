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
import { MetricSparkline } from '@/features/dashboard/metric-sparkline';
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
    label: '이프 지급',
    unit: '이프',
  },
  spent: {
    label: '이프 소진',
    unit: '이프',
  },
  payments: { label: '결제 건수', unit: '건' },
  revenue: { label: '결제 금액', unit: '원' },
  attendance: { label: '출석 회원 수', unit: '명' },
};

export function DashboardScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const days = ['7', '30', '90'].includes(params.get('days') ?? '')
    ? params.get('days')!
    : '30';
  const rawMetric = params.get('metric') ?? 'joined';
  const metric: MetricKey = Object.hasOwn(metrics, rawMetric)
    ? (rawMetric as MetricKey)
    : 'joined';
  const summary = useApi<DashboardSummary>('/api/dashboard/summary');
  const charts = useApi<DashboardCharts>(`/api/dashboard/charts?days=${days}`);

  function update(key: string, value: string) {
    const q = new URLSearchParams(params);

    q.set(key, value);
    router.push(`${pathname}?${q}`);
  }

  const s = summary.data;
  const c = charts.data;
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
          '이프 지급',
          s.credits.grantedTotal,
          s.credits.grantedToday,
          '/members?creditDirection=granted',
          '이프',
          'granted',
        ],
        [
          '이프 소진',
          s.credits.spentTotal,
          s.credits.spentToday,
          '/members?creditDirection=spent&sort=creditsSpent',
          '이프',
          'spent',
        ],
        [
          '결제 이력',
          s.payments.completedTotal,
          s.payments.completedToday,
          paymentHistoryHref,
          '건',
          'payments',
        ],
        [
          '결제 금액',
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
      <PageHeading
        title="개요"
        description="서비스의 흐름과 이용 현황을 확인하세요.">
        <label className="flex items-center gap-3 text-sm">
          기간
          <select
            className="control"
            value={days}
            onChange={(e) => update('days', e.target.value)}>
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                최근 {d}일
              </option>
            ))}
          </select>
        </label>
      </PageHeading>
      <QueryState
        pending={summary.isPending}
        error={summary.error}
        retry={summary.refetch}
      />
      {s ? (
        <>
          <div className="mb-4 text-xs text-muted-foreground">
            {new Intl.DateTimeFormat('ko-KR', {
              timeZone: 'Asia/Seoul',
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(s.asOf))}{' '}
            KST 기준 · 오늘은 KST 자정부터 · 팀 계정 제외
          </div>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, total, today, href, unit, cardMetric]) => (
              <Link
                href={href}
                key={label}
                className="rounded-md border bg-card p-5 transition-colors hover:border-foreground-tertiary focus-visible:ring-2 focus-visible:ring-ring">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  <NumberValue value={total} />
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {unit}
                  </span>
                </p>
                {c?.daily.length ? (
                  <MetricSparkline
                    daily={c.daily}
                    metric={cardMetric}
                    label={label}
                  />
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">
                  {`오늘 ${today.toLocaleString('ko-KR')} ${unit}`}
                  <span className="float-right">↗</span>
                </p>
              </Link>
            ))}
          </div>
        </>
      ) : null}
      <AnalyticsSection days={days} />
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
                  {c.from} — {c.to} · KST
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
    </>
  );
}
