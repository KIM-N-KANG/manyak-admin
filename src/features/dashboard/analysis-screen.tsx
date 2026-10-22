'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  DataTable,
  PageHeading,
  QueryState,
  TextLink,
} from '@/components/admin/data-ui';
import { Card } from '@/components/ui/card';
import { DistributionChart } from '@/features/dashboard/distribution-chart';
import { getDistributionHref } from '@/features/dashboard/links';
import type { DashboardCharts, Distribution } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

function DistributionCard({ distribution }: { distribution: Distribution }) {
  const router = useRouter();

  return (
    <Card
      className={
        distribution.chartId === 'genre-depth'
          ? 'min-w-0 xl:col-span-2'
          : 'min-w-0'
      }>
      <h2 className="font-semibold">{distribution.title}</h2>
      <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">
        {distribution.description}
      </p>
      <DistributionChart
        distribution={distribution}
        onSelect={(point) => router.push(getDistributionHref(point.link))}
      />
      <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          수치 및 관련 목록
        </summary>
        <div className="mt-3 max-h-80 overflow-auto">
          <DataTable
            headers={['구분 및 관련 목록', `값 (${distribution.unit})`]}
            empty={!distribution.points.length}>
            {distribution.points.map((point) => (
              <tr key={point.label}>
                <td>
                  <TextLink href={getDistributionHref(point.link)}>
                    {point.label} →
                  </TextLink>
                </td>
                <td>
                  {point.value.toLocaleString('ko-KR')} {distribution.unit}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
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
              {charts.data.from} — {charts.data.to} · KST · 막대·점·조각 또는
              수치를 눌러 목록으로 이동
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
