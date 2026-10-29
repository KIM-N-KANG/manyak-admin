'use client';

import { useRouter } from 'next/navigation';

import { DataTable, TextLink } from '@/components/admin/data-ui';
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
import type { Distribution } from '@/features/dashboard/types';
import { cn } from '@/lib/utils';

export function DistributionCard({
  distribution: response,
  basis,
  fullWidth = response.chartId === 'genre-depth',
}: {
  distribution: Distribution;
  basis?: string | null;
  fullWidth?: boolean;
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
      className={cn(
        'min-w-0',
        fullWidth && 'xl:col-span-2',
        distribution.chartId === 'first-message' && 'self-start',
      )}>
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">{distribution.title}</h2>
        {basis ? (
          <span className="text-xs text-muted-foreground">{basis}</span>
        ) : null}
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
                : distribution.chartId === 'started-as'
                  ? ['구분 및 관련 목록', '비율 (%)', '채팅 수', '사용자 수']
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
                ) : distribution.chartId === 'started-as' ? (
                  <>
                    <td>
                      {point.chats == null
                        ? '—'
                        : `${point.chats.toLocaleString('ko-KR')}개`}
                    </td>
                    <td>
                      {point.users == null
                        ? '—'
                        : `${point.users.toLocaleString('ko-KR')}명`}
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

/** 앞선 전체 폭 카드가 차지한 행을 고려해 마지막 카드의 너비를 정한다. */
export function DistributionGrid({
  distributions,
  basis,
}: {
  distributions: Distribution[];
  basis?: string | null;
}) {
  const lastFull = distributions.findLastIndex(
    (item) => item.chartId === 'genre-depth',
  );

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {distributions.map((distribution, index) => {
        const fullWidth =
          distribution.chartId === 'genre-depth' ||
          (index === distributions.length - 1 &&
            (index - lastFull - 1) % 2 === 0);

        return (
          <DistributionCard
            key={distribution.chartId}
            distribution={distribution}
            basis={basis}
            fullWidth={fullWidth}
          />
        );
      })}
    </div>
  );
}
