'use client';

import type { ReactNode } from 'react';

import { useRouter } from 'next/navigation';
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

import { DataTable, TextLink } from '@/components/admin/data-ui';
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

import { eventLabel, metricNumber, percent, ratio } from './config';
import type { Series } from './series';

export function Source({ source, help }: { source: string; help: string }) {
  return (
    <HelpTooltip label={`${source} 출처와 집계 안내`} source={source}>
      {help}
    </HelpTooltip>
  );
}
export function SummaryCards({
  items,
}: {
  items: { label: string; value: ReactNode; detail?: ReactNode }[];
}) {
  return (
    <div className="mb-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="min-w-0">
          <h3 className="text-sm text-muted-foreground">{item.label}</h3>
          <div className="mt-3 text-2xl font-semibold break-words">
            {item.value}
          </div>
          {item.detail ? (
            <div className="mt-2 text-xs text-muted-foreground">
              {item.detail}
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
export function PendingDates({ dates }: { dates: string[] }) {
  return dates.length ? (
    <div role="status" className="mb-5 rounded-md border p-4 text-sm">
      준비 중 날짜 {dates.length}개. 60초 뒤 다시 요청합니다.
      <details className="mt-2 text-xs">
        <summary>준비 중 날짜</summary>
        <p className="mt-2">{dates.join(', ')}</p>
      </details>
    </div>
  ) : null;
}
export function NumericTable({
  headers,
  rows,
  title = '전체 수치 표',
}: {
  headers: string[];
  rows: ReactNode[][];
  title?: string;
}) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-xs text-muted-foreground">
        {title}
      </summary>
      <div className="mt-3 max-h-80 overflow-auto">
        <DataTable headers={headers} empty={!rows.length}>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </DataTable>
      </div>
    </details>
  );
}
export type PlotRow = { date: string; [key: string]: string | number | null };
export function SeriesChart({
  title,
  categoryLabel = '날짜',
  rows,
  series,
  unit,
  emptyLabel = '값 없음',
  href,
  grouped = false,
}: {
  title: string;
  categoryLabel?: string;
  rows: PlotRow[];
  series: Series[];
  unit: string;
  emptyLabel?: string;
  href?: (date: string) => string;
  grouped?: boolean;
}) {
  const router = useRouter();
  const values = (value: number | null) =>
    value == null
      ? emptyLabel
      : unit === '%'
        ? percent(value)
        : metricNumber(
            value,
            unit,
            unit === '초' || title.includes('사용자당') ? 1 : 0,
          );
  const config = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  );
  const last = new Map(
    series.map((s) => [
      s.key,
      rows.findLast((row) => typeof row[s.key] === 'number')?.date,
    ]),
  );
  const lastValue = (key: string) =>
    Number(rows.findLast((row) => row.date === last.get(key))?.[key] ?? 0);
  const labelRanks = new Map(
    series
      .toSorted((a, b) => lastValue(b.key) - lastValue(a.key))
      .map((item, index) => [item.key, index]),
  );
  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="date"
        tickFormatter={(v) =>
          categoryLabel === '날짜' ? String(v).slice(5) : String(v)
        }
        minTickGap={30}
        tickLine={false}
      />
      <YAxis
        width={64}
        unit={unit}
        domain={grouped ? [0, 1] : [0, 'auto']}
        tickFormatter={(v) =>
          unit === '%'
            ? `${Number(v) * 100}`
            : Number(v).toLocaleString('ko-KR')
        }
      />
      <ChartTooltip
        cursor={grouped ? undefined : <ChartCrosshair />}
        isAnimationActive={false}
        content={
          <ChartTooltipContent
            formatter={(value, name) => (
              <span>
                {config[String(name)]?.label} {values(Number(value))}
              </span>
            )}
          />
        }
      />
      {series.length > 1 ? (
        <ChartLegend
          itemSorter={null}
          content={
            <ChartLegendContent className="flex-wrap gap-x-3 gap-y-2 [&>div]:shrink-0 [&>div]:whitespace-nowrap" />
          }
        />
      ) : null}
    </>
  );
  const click = (state: { activeTooltipIndex?: number | string | null }) => {
    if (state.activeTooltipIndex == null) return;

    const date = rows[Number(state.activeTooltipIndex)]?.date;

    if (href && date) router.push(href(date));
  };

  return (
    <Card className="min-w-0">
      <h3 className="font-semibold">{title}</h3>
      <ChartContainer
        config={config}
        className="mt-5 h-72 w-full"
        aria-label={`${title} 추이`}>
        {grouped ? (
          <BarChart accessibilityLayer data={rows} onClick={click}>
            {axes}
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                fill={s.color}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        ) : (
          <LineChart
            accessibilityLayer
            data={rows}
            margin={{
              top: 64,
              right: series.length > 1 ? 100 : 16,
              bottom: 8,
              left: 0,
            }}
            onClick={click}>
            {axes}
            {series.map((s, i) => (
              <Line
                key={s.key}
                dataKey={s.key}
                type="linear"
                stroke={s.color}
                strokeDasharray={s.dash}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}>
                {series.length > 1 ? (
                  <LabelList
                    dataKey={(row: PlotRow) =>
                      row.date === last.get(s.key)
                        ? `${s.label} ${values(row[s.key] as number)}`
                        : null
                    }
                    position="right"
                    dy={-(series.length - (labelRanks.get(s.key) ?? i)) * 14}
                    fill="var(--foreground)"
                    fontSize={10}
                  />
                ) : null}
              </Line>
            ))}
          </LineChart>
        )}
      </ChartContainer>
      <NumericTable
        headers={[
          categoryLabel,
          ...series.map((s) => `${s.label} (${unit})`),
          ...(href ? ['관련 목록'] : []),
        ]}
        rows={rows.map((row) => [
          row.date,
          ...series.map((s) =>
            row.pending === 1 ? '준비 중' : values(row[s.key] as number | null),
          ),
          ...(href
            ? [
                <TextLink key="link" href={href(row.date)}>
                  회원 목록 →
                </TextLink>,
              ]
            : []),
        ])}
      />
    </Card>
  );
}
export type FunnelStep = {
  event: string;
  users: number;
  turnNumber?: number | null;
};
export function FunnelChart({
  steps,
  extraTable,
  help,
}: {
  steps: FunnelStep[];
  extraTable?: ReactNode;
  help?: string;
}) {
  const rows = steps.map((s, i) => ({
    ...s,
    label: eventLabel(s.event, s.turnNumber),
    conversion: i ? ratio(s.users, steps[i - 1].users) : null,
  }));

  return (
    <>
      <SummaryCards
        items={[
          {
            label: '첫 단계 사용자 수',
            value: metricNumber(steps[0]?.users ?? 0, '명'),
          },
          {
            label: '마지막 단계 사용자 수',
            value: metricNumber(steps.at(-1)?.users ?? 0, '명'),
          },
          {
            label: '첫 단계 대비 마지막 단계 전환율',
            value: percent(
              ratio(steps.at(-1)?.users ?? 0, steps[0]?.users ?? 0),
            ),
          },
        ]}
      />
      <Card className="xl:col-span-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">단계별 전환</h3>
          {help ? (
            <HelpTooltip label="전환 집계 안내">{help}</HelpTooltip>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          {' '}
          <ChartContainer
            config={{ users: { label: '사용자 수', color: 'var(--primary)' } }}
            className="mt-5 w-full min-w-[640px]"
            style={{ height: Math.max(300, steps.length * 64) }}
            aria-label="단계별 전환 가로 막대">
            <BarChart
              accessibilityLayer
              data={rows}
              layout="vertical"
              margin={{ left: 0, right: 160 }}>
              <XAxis type="number" unit="명" />
              <YAxis
                type="category"
                dataKey="label"
                width={190}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                isAnimationActive={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      `${Number(value).toLocaleString('ko-KR')}명`
                    }
                  />
                }
              />
              <Bar
                dataKey="users"
                fill="var(--primary)"
                isAnimationActive={false}>
                <LabelList
                  dataKey={(row: (typeof rows)[number]) =>
                    `${metricNumber(row.users, '명')}, ${percent(row.conversion)}`
                  }
                  position="right"
                  fill="var(--foreground)"
                  fontSize={11}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
        {extraTable ?? (
          <NumericTable
            headers={['단계', '사용자 수', '앞 단계 대비 전환율']}
            rows={rows.map((row) => [
              row.label,
              metricNumber(row.users, '명'),
              percent(row.conversion),
            ])}
          />
        )}
      </Card>
    </>
  );
}
export function Ranking({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number }[];
}) {
  const top = items.toSorted((a, b) => b.value - a.value).slice(0, 20);

  return (
    <Card className="min-w-0">
      <h3 className="font-semibold">{title}</h3>
      <ChartContainer
        config={{ value: { label: '방문자', color: 'var(--primary)' } }}
        className="mt-5 w-full"
        style={{ height: Math.max(220, top.length * 36) }}
        aria-label={`${title} 순위`}>
        <BarChart
          accessibilityLayer
          data={top}
          layout="vertical"
          margin={{ right: 64 }}>
          <XAxis type="number" unit="명" />
          <YAxis
            type="category"
            dataKey="label"
            width={130}
            tick={{ fontSize: 10 }}
          />
          <ChartTooltip
            isAnimationActive={false}
            content={
              <ChartTooltipContent
                formatter={(value) =>
                  `${Number(value).toLocaleString('ko-KR')}명`
                }
              />
            }
          />
          <Bar dataKey="value" fill="var(--primary)" isAnimationActive={false}>
            <LabelList dataKey="value" position="right" />
          </Bar>
        </BarChart>
      </ChartContainer>
      <NumericTable
        headers={['구분', '방문자 (명)']}
        rows={items.map((row) => [row.label, metricNumber(row.value, '명')])}
      />
    </Card>
  );
}
