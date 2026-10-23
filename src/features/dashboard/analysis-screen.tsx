'use client';

import { useRouter } from 'next/navigation';

import {
  DataTable,
  PageHeading,
  QueryState,
  TextLink,
} from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { Card } from '@/components/ui/card';
import {
  aiFeatureLabel,
  distributionNumber,
  MIN_GENRE_CHATS,
  orderedAiPoints,
} from '@/features/dashboard/chart-data';
import { DistributionChart } from '@/features/dashboard/distribution-chart';
import { getDistributionHref } from '@/features/dashboard/links';
import {
  RangePicker,
  useDashboardRange,
} from '@/features/dashboard/range-picker';
import type { DashboardCharts, Distribution } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

function DistributionCard({
  distribution: response,
}: {
  distribution: Distribution;
}) {
  const distribution = {
    ...response,
    points: (['ai-latency', 'ai-success'].includes(response.chartId)
      ? orderedAiPoints(response.points)
      : response.points
    ).map((point) => ({
      ...point,
      label: aiFeatureLabel(point.label),
    })),
  };
  const router = useRouter();

  return (
    <Card
      className={
        distribution.chartId === 'genre-depth'
          ? 'min-w-0 xl:col-span-2'
          : 'min-w-0'
      }>
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">{distribution.title}</h2>
        {distribution.description ? (
          <HelpTooltip label={`${distribution.title} 집계 안내`}>
            {distribution.description}
          </HelpTooltip>
        ) : null}
      </div>
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
            headers={
              distribution.chartId === 'genre-depth'
                ? [
                    '구분 및 관련 목록',
                    '평균 (턴)',
                    '채팅 수',
                    '총 턴 수',
                    '차트 표시',
                  ]
                : ['구분 및 관련 목록', `값 (${distribution.unit})`]
            }
            empty={!distribution.points.length}>
            {distribution.points.map((point) => (
              <tr key={point.label}>
                <td>
                  <TextLink href={getDistributionHref(point.link)}>
                    {point.label} →
                  </TextLink>
                </td>
                <td>
                  {distributionNumber(point.value, distribution.unit)}{' '}
                  {distribution.unit}
                </td>
                {distribution.chartId === 'genre-depth' ? (
                  <>
                    <td>{point.chats?.toLocaleString('ko-KR')}개</td>
                    <td>{point.totalTurns?.toLocaleString('ko-KR')}턴</td>
                    <td>
                      {(point.chats ?? 0) < MIN_GENRE_CHATS
                        ? '차트 제외(채팅 5개 미만)'
                        : '차트 포함'}
                    </td>
                  </>
                ) : null}
              </tr>
            ))}
          </DataTable>
        </div>
      </details>
    </Card>
  );
}

export const distributionCategories = [
  ['users', '사용자'],
  ['engagement', '채팅 참여'],
  ['content', '콘텐츠'],
  ['ai-quality', 'AI 품질'],
] as const;

export function DashboardAnalysisScreen() {
  const range = useDashboardRange();
  const charts = useApi<DashboardCharts>(
    `/api/dashboard/charts?${range.query}`,
  );

  return (
    <>
      <PageHeading title="분석">
        <RangePicker range={range} />
      </PageHeading>
      <QueryState
        pending={charts.isPending}
        error={charts.error}
        retry={charts.refetch}
      />
      {charts.data ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                이용 분포
              </h2>
              <HelpTooltip label="이용 분포 탐색 안내">
                차트 항목이나 수치를 누르면 관련 목록으로 이동합니다.
              </HelpTooltip>
            </div>
            <span className="text-xs text-muted-foreground">
              {charts.data.from} ~ {charts.data.to} (KST)
            </span>
          </div>
          {distributionCategories.map(([category, label]) => (
            <section key={category} aria-label={label} className="mb-8">
              <h2 className="mb-4 text-lg font-semibold">{label}</h2>
              <div className="grid gap-5 xl:grid-cols-2">
                {charts.data.distributions
                  .filter((item) => item.category === category)
                  .map((distribution) => (
                    <DistributionCard
                      key={distribution.chartId}
                      distribution={distribution}
                    />
                  ))}
              </div>
            </section>
          ))}
        </>
      ) : null}
    </>
  );
}
