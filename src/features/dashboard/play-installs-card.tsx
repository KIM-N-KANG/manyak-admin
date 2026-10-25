'use client';

import Link from 'next/link';

import { NumberValue, QueryState } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { Card } from '@/components/ui/card';
import { type DateRange, kstToday } from '@/features/dashboard/date-range';
import type { PlayInstalls } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

export function PlayInstallsCard({
  range,
}: {
  range: DateRange & { label: string };
}) {
  const query = useApi<PlayInstalls>('/api/dashboard/play-installs');
  const data = query.isError ? undefined : query.data;
  const isToday = range.from === range.to && range.to === kstToday();
  const periodTotal = data?.daily.reduce(
    (sum, day) =>
      day.date >= range.from && day.date <= range.to ? sum + day.installs : sum,
    0,
  );
  const periodText = data?.daily.length
    ? `${periodTotal!.toLocaleString('ko-KR')}대`
    : '보고서 값 없음';

  return (
    <Card
      role="region"
      aria-label="앱 설치(Android)"
      className="relative min-w-0 p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm text-muted-foreground">
          <Link
            href="/analytics/acquisition?tab=installs"
            className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
            앱 설치(Android)
          </Link>
        </h3>
        <span className="relative z-10">
          <HelpTooltip label="앱 설치(Android) 출처와 집계 안내">
            Google Play 설치 보고서 출처 지표입니다. 보고서는 며칠 늦게 반영되고
            날짜는 Play 기준 태평양 시간입니다. 누적 기기 설치 수는 보고서 전체
            기간의 일별 기기 설치 수를 합산한 값입니다. 기간 합계는 선택한
            기간의 일별 기기 설치 수를 더한 값이며 최근 며칠은 아직 보고서에
            없어 빠질 수 있습니다. 기간이 오늘 하루면 기간 합계를 표시하지
            않습니다.
          </HelpTooltip>
        </span>
      </div>
      <div className="relative z-10">
        <QueryState
          variant="inline"
          pending={query.isPending}
          error={query.error}
          retry={query.refetch}
          source="play"
        />
      </div>
      {data ? (
        <dl>
          <div className="mt-3">
            <dt className="text-xs text-muted-foreground">누적</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight break-all sm:text-3xl">
              <NumberValue value={data.totalInstalls} />
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                대
              </span>
            </dd>
          </div>
        </dl>
      ) : null}
      {data && !isToday ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{`${range.label} 합계 ${periodText}`}</p>
      ) : null}
    </Card>
  );
}
