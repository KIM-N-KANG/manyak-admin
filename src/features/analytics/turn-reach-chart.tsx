'use client';

import type { ReactNode } from 'react';

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ChartCrosshair } from '@/features/dashboard/chart-crosshair';
import { ChartEndLabels } from '@/features/dashboard/chart-end-labels';

import { metricNumber, percent, platformText } from './config';
import { MetricHelp } from './metric-definition';
import {
  basisMark,
  NumericTable,
  PlatformPlaceholder,
  SummaryCards,
} from './metric-ui';
import { type Series, seriesGroups } from './series';
import { TURN_THRESHOLDS } from './turn-thresholds';
import type { ReachPoint, TurnReachResponse } from './types';

type ReachLine = Series & { data?: { chats: number; reached: ReachPoint[] } };

/** 기준 턴을 가로 축으로 두고 고른 구분 하나의 도달률 선을 그리는 차트다. */
function ReachChart({
  title,
  aside,
  line,
  tableTitle,
  firstRow,
  rateLabel,
  basis,
  unbounded = false,
}: {
  title: string;
  aside?: ReactNode;
  line: ReachLine;
  tableTitle: string;
  firstRow: string;
  rateLabel: string;
  basis?: string | null;
  unbounded?: boolean;
}) {
  const { key, label, data } = line;
  const rows = TURN_THRESHOLDS.map((turn) => ({
    turn: `${turn}턴`,
    [key]: data?.chats
      ? (data.reached.find((point) => point.turn === turn)?.rate ?? null)
      : null,
  }));
  const config = { [key]: { label, color: line.color } };
  const end = data?.chats
    ? data.reached.find((point) => point.turn === 50)
    : undefined;

  return (
    <Card className="min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{title}</h3>
        <MetricHelp title={title} />
        {aside}
        {basisMark(basis)}
      </div>
      {data?.chats ? (
        <div className="overflow-x-auto">
          <ChartContainer
            config={config}
            className="mt-5 h-72 min-w-[720px]"
            aria-label={title}
            initialDimension={{ width: 720, height: 288 }}>
            <LineChart
              accessibilityLayer
              data={rows}
              margin={{ top: 64, right: 110, bottom: 8, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="turn" type="category" interval={0} />
              {unbounded ? (
                <YAxis
                  domain={[0, 'dataMax']}
                  tickFormatter={(value) =>
                    `${Math.round(Number(value) * 100)}%`
                  }
                  width={60}
                />
              ) : (
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.25, 0.5, 0.75, 1]}
                  tickFormatter={(value) => `${Number(value) * 100}%`}
                  width={60}
                />
              )}
              <ChartTooltip
                cursor={<ChartCrosshair />}
                isAnimationActive={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <span>
                        {label} {percent(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              <Line
                dataKey={key}
                stroke={line.color}
                strokeWidth={2}
                strokeDasharray={line.dash}
                type="linear"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <ChartEndLabels
                labels={
                  end
                    ? [
                        {
                          id: key,
                          x: '50턴',
                          y: end.rate,
                          text: `${label} ${percent(end.rate)}`,
                        },
                      ]
                    : []
                }
              />
            </LineChart>
          </ChartContainer>
        </div>
      ) : (
        <p role="status" className="mt-4 text-sm">
          채팅 없음
        </p>
      )}
      <NumericTable
        title={tableTitle}
        definitionTitle={title}
        basis={basis}
        headers={['기준 턴', `${label} 도달 채팅 수`, `${label} ${rateLabel}`]}
        rows={[
          [
            firstRow,
            metricNumber(data?.chats ?? 0, '개'),
            data?.chats ? '100.0%' : '채팅 없음',
          ],
          ...TURN_THRESHOLDS.map((turn) => {
            const point = data?.reached.find((point) => point.turn === turn);

            return [
              `${turn}턴`,
              metricNumber(point?.chats ?? 0, '개'),
              data?.chats && point ? percent(point.rate) : '채팅 없음',
            ];
          }),
        ]}
      />
    </Card>
  );
}

/** 서버 DB의 N턴 이상 도달률이다. 대상은 응답의 `segments`에서 고르고 플랫폼으로는 나누지 않는다. */
export function TurnReachChart({
  data,
  segment,
  basis,
}: {
  data: TurnReachResponse;
  segment: string;
  basis?: string | null;
}) {
  const series =
    seriesGroups.owner.find((series) => series.key === segment) ??
    seriesGroups.owner[0];
  const line = {
    ...series,
    data: data.segments.find(
      (item) => item.segment.toLowerCase() === series.key,
    ),
  };

  return (
    <>
      <SummaryCards
        items={[
          {
            label: `${line.label} 채팅 수`,
            aside: basisMark(basis),
            value: metricNumber(line.data?.chats ?? 0, '개'),
          },
        ]}
      />
      <ReachChart
        title="N턴 이상 도달률"
        line={line}
        tableTitle="전체 수치 표"
        firstRow="채팅 수"
        rateLabel="도달률"
        basis={basis}
      />
    </>
  );
}

/** Amplitude의 1턴 대비 도달률이다. 서버 DB 도달률과 분모가 달라 따로 그린다. */
export function PlatformReachChart({
  platforms,
  platform,
  aside,
}: {
  platforms: TurnReachResponse['platforms'];
  platform: string;
  aside: ReactNode;
}) {
  if (!platforms)
    return (
      <PlatformPlaceholder title={platformText.reachTitle} aside={aside} />
    );

  const series =
    seriesGroups.platform.find((series) => series.key === platform) ??
    seriesGroups.platform[0];

  return (
    <ReachChart
      title={platformText.reachTitle}
      aside={aside}
      line={{
        ...series,
        data: platforms.find((item) => item.platform === series.key),
      }}
      tableTitle="1턴 대비 수치 표"
      firstRow="1턴 채팅 수"
      rateLabel="1턴 대비 도달률"
      unbounded
    />
  );
}
