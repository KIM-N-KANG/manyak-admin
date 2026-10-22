'use client';

import { useId } from 'react';

import { Tooltip } from '@base-ui/react/tooltip';
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

import { DataTable, dateTime, NumberValue } from '@/components/admin/data-ui';
import { ExternalToolLink } from '@/components/admin/external-tool-link';
import { Button } from '@/components/ui/button';
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
import type { DashboardAnalytics } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';
import { externalLinks } from '@/lib/external-links';

type AnalyticsMetric = 'activeUsers' | 'newUsers';

const labels: Record<AnalyticsMetric, string> = {
  activeUsers: '일별 활성 사용자 (DAU)',
  newUsers: '일별 신규 사용자',
};

function AnalyticsSource() {
  const descriptionId = useId();

  return (
    <Tooltip.Provider delay={150}>
      <Tooltip.Root>
        <Tooltip.Trigger
          type="button"
          aria-label="Amplitude 출처와 집계 안내"
          aria-describedby={descriptionId}
          className="inline-flex items-center gap-1.5 rounded-sm border bg-card px-2 py-1 text-xs text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          Amplitude{' '}
          <span
            aria-hidden="true"
            className="flex size-3.5 items-center justify-center rounded-full border text-[10px]">
            ?
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={8}>
            <Tooltip.Popup
              id={descriptionId}
              role="tooltip"
              className="z-50 max-w-80 rounded-sm border bg-popover p-3 text-xs leading-5 text-popover-foreground shadow-sm">
              Amplitude 출처 지표입니다. 집계가 몇 분 늦게 반영될 수 있으며, 팀
              계정을 제외한 기준입니다. Amplitude 사용자 수는 DB 회원 수와 다를
              수 있습니다.
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function AnalyticsTrend({ daily }: { daily: DashboardAnalytics['daily'] }) {
  const lastDate = daily.at(-1)?.date;

  return (
    <Card className="min-w-0 lg:col-span-2">
      <h3 className="font-semibold">활성·신규 사용자 추이</h3>
      <ChartContainer
        config={{
          activeUsers: { label: labels.activeUsers, color: 'var(--primary)' },
          newUsers: {
            label: labels.newUsers,
            color: 'var(--muted-foreground)',
          },
        }}
        className="mt-6 h-[240px] w-full"
        aria-label="활성·신규 사용자 추이">
        <LineChart
          accessibilityLayer
          data={daily}
          margin={{ top: 20, right: 88, bottom: 8, left: 0 }}>
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
          {(['activeUsers', 'newUsers'] as const).map((metric) => (
            <Line
              key={metric}
              type="linear"
              dataKey={metric}
              stroke={`var(--color-${metric})`}
              strokeWidth={2}
              strokeDasharray={metric === 'newUsers' ? '4 3' : undefined}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}>
              <LabelList
                dataKey={(point: DashboardAnalytics['daily'][number]) =>
                  point.date === lastDate
                    ? `${metric === 'activeUsers' ? '활성' : '신규'} ${chartNumber(point[metric])}`
                    : null
                }
                position="right"
                dy={metric === 'activeUsers' ? -10 : 12}
                fill={
                  metric === 'activeUsers'
                    ? 'var(--primary-text)'
                    : 'var(--foreground)'
                }
                fontSize={11}
              />
            </Line>
          ))}
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
    </Card>
  );
}

export function AnalyticsSection({ days }: { days: string }) {
  const query = useApi<DashboardAnalytics>(
    `/api/dashboard/analytics?days=${days}`,
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
          최근 {days}일 · KST · 집계가 몇 분 늦을 수 있습니다
        </p>
      </div>
      {query.isError ? (
        <Card role="alert">
          <h3 className="font-semibold">Amplitude 지표를 불러올 수 없음</h3>
          <p className="my-3 text-sm text-muted-foreground">
            잠시 후 다시 시도해 주세요.
          </p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            다시 시도
          </Button>
        </Card>
      ) : query.isPending ? (
        <Card role="status" className="py-10 text-center text-muted-foreground">
          Amplitude 지표를 불러오는 중입니다…
        </Card>
      ) : data ? (
        <>
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <Card className="flex flex-col">
              <h3 className="text-sm text-muted-foreground">
                오늘 활성 사용자
              </h3>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                <NumberValue value={data.todayActiveUsers} />
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  명
                </span>
              </p>
              <ExternalToolLink
                href={externalLinks.amplitude}
                className="mt-3 text-xs">
                Amplitude에서 보기
              </ExternalToolLink>
              <p className="mt-auto pt-6 text-xs leading-5 text-muted-foreground">
                {dateTime(data.asOf)} KST 집계 기준
              </p>
            </Card>
            <AnalyticsTrend daily={data.daily} />
          </div>
          <details className="mt-4 text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Amplitude 일별 수치 · {data.from} — {data.to}
            </summary>
            <div className="mt-3 max-h-64 overflow-auto">
              <DataTable
                headers={['날짜 (KST)', '활성 사용자 (DAU)', '신규 사용자']}>
                {data.daily.map((day) => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    <td>
                      <NumberValue value={day.activeUsers} />
                    </td>
                    <td>
                      <NumberValue value={day.newUsers} />
                    </td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}
