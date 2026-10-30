import type { UseQueryResult } from '@tanstack/react-query';

import { dateTime, QueryState } from '@/components/admin/data-ui';
import { SummarySkeleton } from '@/components/admin/loading-ui';
import { sourceHelp } from '@/features/analytics/config';
import { MetricScope } from '@/features/analytics/metric-definition';
import { Source, SummaryCards } from '@/features/analytics/metric-ui';
import {
  NotificationOpenCount,
  notificationOpenPartial,
  notificationOpenRate,
} from '@/features/analytics/notification-opens';
import type { CampaignOpensResponse } from '@/features/analytics/types';

/** 캠페인 상세와 독립적인 열람 조회 상태를 표시한다. */
export function CampaignOpens({
  query,
}: {
  query: UseQueryResult<CampaignOpensResponse>;
}) {
  const data = query.data;

  return (
    <section aria-label="열람" className="mt-6">
      <MetricScope value="acquisition">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-xl font-semibold">열람</h2>
          <Source source="Amplitude" help={sourceHelp.push} />
        </div>
        <QueryState
          skeleton={
            <div className="[&>div]:xl:grid-cols-3">
              <SummarySkeleton count={3} />
            </div>
          }
          pending={query.isPending}
          error={query.error}
          retry={query.refetch}
          source="amplitude"
        />
        {data && !query.isError ? (
          <>
            {data.asOf ? (
              <p className="mb-2 text-xs text-muted-foreground">
                {dateTime(data.asOf)} KST 집계 기준
              </p>
            ) : null}
            {data.from !== null ? (
              <p className="mb-4 text-xs text-muted-foreground">
                {data.from} ~ {data.to}
              </p>
            ) : null}
            {data.pendingDates?.length ? (
              <p role="status" className="mb-4 text-sm">
                {notificationOpenPartial}
              </p>
            ) : null}
            <div className="[&>div]:xl:grid-cols-3">
              <SummaryCards
                items={[
                  {
                    label: '푸시 열람',
                    value: (
                      <NotificationOpenCount values={data} channel="push" />
                    ),
                  },
                  { label: '열람률', value: notificationOpenRate(data) },
                  {
                    label: '알림함 열람',
                    value: (
                      <NotificationOpenCount values={data} channel="inbox" />
                    ),
                  },
                ]}
              />
            </div>
          </>
        ) : null}
      </MetricScope>
    </section>
  );
}
