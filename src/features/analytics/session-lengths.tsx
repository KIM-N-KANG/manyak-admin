'use client';

import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';

import { dateTime, QueryState } from '@/components/admin/data-ui';
import { Card } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { useApi } from '@/features/shared/use-api';

import { metricNumber, percent, ratio } from './config';
import { MetricHelp } from './metric-definition';
import { NumericTable, PendingDates, SummaryCards } from './metric-ui';
import { MetricsSkeleton } from './metrics-skeleton';
import { analyticsRefetch } from './range';
import type { SessionLengthResponse } from './types';

export const sessionBinNames = [
  '3초 미만',
  '3~10초',
  '10~30초',
  '30초~1분',
  '1~3분',
  '3~10분',
  '10~30분',
  '30분~1시간',
  '1시간 이상',
];

export function SessionLengths({
  url,
  platform,
}: {
  url: string;
  platform: string;
}) {
  const query = useApi<SessionLengthResponse>(url, true, {
    refetchInterval: (query) => analyticsRefetch(query),
  });

  return (
    <section className="mt-5" aria-label="세션 길이 분포 영역">
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
        source="amplitude"
        skeleton={<MetricsSkeleton tab="session-lengths" />}
      />
      {query.data && !query.isError ? (
        <>
          <p className="mb-4 text-xs text-muted-foreground">
            {dateTime(query.data.asOf)} KST 집계 기준
          </p>
          <PendingDates dates={query.data.pendingDates} />
          <SessionLengthContent data={query.data} platform={platform} />
        </>
      ) : null}
    </section>
  );
}

export function SessionLengthContent({
  data,
  platform,
}: {
  data: SessionLengthResponse;
  platform: string;
}) {
  const selected = data.platforms.find((item) => item.platform === platform);

  if (!selected) return null;

  const rows = selected.sessions.map((sessions, i) => ({
    label: sessionBinNames[i],
    sessions,
    text: `${metricNumber(sessions, '개')} (${percent(ratio(sessions, selected.totalSessions))})${selected.medianBin === i ? ' 중앙값' : ''}`,
  }));

  return (
    <>
      <SummaryCards
        items={[
          {
            label: '세션 수',
            value: metricNumber(selected.totalSessions, '개'),
          },
          {
            label: '중앙값 구간',
            value:
              selected.medianBin === null
                ? '세션 없음'
                : sessionBinNames[selected.medianBin],
          },
        ]}
      />
      <Card>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">세션 길이 분포</h3>
          <MetricHelp title="세션 길이 분포" />
        </div>
        {selected.totalSessions === 0 ? (
          <p role="status" className="mt-4">
            세션 없음
          </p>
        ) : (
          <div className="overflow-x-auto">
            <ChartContainer
              config={{
                sessions: { label: '세션 수', color: 'var(--primary)' },
              }}
              className="mt-5 h-[440px] min-w-[640px]"
              aria-label="세션 길이 분포 가로 막대">
              <BarChart
                accessibilityLayer
                data={rows}
                layout="vertical"
                margin={{ right: 180 }}>
                <XAxis type="number" unit="개" />
                <YAxis type="category" dataKey="label" width={100} />
                <Bar
                  dataKey="sessions"
                  fill="var(--primary)"
                  isAnimationActive={false}>
                  <LabelList
                    dataKey="text"
                    position="right"
                    fill="var(--foreground)"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        )}
        <NumericTable
          title="세션 길이 분포"
          headers={['구간', '세션 수']}
          rows={rows.map((row) => [row.label, row.text])}
        />
      </Card>
    </>
  );
}
