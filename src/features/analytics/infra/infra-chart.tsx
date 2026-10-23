'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

import { DataTable } from '@/components/admin/data-ui';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ChartCrosshair } from '@/features/dashboard/chart-crosshair';

import { infraNumber, infraValue, kstTime, tableName, timeRows } from './data';
import type {
  InfraMetrics,
  InfraSeries,
  InfraTables,
  InfraUnit,
} from './types';

const number = (value: number, unit: InfraUnit) =>
  `${value.toLocaleString('ko-KR', { maximumFractionDigits: ['%', 'GB', 'MB', 'ms'].includes(unit) ? 1 : 0, minimumFractionDigits: ['%', 'GB', 'MB', 'ms'].includes(unit) ? 1 : 0 })}${unit}`;

export function InfraChart({
  title,
  data,
  series,
  unit,
}: {
  title: string;
  data: InfraMetrics;
  series: InfraSeries[];
  unit: InfraUnit;
}) {
  const rows = timeRows(data, series, unit);
  const config = Object.fromEntries(
    series.map((item) => [item.key, { label: item.label, color: item.color }]),
  );

  return (
    <Card className="min-w-0">
      <h3 className="font-semibold">{title}</h3>
      <ChartContainer
        config={config}
        className="mt-5 h-64 w-full"
        aria-label={title}>
        <LineChart
          accessibilityLayer
          data={rows}
          margin={{
            top: 28,
            right: series.length > 1 ? 100 : 12,
            left: 0,
            bottom: 0,
          }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="at"
            tickFormatter={(at) =>
              data.from === data.to
                ? kstTime(String(at), true)
                : kstTime(String(at)).slice(5)
            }
            minTickGap={35}
          />
          <YAxis
            width={60}
            domain={unit === '%' ? [0, 100] : undefined}
            unit={unit}
            tickFormatter={(v) =>
              Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
            }
          />
          <ChartTooltip
            cursor={<ChartCrosshair />}
            isAnimationActive={false}
            content={
              <ChartTooltipContent
                labelFormatter={(at) => `${kstTime(String(at))} KST`}
                formatter={(value, key) => (
                  <span>
                    {config[String(key)]?.label ?? key}{' '}
                    {number(Number(value), unit)}
                  </span>
                )}
              />
            }
          />
          {series.map((item, index) => (
            <Line
              key={item.key}
              dataKey={item.key}
              name={item.label}
              type="linear"
              stroke={`var(--color-${item.key})`}
              strokeWidth={2}
              strokeDasharray={item.dash}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}>
              {series.length > 1 ? (
                <LabelList
                  dataKey={(
                    row: { at: string } & Record<
                      string,
                      string | number | null
                    >,
                  ) =>
                    Date.parse(row.at) ===
                      Date.parse(item.points.at(-1)?.at ?? '') &&
                    row[item.key] !== null
                      ? `${item.label} ${number(Number(row[item.key]), unit)}`
                      : null
                  }
                  position="right"
                  dy={(index - (series.length - 1) / 2) * 16}
                  fontSize={10}
                  fill="var(--foreground)"
                />
              ) : null}
            </Line>
          ))}
          {series.length > 1 ? (
            <ChartLegend
              itemSorter={null}
              content={
                <ChartLegendContent className="flex-wrap gap-x-3 gap-y-2 [&>div]:shrink-0 [&>div]:whitespace-nowrap" />
              }
            />
          ) : null}
        </LineChart>
      </ChartContainer>
      <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          전체 수치 표
        </summary>
        <div className="mt-3 max-h-64 overflow-auto">
          <DataTable
            headers={['시각 (KST)', ...series.map((item) => item.label)]}
            empty={!rows.length}>
            {rows.map((row) => (
              <tr key={row.at}>
                <td>{kstTime(row.at)}</td>
                {series.map((item) => (
                  <td key={item.key}>
                    {row[item.key] === null
                      ? '값 없음'
                      : number(Number(row[item.key]), unit)}
                  </td>
                ))}
              </tr>
            ))}
          </DataTable>
        </div>
      </details>
    </Card>
  );
}
export function InfraRanking({ data }: { data: InfraTables }) {
  const rows = data.tables.map((table, index) => ({
    key: String(index),
    label: tableName(table),
    value: infraValue(table.totalBytes, 'MB'),
  }));

  return (
    <Card className="min-w-0">
      <h3 className="font-semibold">테이블별 전체 크기</h3>
      <ChartContainer
        config={{ value: { label: '전체 크기', color: 'var(--primary)' } }}
        className="mt-5 w-full"
        style={{ height: Math.max(250, rows.length * 32) }}
        aria-label="테이블별 전체 크기 순위">
        <BarChart
          accessibilityLayer
          data={rows}
          layout="vertical"
          margin={{ right: 68 }}>
          <CartesianGrid horizontal={false} />
          <YAxis type="category" dataKey="label" width={150} />
          <XAxis type="number" unit="MB" />
          <ChartTooltip
            isAnimationActive={false}
            content={
              <ChartTooltipContent
                formatter={(value) => number(Number(value), 'MB')}
              />
            }
          />
          <Bar dataKey="value" fill="var(--primary)" isAnimationActive={false}>
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value) => number(Number(value), 'MB')}
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          전체 수치 표
        </summary>
        <div className="mt-3 max-h-64 overflow-auto">
          <DataTable
            headers={['테이블', '전체 크기 (MB)']}
            empty={!rows.length}>
            {data.tables.map((table) => (
              <tr key={`${table.schema}.${table.name}`}>
                <td>{tableName(table)}</td>
                <td>{infraNumber(table.totalBytes, 'MB')}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </details>
    </Card>
  );
}
