'use client';

import { type ReactNode, useContext, useId } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Rectangle,
  XAxis,
  YAxis,
} from 'recharts';

import { DataTable, dateTime, TextLink } from '@/components/admin/data-ui';
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
import { ChartEndLabels } from '@/features/dashboard/chart-end-labels';

import { eventLabel, metricNumber, percent, ratio, sourceHelp } from './config';
import { wrapFunnelLabel } from './funnel-label';
import {
  allZero,
  eventMetric,
  type MetricDefinitionTitle,
  MetricHelp,
  MetricScope,
} from './metric-definition';
import type { Series } from './series';

export function Source({ source, help }: { source: string; help: string }) {
  return (
    <HelpTooltip label={`${source} 출처와 집계 안내`} source={source}>
      {help}
    </HelpTooltip>
  );
}
/** 고른 플랫폼이나 대상을 적용하지 못한 값의 제목 옆에 두는 회색 표시다. 문구가 없으면 undefined다. */
export function basisMark(text?: string | null) {
  return text ? (
    <span className="text-xs font-normal text-muted-foreground">{text}</span>
  ) : undefined;
}
/** 서버 DB 탭 안의 Amplitude 값 제목 옆에 두는 Amplitude 출처 표시다. */
export function PlatformSource({
  title,
  asOf,
}: {
  title: string;
  asOf?: string | null;
}) {
  return (
    <HelpTooltip label={`${title} 출처와 집계 안내`} source="Amplitude">
      {sourceHelp.users}
      {asOf ? ` ${dateTime(asOf)} KST 집계 기준` : ''}
    </HelpTooltip>
  );
}
/** 값을 그릴 수 없을 때 차트 자리에 두는 안내 카드다. 기본 문구는 "준비 중"이다. */
export function PlatformPlaceholder({
  title,
  aside,
  message = '준비 중',
}: {
  title: string;
  aside?: ReactNode;
  message?: string;
}) {
  return (
    <Card className="min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{title}</h3>
        <MetricHelp title={title} />
        {aside}
      </div>
      <p role="status" className="mt-4 text-sm">
        {message}
      </p>
    </Card>
  );
}
export function SummaryCards({
  items,
}: {
  items: {
    label: string;
    value: ReactNode;
    detail?: ReactNode;
    aside?: ReactNode;
    definitionTitle?: string;
    help?: ReactNode;
    href?: string;
  }[];
}) {
  return (
    <div className="mb-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className="relative min-w-0 [&_button]:relative [&_button]:z-10">
          {item.aside ? (
            <div className="flex items-center gap-2">
              <h3 className="text-sm text-muted-foreground">{item.label}</h3>
              <MetricHelp
                title={item.label}
                definitionTitle={item.definitionTitle}
                noEvents={item.value === '이벤트 수신 없음'}>
                {item.help}
              </MetricHelp>
              {item.aside}
            </div>
          ) : (
            <>
              <h3 className="inline text-sm text-muted-foreground">
                {item.label}
              </h3>{' '}
              <MetricHelp
                title={item.label}
                definitionTitle={item.definitionTitle}
                noEvents={item.value === '이벤트 수신 없음'}>
                {item.help}
              </MetricHelp>
            </>
          )}
          <div className="mt-3 text-2xl font-semibold break-words">
            {item.href ? (
              <Link
                href={item.href}
                aria-label={item.label}
                className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
                {item.value}
              </Link>
            ) : (
              item.value
            )}
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
export { PendingDates } from './pending-dates';
export function NumericTable({
  headers,
  rows,
  title = '전체 수치 표',
  basis,
  definitionTitle,
  collapsible = true,
}: {
  definitionTitle?: MetricDefinitionTitle;
  collapsible?: boolean;
  headers: (
    | string
    | { label: string; definitionTitle?: MetricDefinitionTitle | null }
  )[];
  rows: ReactNode[][];
  title?: string;
  basis?: string | null;
}) {
  const body = (
    <div className="mt-3 max-h-80 overflow-auto">
      <DataTable
        headers={headers.map((header, index) => {
          const label = typeof header === 'string' ? header : header.label;
          const explicit =
            typeof header !== 'string' && 'definitionTitle' in header;
          const definition = explicit
            ? header.definitionTitle
            : definitionTitle && index !== 0
              ? definitionTitle
              : label;

          return {
            label,
            help: <MetricHelp title={label} definitionTitle={definition} />,
          };
        })}
        empty={!rows.length}>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </DataTable>
    </div>
  );

  if (!collapsible)
    return (
      <Card className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          <MetricHelp title={title} definitionTitle={definitionTitle} />
        </div>
        {body}
      </Card>
    );

  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-xs text-muted-foreground">
        {title}
        <MetricHelp title={title} definitionTitle={definitionTitle} />
        {basis ? ` · ${basis}` : null}
      </summary>
      {body}
    </details>
  );
}
export type PlotRow = { date: string; [key: string]: string | number | null };
export type PlotEmptyLabel = string | ((date: string) => string);

export function formatPlotValue(
  row: PlotRow,
  key: string,
  {
    title,
    unit,
    emptyLabel = '값 없음',
  }: { title: string; unit: string; emptyLabel?: PlotEmptyLabel },
) {
  const value = row[key] as number | null;

  if (value == null) {
    if (row.pending === 1) return '준비 중';

    return typeof emptyLabel === 'function' ? emptyLabel(row.date) : emptyLabel;
  }

  return unit === '%'
    ? percent(value)
    : metricNumber(
        value,
        unit,
        unit === '초' || title.includes('사용자당') || title.includes('1인당')
          ? 1
          : 0,
      );
}

/** 차트와 통합 표가 같은 계열 판정과 행별 값 표기를 사용하게 한다. */
export function plotValues(
  scope: string,
  {
    title,
    unit,
    rows,
    series,
    emptyLabel,
  }: {
    title: string;
    unit: string;
    rows: PlotRow[];
    series: Series[];
    emptyLabel?: PlotEmptyLabel;
  },
) {
  const ready = rows.filter((row) => row.pending !== 1);
  const missing = eventMetric(scope, title)
    ? series.filter((s) =>
        allZero(ready.map((row) => row[s.key] as number | null | undefined)),
      )
    : [];

  return {
    missing,
    format: (row: PlotRow, key: string) =>
      row.pending !== 1 && missing.some((s) => s.key === key)
        ? '이벤트 수신 없음'
        : formatPlotValue(row, key, { title, unit, emptyLabel }),
  };
}

export function SeriesChart({
  title,
  definitionTitle,
  categoryLabel = '날짜',
  rows,
  series: originalSeries,
  unit,
  emptyLabel = '값 없음',
  href,
  stacked = false,
  composition = false,
  grouped = false,
  horizontal = false,
  tooltipDetail,
  aside,
}: {
  title: string;
  definitionTitle?: MetricDefinitionTitle;
  aside?: ReactNode;
  categoryLabel?: string;
  rows: PlotRow[];
  series: Series[];
  unit: string;
  emptyLabel?: PlotEmptyLabel;
  href?: (date: string) => string;
  stacked?: boolean;
  composition?: boolean;
  grouped?: boolean;
  horizontal?: boolean;
  tooltipDetail?: (row: PlotRow) => ReactNode;
}) {
  const scope = useContext(MetricScope);
  const { missing, format: values } = plotValues(scope, {
    title,
    unit,
    rows,
    series: originalSeries,
    emptyLabel,
  });
  const series = originalSeries.filter((s) => !missing.includes(s));
  const router = useRouter();
  const config = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  );
  const last = new Map(
    series.map((s) => [
      s.key,
      rows.findLast((row) => typeof row[s.key] === 'number')?.date,
    ]),
  );
  const axes = (
    <>
      <CartesianGrid vertical={false} />
      {horizontal ? (
        <>
          <XAxis type="number" unit={unit} />
          <YAxis type="category" dataKey="date" width={64} />
        </>
      ) : (
        <>
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
        </>
      )}
      <ChartTooltip
        cursor={grouped ? undefined : <ChartCrosshair />}
        isAnimationActive={false}
        filterNull={false}
        content={
          <ChartTooltipContent
            formatter={(_value, name, item) => (
              <span>
                {config[String(name)]?.label}{' '}
                {values(item.payload, String(name))}
                {composition
                  ? ` (${percent(
                      ratio(
                        Number(item.payload[String(name)]),
                        originalSeries.reduce(
                          (sum, s) => sum + Number(item.payload[s.key] ?? 0),
                          0,
                        ),
                      ),
                    )})`
                  : ''}
                {tooltipDetail ? (
                  <span className="ml-2">{tooltipDetail(item.payload)}</span>
                ) : null}
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
      {aside ? (
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          <MetricHelp
            title={title}
            definitionTitle={definitionTitle}
            noEvents={missing.length > 0}
          />
          {aside}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          <MetricHelp
            title={title}
            definitionTitle={definitionTitle}
            noEvents={missing.length > 0}
          />
        </div>
      )}
      {missing.length ? (
        <div className="mt-4 flex flex-wrap gap-3 text-xs" role="status">
          {missing.map((s) => (
            <span key={s.key}>
              {originalSeries.length > 1 ? `${s.label} ` : ''}이벤트 수신 없음
            </span>
          ))}
        </div>
      ) : null}
      {series.length ? (
        <ChartContainer
          config={config}
          className="mt-5 h-72 w-full"
          aria-label={`${title} 추이`}>
          {grouped || stacked ? (
            <BarChart
              accessibilityLayer
              data={rows}
              layout={horizontal ? 'vertical' : 'horizontal'}
              onClick={click}>
              {axes}
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  fill={s.color}
                  stackId={stacked ? 'total' : undefined}
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
                right:
                  series.length > 1 ||
                  series.some((s) => s.color === 'var(--chart-3)')
                    ? 100
                    : 16,
                bottom: 8,
                left: 0,
              }}
              onClick={click}>
              {axes}
              {series.map((s) => (
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
                  isAnimationActive={false}
                />
              ))}
              {series.length > 1 ||
              series.some((s) => s.color === 'var(--chart-3)') ? (
                <ChartEndLabels
                  labels={series.flatMap((s) => {
                    const row = rows.find(
                      (row) => row.date === last.get(s.key),
                    );
                    const value = row?.[s.key];

                    return row && typeof value === 'number'
                      ? [
                          {
                            id: s.key,
                            x: row.date,
                            y: value,
                            text: `${s.label} ${values(row, s.key)}`,
                          },
                        ]
                      : [];
                  })}
                />
              ) : null}
            </LineChart>
          )}
        </ChartContainer>
      ) : null}
      <NumericTable
        definitionTitle={definitionTitle ?? title}
        headers={[
          categoryLabel,
          ...originalSeries.map((s) => `${s.label} (${unit})`),
          ...(href ? ['관련 목록'] : []),
        ]}
        rows={rows.map((row) => [
          row.date,
          ...originalSeries.map((s) =>
            composition && !row.pending
              ? `${values(row, s.key)} (${percent(
                  ratio(
                    Number(row[s.key] ?? 0),
                    originalSeries.reduce(
                      (sum, item) => sum + Number(row[item.key] ?? 0),
                      0,
                    ),
                  ),
                )})`
              : values(row, s.key),
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
  minTurnNumber?: number | null;
  platform?: string | null;
  event: string;
  users: number;
  turnNumber?: number | null;
};
export function FunnelChart({
  steps,
  extraTable,
  help,
  definitionTitle,
}: {
  definitionTitle?: string;
  steps: FunnelStep[];
  extraTable?: ReactNode;
  help?: string;
}) {
  const patternId = `funnel-hatch-${useId().replaceAll(':', '')}`;

  if (steps[0]?.users === 0)
    return (
      <Card>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">단계별 전환</h3>
          <MetricHelp
            title="단계별 전환"
            definitionTitle={definitionTitle}
            noEvents>
            {help}
          </MetricHelp>
        </div>
        <p role="status" className="mt-4">
          이벤트 수신 없음
        </p>
      </Card>
    );

  const rows = steps.map((s, i) => ({
    ...s,
    label: eventLabel(s.event, s.turnNumber, s.minTurnNumber, s.platform),
    first: i === 0,
    overallConversion: ratio(s.users, steps[0].users),
    rate: (ratio(s.users, steps[0].users) ?? 0) * 100,
    dropoff: i
      ? (ratio(Math.max(steps[i - 1].users - s.users, 0), steps[0].users) ??
          0) * 100
      : 0,
    conversion: i ? ratio(s.users, steps[i - 1].users) : null,
  }));

  const valueLabel = (row: (typeof rows)[number]) =>
    `${metricNumber(row.users, '명')}, 첫 단계 대비 ${percent(row.overallConversion)}${row.first ? '' : `, 앞 단계 대비 ${percent(row.conversion)}`}`;
  const maxRate = Math.max(100, ...rows.map((row) => row.rate));
  const minWidth = Math.max(640, steps.length * 120);
  const labelWidth = Math.max(
    48,
    (minWidth - 48 - 24) / Math.max(steps.length, 1) - 32,
  );
  const lines = (label: string) => wrapFunnelLabel(label, labelWidth);
  const axisHeight = Math.max(
    64,
    ...rows.map((row) => lines(row.label).length * 14 + 12),
  );

  return (
    <>
      <SummaryCards
        items={[
          {
            label: '첫 단계 사용자 수',
            definitionTitle,
            help,
            value: metricNumber(steps[0]?.users ?? 0, '명'),
          },
          {
            label: '마지막 단계 사용자 수',
            definitionTitle,
            help,
            value: metricNumber(steps.at(-1)?.users ?? 0, '명'),
          },
          {
            label: '첫 단계 대비 마지막 단계 전환율',
            definitionTitle,
            help,
            value: percent(
              ratio(steps.at(-1)?.users ?? 0, steps[0]?.users ?? 0),
            ),
          },
        ]}
      />
      <Card className="xl:col-span-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">단계별 전환</h3>
          <MetricHelp title="단계별 전환" definitionTitle={definitionTitle}>
            {help}
          </MetricHelp>
        </div>
        <div className="overflow-x-auto">
          {' '}
          <ChartContainer
            config={{
              rate: { label: '첫 단계 대비 전환율', color: 'var(--primary)' },
            }}
            className="mt-5 w-full"
            style={{
              height: 360 + Math.max(0, axisHeight - 64),
              minWidth,
            }}
            aria-label="단계별 전환 세로 막대">
            <BarChart
              accessibilityLayer
              data={rows}
              maxBarSize={96}
              barCategoryGap="20%"
              margin={{ left: 0, right: 24, top: 32, bottom: 8 }}>
              <defs>
                <pattern
                  id={patternId}
                  width={8}
                  height={8}
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)">
                  <rect
                    width={8}
                    height={8}
                    fill="var(--primary)"
                    fillOpacity={0.12}
                  />
                  <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={8}
                    stroke="var(--primary)"
                    strokeWidth={3}
                    strokeOpacity={0.3}
                  />
                </pattern>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={0}
                height={axisHeight}
                tick={({ x, y, payload }) => (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    fill="var(--muted-foreground)"
                    fontSize={11}>
                    <title>{String(payload.value)}</title>
                    {lines(String(payload.value)).map((line, index) => (
                      <tspan key={index} x={x} dy={15}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                )}
              />
              <YAxis
                type="number"
                width={48}
                domain={[0, maxRate]}
                ticks={
                  maxRate > 100
                    ? [0, 25, 50, 75, 100, maxRate]
                    : [0, 25, 50, 75, 100]
                }
                tickFormatter={(value: number) =>
                  `${Number(value.toFixed(1))}%`
                }
                tick={{ fontSize: 10 }}
              />
              <ChartTooltip
                isAnimationActive={false}
                content={
                  <ChartTooltipContent
                    formatter={(_value, _name, item) =>
                      valueLabel(item.payload)
                    }
                  />
                }
              />
              <Bar
                dataKey="rate"
                shape={<Rectangle />}
                stackId="funnel"
                fill="var(--primary)"
                isAnimationActive={false}>
                <LabelList
                  dataKey={(row: (typeof rows)[number]) =>
                    `${percent(row.overallConversion)} ${metricNumber(row.users, '명')}`
                  }
                  content={({ index, viewBox }) => {
                    const row = index === undefined ? undefined : rows[index];

                    if (
                      !row ||
                      !viewBox ||
                      !('x' in viewBox) ||
                      typeof viewBox.x !== 'number' ||
                      typeof viewBox.y !== 'number' ||
                      typeof viewBox.width !== 'number' ||
                      typeof viewBox.height !== 'number'
                    )
                      return null;

                    const center = viewBox.x + viewBox.width / 2;
                    const count = metricNumber(row.users, '명');
                    const rate = percent(row.overallConversion);
                    const width = Math.max(
                      64,
                      count.length * 7 + 18,
                      rate.length * 8 + 18,
                    );
                    const top = viewBox.y - Math.max(21, 46 - viewBox.height);

                    return (
                      <g data-funnel-label="">
                        <rect
                          x={center - width / 2}
                          y={top}
                          width={width}
                          height={44}
                          rx={3}
                          fill="var(--card)"
                          stroke="var(--border)"
                        />
                        <text
                          x={center}
                          y={top + 15}
                          textAnchor="middle"
                          fontSize={12}
                          fontWeight={600}
                          fill="var(--foreground)">
                          {rate}
                        </text>
                        <text
                          x={center}
                          y={top + 32}
                          textAnchor="middle"
                          fontSize={11}
                          fill="var(--muted-foreground)">
                          {count}
                        </text>
                      </g>
                    );
                  }}
                />
              </Bar>
              <Bar
                dataKey="dropoff"
                stackId="funnel"
                fill={`url(#${patternId})`}
                tooltipType="none"
                legendType="none"
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        </div>
        {extraTable ?? (
          <NumericTable
            definitionTitle={definitionTitle}
            headers={[
              '단계',
              '사용자 수',
              '첫 단계 대비 전환율',
              '앞 단계 대비 전환율',
            ]}
            rows={rows.map((row) => [
              row.label,
              metricNumber(row.users, '명'),
              percent(row.overallConversion),
              row.first ? '' : percent(row.conversion),
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
  unit = '명',
  preserveOrder = false,
  table = true,
  aside,
}: {
  title: string;
  items: { label: string; value: number; display?: string }[];
  unit?: string;
  preserveOrder?: boolean;
  table?: boolean;
  aside?: ReactNode;
}) {
  const top = preserveOrder
    ? items
    : items.toSorted((a, b) => b.value - a.value).slice(0, 20);

  return (
    <Card className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{title}</h3>
        <MetricHelp title={title} />
        {aside}
      </div>
      <ChartContainer
        config={{
          value: {
            label: unit === '명' ? '방문자' : '금액',
            color: 'var(--primary)',
          },
        }}
        className="mt-5 w-full"
        style={{ height: Math.max(220, top.length * 36) }}
        aria-label={`${title} 순위`}>
        <BarChart
          accessibilityLayer
          data={top}
          layout="vertical"
          margin={{ right: unit === '명' ? 64 : 144 }}>
          <XAxis type="number" unit={unit} />
          <YAxis
            type="category"
            dataKey="label"
            width={unit === '명' ? 130 : 100}
            tick={{ fontSize: 10 }}
          />
          <ChartTooltip
            isAnimationActive={false}
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) =>
                  item.payload.display ?? metricNumber(Number(value), unit)
                }
              />
            }
          />
          <Bar dataKey="value" fill="var(--primary)" isAnimationActive={false}>
            <LabelList
              dataKey={
                items.some((item) => item.display)
                  ? (row: { value: number; display?: string }) =>
                      row.display ?? metricNumber(row.value, unit)
                  : 'value'
              }
              position="right"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      {table ? (
        <NumericTable
          definitionTitle={title}
          headers={['구분', unit === '명' ? '방문자 (명)' : `값 (${unit})`]}
          rows={items.map((row) => [
            row.label,
            row.display ?? metricNumber(row.value, unit),
          ])}
        />
      ) : null}
    </Card>
  );
}
