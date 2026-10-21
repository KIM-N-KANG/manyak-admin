'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { PageHeading, QueryState, TextLink } from '@/components/admin/data-ui';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { DashboardCharts, Distribution } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

function DistributionCard({ distribution }: { distribution: Distribution }) {
  const router = useRouter();
  const color = 'var(--primary)';

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

export function DashboardAnalysisScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const days = ['7', '30', '90'].includes(params.get('days') ?? '')
    ? params.get('days')!
    : '30';
  const charts = useApi<DashboardCharts>(`/api/dashboard/charts?days=${days}`);

  function updateDays(value: string) {
    const query = new URLSearchParams(params);

    query.set('days', value);
    router.push(`${pathname}?${query}`);
  }

  return (
    <>
      <PageHeading
        title="분석"
        description="이용 분포를 살펴보고 관련 목록으로 이동하세요.">
        <label className="flex items-center gap-3 text-sm">
          기간
          <select
            className="control"
            value={days}
            onChange={(event) => updateDays(event.target.value)}>
            {[7, 30, 90].map((value) => (
              <option key={value} value={value}>
                최근 {value}일
              </option>
            ))}
          </select>
        </label>
      </PageHeading>
      <QueryState
        pending={charts.isPending}
        error={charts.error}
        retry={charts.refetch}
      />
      {charts.data ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight">이용 분포</h2>
            <span className="text-xs text-muted-foreground">
              {charts.data.from} — {charts.data.to} · KST · 막대 또는 수치를
              눌러 목록으로 이동
            </span>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            {charts.data.distributions.map((distribution) => (
              <DistributionCard
                key={distribution.chartId}
                distribution={distribution}
              />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
