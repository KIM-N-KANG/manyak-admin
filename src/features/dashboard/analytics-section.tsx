'use client';

import { dateTime, NumberValue, QueryState } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { DefinitionText } from '@/features/analytics/metric-definition';
import { shiftDate } from '@/features/analytics/range';
import { kstToday } from '@/features/dashboard/date-range';
import { OverviewCard } from '@/features/dashboard/overview-card';
import type { DashboardAnalytics } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

export function AnalyticsSection() {
  const today = kstToday();
  const query = useApi<DashboardAnalytics>(
    `/api/dashboard/analytics?from=${shiftDate(today, -1)}&to=${today}`,
    true,
    {
      refetchInterval: ({ state }) =>
        state.data &&
        (state.data.pendingDates.length > 0 ||
          state.data.todayActiveUsers === null)
          ? 60000
          : false,
    },
  );
  const data = query.isError ? undefined : query.data;
  const counts = data?.todayActiveUsers;

  const detailTitle =
    counts == null
      ? '웹 준비 중, 앱 준비 중'
      : `웹 ${counts.web.toLocaleString('ko-KR')}명, 앱 ${counts.android.toLocaleString('ko-KR')}명`;

  return (
    <OverviewCard
      title="오늘 활성 사용자"
      href="/analytics/audience?tab=activity"
      help={
        <HelpTooltip label="Amplitude 출처와 집계 안내">
          <DefinitionText index={76} />
          {data
            ? `Amplitude 출처 지표이며 ${dateTime(data.asOf)} KST에 받은 값입니다.`
            : 'Amplitude 출처 지표입니다.'}{' '}
          집계가 몇 분 늦게 반영될 수 있습니다. 팀 계정 코호트가 설정된 경우
          해당 사용자는 제외합니다. 국가가 한국이거나 국가 정보가 없는 웹과 앱
          사용자를 집계합니다. 합계는 같은 날 웹과 앱을 함께 쓴 사람을 한 번
          셉니다. Amplitude 사용자 수는 DB 회원 수와 다를 수 있습니다.
        </HelpTooltip>
      }
      loading={query.isPending ? 'data' : undefined}
      value={
        data ? (
          counts == null ? (
            <span role="status">준비 중</span>
          ) : (
            <>
              <span className="sr-only">합계 </span>
              <NumberValue value={counts.total} />
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                명
              </span>
            </>
          )
        ) : (
          <div className="relative z-10 text-sm font-normal whitespace-normal">
            <QueryState
              variant="inline"
              pending={query.isPending}
              error={query.error}
              retry={query.refetch}
              source="amplitude"
            />
          </div>
        )
      }
      comparison={
        data
          ? {
              value: counts?.total,
              previous: data.daily.find(
                (day) => day.date === shiftDate(today, -1),
              )?.activeUsers.total,
              days: 1,
              status: data.pendingDates.includes(shiftDate(today, -1))
                ? '준비 중'
                : undefined,
            }
          : undefined
      }
      detail={
        data ? (
          <>
            <span>웹</span>{' '}
            {counts == null ? (
              <span>준비 중</span>
            ) : (
              <>
                <NumberValue value={counts.web} />명
              </>
            )}
            , <span>앱</span>{' '}
            {counts == null ? (
              <span>준비 중</span>
            ) : (
              <>
                <NumberValue value={counts.android} />명
              </>
            )}
          </>
        ) : null
      }
      detailTitle={data ? detailTitle : undefined}
    />
  );
}
