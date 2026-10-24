'use client';

import Link from 'next/link';

import { dateTime, NumberValue, QueryState } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { Card } from '@/components/ui/card';
import { kstToday } from '@/features/dashboard/date-range';
import type { DashboardAnalytics } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

export function AnalyticsSection() {
  const today = kstToday();
  const query = useApi<DashboardAnalytics>(
    `/api/dashboard/analytics?from=${today}&to=${today}`,
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

  return (
    <Card
      role="region"
      aria-label="오늘 활성 사용자"
      className="relative min-w-0 p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm text-muted-foreground">
          <Link
            href="/analytics/users?tab=activity"
            className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
            오늘 활성 사용자
          </Link>
        </h3>
        <span className="relative z-10">
          <HelpTooltip label="Amplitude 출처와 집계 안내">
            {data
              ? `Amplitude 출처 지표이며 ${dateTime(data.asOf)} KST에 받은 값입니다.`
              : 'Amplitude 출처 지표입니다.'}{' '}
            집계가 몇 분 늦게 반영될 수 있습니다. 팀 계정 코호트가 설정된 경우
            해당 사용자는 제외합니다. 국가가 한국이거나 국가 정보가 없는
            사용자를 집계하고 앱은 그 밖 국가에서 로그인한 사용자도 더합니다.
            합계와 앱 값은 조건별 사용자 수를 더한 값이라 같은 날 웹과 앱, 또는
            국내와 해외에서 앱을 쓴 사람은 두 번 셉니다. Amplitude 사용자 수는
            DB 회원 수와 다를 수 있습니다.
          </HelpTooltip>
        </span>
      </div>
      <div className="relative z-10">
        <QueryState
          variant="inline"
          pending={query.isPending}
          error={query.error}
          retry={query.refetch}
          source="amplitude"
        />
      </div>
      {data ? (
        <>
          <dl>
            <div className="mt-3">
              <dt className="text-xs text-muted-foreground">합계</dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight break-all sm:text-3xl">
                {counts == null ? (
                  <span role="status">준비 중</span>
                ) : (
                  <>
                    <NumberValue value={counts.total} />
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      명
                    </span>
                  </>
                )}
              </dd>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {(['web', 'android'] as const).map((platform) => (
                <div key={platform} className="flex items-baseline gap-1">
                  <dt>{platform === 'web' ? '웹' : '앱'}</dt>
                  <dd>
                    {counts == null ? (
                      '준비 중'
                    ) : (
                      <>
                        <NumberValue value={counts[platform]} />명
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </div>
          </dl>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {dateTime(data.asOf)} KST
          </p>
        </>
      ) : null}
    </Card>
  );
}
