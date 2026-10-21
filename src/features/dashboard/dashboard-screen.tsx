'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
import {
  getDailyMetricHref,
  paymentHistoryHref,
} from '@/features/dashboard/links';
import type {
  DashboardCharts,
  DashboardSummary,
  Distribution,
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

function DistributionCard({
  distribution,
  index,
}: {
  distribution: Distribution;
  index: number;
}) {
  const router = useRouter();
  const color = `var(--chart-${(index % 5) + 1})`;

  return (
    <Card className="min-w-0">
      <h2 className="font-semibold">{distribution.title}</h2>
      <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">
        {distribution.description}
      </p>
      <ChartContainer
        config={{ value: { label: distribution.unit, color } }}
        className="mt-5 h-[220px] w-full"
        aria-label={distribution.title}>
        <BarChart
          accessibilityLayer
          data={distribution.points}
          onClick={(state) => {
            const i = state.activeTooltipIndex;

            if (i !== null && i !== undefined && distribution.points[Number(i)])
              router.push(distribution.points[Number(i)].href);
          }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              String(v).startsWith('2026-') ? String(v).slice(5) : String(v)
            }
            minTickGap={10}
          />
          <YAxis width={36} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="value"
            fill="var(--color-value)"
            radius={[3, 3, 0, 0]}
            className="cursor-pointer"
          />
        </BarChart>
      </ChartContainer>
      <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          수치 및 관련 목록
        </summary>
        <ul className="mt-3 space-y-2">
          {distribution.points.map((p) => (
            <li key={p.label} className="flex justify-between gap-3">
              <TextLink href={p.href}>{p.label} →</TextLink>
              <span>
                {p.value.toLocaleString('ko-KR')} {distribution.unit}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

export function DashboardScreen() {
  const params = useSearchParams();
  const router = useRouter();
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
    router.push(`/?${q}`);
  }

  const s = summary.data;
  const c = charts.data;
  const cards = s
    ? ([
        [
          '회원',
          s.members.total,
          s.members.joinedToday,
          '/members?excludeDeleted=true',
          '명',
        ],
        [
          '채팅 시작',
          s.chats.startedTotal,
          s.chats.startedToday,
          '/chats',
          '개',
        ],
        [
          '턴',
          s.chats.turnsTotal,
          s.chats.turnsToday,
          '/chats?sort=turns',
          '턴',
        ],
        ['스토리', s.stories.total, s.stories.createdToday, '/stories', '개'],
        [
          '이프 지급',
          s.credits.grantedTotal,
          s.credits.grantedToday,
          '/members?creditDirection=granted',
          '이프',
        ],
        [
          '이프 소진',
          s.credits.spentTotal,
          s.credits.spentToday,
          '/members?creditDirection=spent&sort=spent',
          '이프',
        ],
        [
          '결제 이력',
          s.payments.completedTotal,
          s.payments.completedToday,
          paymentHistoryHref,
          '건',
        ],
        [
          '결제 금액',
          s.payments.amountKrwTotal,
          s.payments.amountKrwToday,
          '/payments',
          '원',
        ],
      ] as const)
    : [];

  return (
    <>
      <PageHeading
        title="대시보드"
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
            {cards.map(([label, total, today, href, unit]) => (
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
                <p className="mt-3 text-xs text-muted-foreground">
                  {`오늘 ${today.toLocaleString('ko-KR')} ${unit}`}
                  <span className="float-right">↗</span>
                </p>
              </Link>
            ))}
          </div>
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
                  color: 'var(--chart-1)',
                },
              }}
              className="mt-8 h-[300px] w-full"
              aria-label={`${metrics[metric].label} 일별 추이`}>
              <AreaChart
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
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={`var(--color-${metric})`}
                  fill={`var(--color-${metric})`}
                  fillOpacity={0.08}
                />
              </AreaChart>
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">이용 분포</h2>
            <span className="text-xs text-muted-foreground">
              막대 또는 수치를 눌러 목록으로 이동
            </span>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            {c.distributions.map((d, i) => (
              <DistributionCard key={d.chartId} distribution={d} index={i} />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
