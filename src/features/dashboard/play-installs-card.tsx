'use client';

import { NumberValue, QueryState } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { DefinitionText } from '@/features/analytics/metric-definition';
import { previousPeriod } from '@/features/dashboard/comparison';
import { type DateRange } from '@/features/dashboard/date-range';
import type { PlayInstalls } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

import { OverviewCard } from './overview-card';
import { trendSeries } from './overview-sparkline';

export function PlayInstallsCard({
  range,
}: {
  range: DateRange & { label: string };
}) {
  const query = useApi<PlayInstalls>('/api/dashboard/play-installs');
  const data = query.isError ? undefined : query.data;
  const previous = previousPeriod(range);
  const selected = data?.daily.filter(
    (day) => day.date >= range.from && day.date <= range.to,
  );
  const previousTotal = data?.daily.reduce(
    (sum, day) =>
      day.date >= previous.from && day.date <= previous.to
        ? sum + day.installs
        : sum,
    0,
  );
  const periodTotal = data?.daily.reduce(
    (sum, day) =>
      day.date >= range.from && day.date <= range.to ? sum + day.installs : sum,
    0,
  );

  const detail = data
    ? `누적 ${data.totalInstalls.toLocaleString('ko-KR')}대`
    : undefined;

  return (
    <OverviewCard
      title="앱 설치(Android)"
      trend={
        data
          ? trendSeries(
              (selected ?? []).map((day) => ({
                date: day.date,
                value: day.installs,
              })),
              range,
            )
          : undefined
      }
      href="/analytics/inflow?tab=installs"
      help={
        <HelpTooltip label="앱 설치(Android) 출처와 집계 안내">
          <DefinitionText index={78} />
          Google Play 설치 보고서 출처 지표입니다. 보고서는 며칠 늦게 반영되고
          날짜는 Play 기준 태평양 시간입니다. 기간 합계는 선택한 기간의 일별
          기기 설치 수를 더한 값이며 최근 며칠은 아직 보고서에 없어 빠질 수
          있습니다. 누적은 보고서 전체 기간의 일별 기기 설치 수를 합산한
          값입니다.
        </HelpTooltip>
      }
      loading={query.isPending ? 'data' : undefined}
      value={
        data ? (
          <>
            <span className="sr-only">선택 기간 </span>
            {selected?.length ? (
              <NumberValue value={periodTotal!} />
            ) : (
              '보고서 반영 전'
            )}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {selected?.length ? '대' : null}
            </span>
          </>
        ) : (
          <div className="relative z-10 text-sm font-normal whitespace-normal">
            <QueryState
              variant="inline"
              pending={query.isPending}
              error={query.error}
              retry={query.refetch}
              source="play"
            />
          </div>
        )
      }
      comparison={
        selected?.length
          ? { value: periodTotal, previous: previousTotal, days: previous.days }
          : undefined
      }
      detail={detail}
      detailTitle={detail}
    />
  );
}
