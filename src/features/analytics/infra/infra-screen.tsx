'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { FetchError } from '@/api/mutator/custom-instance';
import { PageHeading, QueryState } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import {
  ChartsSkeleton,
  SummarySkeleton,
  TableSkeleton,
} from '@/components/admin/loading-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import type { DateRange, RangeName } from '@/features/dashboard/date-range';
import { RangePicker } from '@/features/dashboard/range-picker';
import { useApi } from '@/features/shared/use-api';

import { InfraServices, InfraStorage, InfraTableContent } from './content';
import { infraRange, kstTime } from './data';
import type { InfraMetrics, InfraTables } from './types';

const tabs = [
  ['services', '서비스와 요청'],
  ['storage', '저장소'],
  ['tables', 'DB 테이블'],
] as const;

export function InfraScreen({ embedded = false }: { embedded?: boolean }) {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const tab =
    tabs.find(([key]) => key === params.get('tab'))?.[0] ?? 'services';
  const range = infraRange(new URLSearchParams(params));
  const metrics = useApi<InfraMetrics>(
    `/api/infra/metrics?${new URLSearchParams({ from: range.from, to: range.to })}`,
    tab !== 'tables' && !range.exceeded,
  );
  const tables = useApi<InfraTables>(
    '/api/infra/db-tables?limit=20',
    tab === 'tables',
  );
  const query = tab === 'tables' ? tables : metrics;
  const data = query.isError ? undefined : query.data;

  function select(value: DateRange | RangeName) {
    const next = new URLSearchParams(params);

    for (const key of ['from', 'to', 'range', 'days']) next.delete(key);

    if (typeof value === 'string') next.set('range', value);
    else {
      next.set('from', value.from);
      next.set('to', value.to);
    }

    router.push(`${pathname}?${next}`, { scroll: false });
  }

  const interval =
    metrics.data?.periodSeconds ??
    ((Date.parse(range.to) - Date.parse(range.from)) / 86400000 < 2
      ? 300
      : (Date.parse(range.to) - Date.parse(range.from)) / 86400000 < 7
        ? 900
        : 3600);
  const unavailable =
    metrics.error instanceof FetchError &&
    metrics.error.status === 503 &&
    !(
      typeof metrics.error.data === 'object' &&
      metrics.error.data !== null &&
      'message' in metrics.error.data &&
      metrics.error.data.message === '서버 미구현'
    );

  return (
    <>
      {!embedded ? (
        <PageHeading title="인프라">
          {tab === 'tables' ? (
            <Button variant="outline" disabled aria-label="기간: 현재">
              현재
            </Button>
          ) : (
            <RangePicker
              range={{
                ...range,
                query: new URLSearchParams({
                  from: range.from,
                  to: range.to,
                }).toString(),
                select,
              }}
              maxDays={31}
            />
          )}
        </PageHeading>
      ) : null}
      <Tabs.Root
        value={tab}
        onValueChange={(value) => {
          const next = new URLSearchParams(params);

          next.set('tab', String(value));
          router.push(`${pathname}?${next}`, { scroll: false });
        }}>
        {!embedded ? (
          <Tabs.List
            aria-label="인프라 탭"
            className="mb-5 flex overflow-x-auto border-b">
            {tabs.map(([key, label]) => (
              <Tabs.Tab
                key={key}
                value={key}
                className="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm text-muted-foreground data-active:border-primary data-active:text-primary-text">
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        ) : null}
        <Tabs.Panel value={tab}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">
              {tabs.find(([key]) => key === tab)![1]}
            </h2>
            {!data ? (
              <span className="text-xs text-muted-foreground">
                {tab === 'tables' ? '서버 DB' : 'CloudWatch'}
              </span>
            ) : tab === 'tables' ? (
              <HelpTooltip source="서버 DB" label="서버 DB 출처 안내">
                서버 DB 출처 지표이며 {kstTime(data.asOf)} KST에 PostgreSQL
                카탈로그에서 읽은 크기입니다. 조회 결과는 5분간 캐시합니다.
              </HelpTooltip>
            ) : (
              <HelpTooltip source="CloudWatch" label="CloudWatch 출처 안내">
                CloudWatch 출처 지표이며 {kstTime(data.asOf)} KST에 받은
                값입니다.{' '}
                {interval === 300 ? '5분' : interval === 900 ? '15분' : '1시간'}{' '}
                단위로 집계하며 1~2분 늦게 반영될 수 있습니다. 태스크 수는 조회
                시각 기준 값입니다.
              </HelpTooltip>
            )}
          </div>
          {tab !== 'tables' && range.exceeded ? (
            <Card role="alert">
              <h2 className="font-semibold">기간 확인 필요</h2>
              <p className="my-3 text-sm">
                이 지표는 최대 31일까지 볼 수 있습니다. 기간을 31일 이내로
                선택해 주세요.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  select({
                    from: new Date(Date.parse(range.to) - 30 * 86400000)
                      .toISOString()
                      .slice(0, 10),
                    to: range.to,
                  })
                }>
                최근 31일로 맞추기
              </Button>
            </Card>
          ) : (
            <>
              {tab !== 'tables' && unavailable ? (
                <Card role="alert">
                  <h2 className="font-semibold">
                    인프라 지표를 불러올 수 없음
                  </h2>
                  <p className="my-3 text-sm">
                    잠시 후 다시 시도해 주세요. 문제가 계속되면 서버의
                    CloudWatch 권한과 인프라 지표 설정을 확인해 주세요.
                  </p>
                  <Button variant="outline" onClick={() => metrics.refetch()}>
                    다시 시도
                  </Button>
                </Card>
              ) : (
                <QueryState
                  skeleton={
                    tab === 'tables' ? (
                      <TableSkeleton columns={5} rows={10} pagination={false} />
                    ) : (
                      <>
                        <SummarySkeleton count={tab === 'services' ? 5 : 3} />
                        <ChartsSkeleton
                          infra
                          count={tab === 'services' ? 5 : 9}
                        />
                      </>
                    )
                  }
                  pending={query.isPending}
                  error={query.error}
                  retry={query.refetch}
                />
              )}
              {data ? (
                <>
                  {tab === 'tables' ? (
                    <InfraTableContent data={data as InfraTables} />
                  ) : tab === 'storage' ? (
                    <InfraStorage data={data as InfraMetrics} />
                  ) : (
                    <InfraServices data={data as InfraMetrics} />
                  )}
                </>
              ) : null}
            </>
          )}
        </Tabs.Panel>
      </Tabs.Root>
    </>
  );
}
