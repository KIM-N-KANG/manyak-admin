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
import { NumericTable, PlatformPlaceholder, SummaryCards } from './metric-ui';
import { type Series, seriesGroups } from './series';
import { TURN_THRESHOLDS } from './turn-thresholds';
import type { ReachPoint, TurnReachResponse } from './types';

type ReachLine = Series & { data?: { chats: number; reached: ReachPoint[] } };

/** 기준 턴을 가로 축으로 두고 구분마다 도달률 선을 그리는 차트다. */
function ReachChart({
  title,
  aside,
  lines,
  legendLabel,
  tableTitle,
  firstRow,
  rateLabel,
  unbounded = false,
}: {
  title: string;
  aside?: ReactNode;
  lines: ReachLine[];
  legendLabel: string;
  tableTitle: string;
  firstRow: string;
  rateLabel: string;
  unbounded?: boolean;
}) {
  const rows = TURN_THRESHOLDS.map((turn) =>
    Object.fromEntries([
      ['turn', `${turn}턴`],
      ...lines.map(({ key, data }) => [
        key,
        data?.chats
          ? (data.reached.find((point) => point.turn === turn)?.rate ?? null)
          : null,
      ]),
    ]),
  );
  const config = Object.fromEntries(
    lines.map((s) => [s.key, { label: s.label, color: s.color }]),
  );

  return (
    <Card className="min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{title}</h3>
        {aside}
      </div>
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
                tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
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
                  formatter={(value, name) => (
                    <span>
                      {config[String(name)]?.label} {percent(Number(value))}
                    </span>
                  )}
                />
              }
            />
            {lines
              .filter(({ data }) => data && data.chats > 0)
              .map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.dash}
                  type="linear"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            <ChartEndLabels
              labels={lines.flatMap(({ key, label, data }) => {
                const point = data?.chats
                  ? data.reached.find((point) => point.turn === 50)
                  : undefined;

                return point
                  ? [
                      {
                        id: key,
                        x: '50턴',
                        y: point.rate,
                        text: `${label} ${percent(point.rate)}`,
                      },
                    ]
                  : [];
              })}
            />
          </LineChart>
        </ChartContainer>
      </div>
      <ul
        aria-label={legendLabel}
        className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
        {lines.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <svg width="24" height="8" aria-hidden="true">
              <line
                x1="0"
                x2="24"
                y1="4"
                y2="4"
                stroke={s.color}
                strokeWidth="2"
                strokeDasharray={s.dash}
              />
            </svg>
            {s.label}
            {!s.data?.chats ? ' (채팅 없음)' : ''}
          </li>
        ))}
      </ul>
      <NumericTable
        title={tableTitle}
        headers={[
          '기준 턴',
          ...lines.flatMap((s) => [
            `${s.label} 도달 채팅 수`,
            `${s.label} ${rateLabel}`,
          ]),
        ]}
        rows={[
          [
            firstRow,
            ...lines.flatMap(({ data }) => [
              metricNumber(data?.chats ?? 0, '개'),
              data?.chats ? '100.0%' : '채팅 없음',
            ]),
          ],
          ...TURN_THRESHOLDS.map((turn) => [
            `${turn}턴`,
            ...lines.flatMap(({ data }) => {
              const point = data?.reached.find((point) => point.turn === turn);

              return [
                metricNumber(point?.chats ?? 0, '개'),
                data?.chats && point ? percent(point.rate) : '채팅 없음',
              ];
            }),
          ]),
        ]}
      />
    </Card>
  );
}

export function TurnReachChart({ data }: { data: TurnReachResponse }) {
  const segments = seriesGroups.owner.map((series) => ({
    ...series,
    data: data.segments.find(
      (segment) => segment.segment.toLowerCase() === series.key,
    ),
  }));

  return (
    <>
      <SummaryCards
        items={segments.map(({ label, data }) => ({
          label: `${label} 채팅 수`,
          value: metricNumber(data?.chats ?? 0, '개'),
        }))}
      />
      <ReachChart
        title="N턴 이상 도달률"
        lines={segments}
        legendLabel="도달률 범례"
        tableTitle="전체 수치 표"
        firstRow="채팅 수"
        rateLabel="도달률"
      />
    </>
  );
}

/** Amplitude 플랫폼별 1턴 대비 도달률이다. 서버 DB 도달률과 분모가 달라 따로 그린다. */
export function PlatformReachChart({
  platforms,
  aside,
}: {
  platforms: TurnReachResponse['platforms'];
  aside: ReactNode;
}) {
  if (!platforms)
    return (
      <PlatformPlaceholder title={platformText.reachTitle} aside={aside} />
    );

  return (
    <ReachChart
      title={platformText.reachTitle}
      aside={aside}
      lines={seriesGroups.platform.map((series) => ({
        ...series,
        data: platforms.find((item) => item.platform === series.key),
      }))}
      legendLabel="플랫폼별 도달률 범례"
      tableTitle="플랫폼별 수치 표"
      firstRow="1턴 채팅 수"
      rateLabel="1턴 대비 도달률"
      unbounded
    />
  );
}
