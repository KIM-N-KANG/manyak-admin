'use client';

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ChartCrosshair } from '@/features/dashboard/chart-crosshair';
import { ChartEndLabels } from '@/features/dashboard/chart-end-labels';

import { metricNumber, percent } from './config';
import { NumericTable, SummaryCards } from './metric-ui';
import { seriesGroups } from './series';
import { TURN_THRESHOLDS } from './turn-thresholds';
import type { TurnReachResponse } from './types';

export function TurnReachChart({ data }: { data: TurnReachResponse }) {
  const segments = seriesGroups.owner.map((series) => ({
    ...series,
    segment: data.segments.find(
      (segment) => segment.segment.toLowerCase() === series.key,
    ),
  }));
  const rows = TURN_THRESHOLDS.map((turn) =>
    Object.fromEntries([
      ['turn', `${turn}턴`],
      ...segments.map(({ key, segment }) => [
        key,
        segment?.chats
          ? (segment.reached.find((point) => point.turn === turn)?.rate ?? null)
          : null,
      ]),
    ]),
  );
  const config = Object.fromEntries(
    segments.map((s) => [s.key, { label: s.label, color: s.color }]),
  );

  return (
    <>
      <SummaryCards
        items={segments.map(({ label, segment }) => ({
          label: `${label} 채팅 수`,
          value: metricNumber(segment?.chats ?? 0, '개'),
        }))}
      />
      <Card className="min-w-0">
        <h3 className="font-semibold">N턴 이상 도달률</h3>
        <div className="overflow-x-auto">
          <ChartContainer
            config={config}
            className="mt-5 h-72 min-w-[720px]"
            aria-label="N턴 이상 도달률"
            initialDimension={{ width: 720, height: 288 }}>
            <LineChart
              accessibilityLayer
              data={rows}
              margin={{ top: 64, right: 110, bottom: 8, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="turn" type="category" interval={0} />
              <YAxis
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tickFormatter={(value) => `${Number(value) * 100}%`}
                width={60}
              />
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
              {segments
                .filter(({ segment }) => segment && segment.chats > 0)
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
                labels={segments.flatMap(({ key, label, segment }) => {
                  const point = segment?.chats
                    ? segment.reached.find((point) => point.turn === 50)
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
          aria-label="도달률 범례"
          className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
          {segments.map((s) => (
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
              {!s.segment?.chats ? ' (채팅 없음)' : ''}
            </li>
          ))}
        </ul>
        <NumericTable
          title="전체 수치 표"
          headers={[
            '기준 턴',
            ...segments.flatMap((s) => [
              `${s.label} 도달 채팅 수`,
              `${s.label} 도달률`,
            ]),
          ]}
          rows={[
            [
              '채팅 수',
              ...segments.flatMap(({ segment }) => [
                metricNumber(segment?.chats ?? 0, '개'),
                segment?.chats ? '100.0%' : '채팅 없음',
              ]),
            ],
            ...TURN_THRESHOLDS.map((turn) => [
              `${turn}턴`,
              ...segments.flatMap(({ segment }) => {
                const point = segment?.reached.find(
                  (point) => point.turn === turn,
                );

                return [
                  metricNumber(point?.chats ?? 0, '개'),
                  segment?.chats && point ? percent(point.rate) : '채팅 없음',
                ];
              }),
            ]),
          ]}
        />
      </Card>
    </>
  );
}
