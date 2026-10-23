'use client';

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

import {
  DataTable,
  dateTime,
  NumberValue,
  QueryState,
} from '@/components/admin/data-ui';
import { ExternalToolLink } from '@/components/admin/external-tool-link';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ChartCrosshair } from '@/features/dashboard/chart-crosshair';
import { chartNumber } from '@/features/dashboard/chart-data';
import type {
  DashboardAnalytics,
  DashboardPlatformCounts,
} from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';
import { externalLinks } from '@/lib/external-links';

type AnalyticsMetric = 'activeUsers' | 'newUsers';

const platforms = ['total', 'web', 'android'] as const;
const platformConfig = {
  total: { label: '합계', color: 'var(--primary)' },
  web: { label: 'Web', color: 'var(--muted-foreground)' },
  android: { label: 'Android', color: 'var(--primary-text)' },
};

const labels: Record<AnalyticsMetric, string> = {
  activeUsers: '일별 활성 사용자 (DAU)',
  newUsers: '일별 신규 사용자',
};

function AnalyticsSource() {
  return (
    <HelpTooltip label="Amplitude 출처와 집계 안내" source="Amplitude">
      Amplitude 출처 지표입니다. 집계가 몇 분 늦게 반영될 수 있습니다. 팀 계정
      코호트가 설정된 경우 해당 사용자는 제외합니다. 국가가 한국이거나 국가
      정보가 없는 사용자 중 플랫폼이 Web 또는 Android인 고유 사용자만
      집계합니다. 같은 사람이 두 플랫폼에서 활동하면 합계에는 한 번만 들어가므로
      Web과 Android를 더한 값과 합계는 다를 수 있습니다. Amplitude 사용자 수는
      DB 회원 수와 다를 수 있습니다.
    </HelpTooltip>
  );
}

function AnalyticsTrend({
  data,
  metric,
}: {
  data: DashboardAnalytics;
  metric: AnalyticsMetric;
}) {
  const byDate = new Map(data.daily.map((day) => [day.date, day[metric]]));
  const count = (Date.parse(data.to) - Date.parse(data.from)) / 86400000 + 1;
  const rows = Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.parse(data.from) + index * 86400000)
      .toISOString()
      .slice(0, 10);

    return {
      date,
      ...(byDate.get(date) ?? { total: null, web: null, android: null }),
    };
  });
  const lastDate = data.daily.at(-1)?.date;

  return (
    <Card className="min-w-0">
      <h3 className="font-semibold">{labels[metric]}</h3>
      <ChartContainer
        config={platformConfig}
        className="mt-6 h-[240px] w-full"
        aria-label={`${labels[metric]} 추이`}>
        <LineChart
          accessibilityLayer
          data={rows}
          margin={{ top: 20, right: 90, bottom: 8, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => String(value).slice(5)}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis width={40} tickLine={false} axisLine={false} unit="명" />
          <ChartTooltip
            cursor={<ChartCrosshair />}
            isAnimationActive={false}
            content={<ChartTooltipContent />}
          />
          {platforms.map((platform, index) => (
            <Line
              key={platform}
              name={platformConfig[platform].label}
              type="linear"
              dataKey={platform}
              stroke={`var(--color-${platform})`}
              strokeWidth={2}
              strokeDasharray={
                platform === 'web'
                  ? '6 3'
                  : platform === 'android'
                    ? '2 3'
                    : undefined
              }
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}>
              <LabelList
                dataKey={(
                  point: { date: string } & Record<
                    keyof DashboardPlatformCounts,
                    number | null
                  >,
                ) =>
                  point.date === lastDate && point[platform] !== null
                    ? `${platformConfig[platform].label} ${chartNumber(point[platform]!)}`
                    : null
                }
                position="right"
                dy={(index - 1) * 14}
                fill="var(--foreground)"
                fontSize={11}
              />
            </Line>
          ))}
          <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
    </Card>
  );
}

export function AnalyticsSection({
  days,
  query: rangeQuery,
  label,
}: {
  days?: string;
  query?: string;
  label?: string;
}) {
  const query = useApi<DashboardAnalytics>(
    `/api/dashboard/analytics?${rangeQuery ?? `days=${days}`}`,
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
  const data = query.data;

  return (
    <section aria-labelledby="analytics-heading" className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2
            id="analytics-heading"
            className="text-xl font-semibold tracking-tight">
            Amplitude 사용자 지표
          </h2>
          <AnalyticsSource />
        </div>
        <p className="text-xs text-muted-foreground">
          {label ?? `최근 ${days}일`} (KST)
        </p>
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
        source="amplitude"
      />
      {data && !query.isError ? (
        <>
          <div className="space-y-5">
            {data.pendingDates.length > 0 ? (
              <div
                role="status"
                className="rounded-md border p-3 text-xs text-muted-foreground">
                준비 중 날짜 {data.pendingDates.length}개. 60초 뒤 다시
                요청합니다.
                <details className="mt-2">
                  <summary className="cursor-pointer">준비 중 날짜</summary>
                  <p className="mt-2">{data.pendingDates.join(', ')}</p>
                </details>
              </div>
            ) : null}

            <Card className="flex flex-col">
              <h3 className="text-sm text-muted-foreground">
                오늘 활성 사용자
              </h3>
              <p className="mt-4 text-xs text-muted-foreground">합계</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {data.todayActiveUsers === null ? (
                  <span role="status">준비 중</span>
                ) : (
                  <>
                    <NumberValue value={data.todayActiveUsers.total} />
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      명
                    </span>
                  </>
                )}
              </p>
              <dl className="mt-4 flex gap-6 text-sm">
                {(['web', 'android'] as const).map((platform) => (
                  <div key={platform}>
                    <dt className="text-xs text-muted-foreground">
                      {platformConfig[platform].label}
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {data.todayActiveUsers === null ? (
                        '준비 중'
                      ) : (
                        <>
                          <NumberValue
                            value={data.todayActiveUsers[platform]}
                          />
                          명
                        </>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <ExternalToolLink
                href={externalLinks.amplitude}
                className="mt-3 text-xs">
                Amplitude에서 보기
              </ExternalToolLink>
              <p className="mt-auto pt-6 text-xs leading-5 text-muted-foreground">
                {dateTime(data.asOf)} KST 집계 기준
              </p>
            </Card>
            <AnalyticsTrend data={data} metric="activeUsers" />
            <AnalyticsTrend data={data} metric="newUsers" />
          </div>
          <details className="mt-4 text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Amplitude 일별 수치 ({data.from} ~ {data.to}, KST)
            </summary>
            <div className="mt-3 max-h-64 overflow-auto">
              <DataTable
                headers={[
                  '날짜 (KST)',
                  '일별 활성 사용자 (DAU) 합계',
                  '일별 활성 사용자 Web',
                  '일별 활성 사용자 Android',
                  '일별 신규 사용자 합계',
                  '일별 신규 사용자 Web',
                  '일별 신규 사용자 Android',
                ]}>
                {Array.from(
                  new Set([
                    ...data.daily.map((day) => day.date),
                    ...data.pendingDates,
                  ]),
                )
                  .sort()
                  .map((date) => {
                    const day = data.daily.find((item) => item.date === date);

                    return (
                      <tr key={date}>
                        <td>{date}</td>
                        {(['activeUsers', 'newUsers'] as const).flatMap(
                          (metric) =>
                            platforms.map((platform) => (
                              <td key={`${metric}-${platform}`}>
                                {day && !data.pendingDates.includes(date) ? (
                                  <NumberValue value={day[metric][platform]} />
                                ) : (
                                  '준비 중'
                                )}
                              </td>
                            )),
                        )}
                      </tr>
                    );
                  })}
              </DataTable>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}
