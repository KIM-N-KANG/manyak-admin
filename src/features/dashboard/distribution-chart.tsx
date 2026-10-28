'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  type LabelProps,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import {
  aiFeatureColor,
  chartNumber,
  distributionNumber,
  firstMessagePoints,
  genreDepthTitle,
  MIN_GENRE_CHATS,
  orderedAiPoints,
  ownerSummary,
  ownerTooltip,
  rankedPoints,
} from '@/features/dashboard/chart-data';
import type { ChartPoint, Distribution } from '@/features/dashboard/types';

type ChartProps = {
  distribution: Distribution;
  onSelect: (point: ChartPoint) => void;
};

function DistributionTooltip({
  active,
  payload,
  unit,
  genre = false,
  owner = false,
}: {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  unit: string;
  genre?: boolean;
  owner?: boolean;
}) {
  const point = payload?.[0]?.payload;

  if (
    !active ||
    !point ||
    typeof point !== 'object' ||
    !('label' in point) ||
    !('value' in point) ||
    typeof point.label !== 'string' ||
    typeof point.value !== 'number'
  )
    return null;

  if (owner)
    return (
      <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-sm">
        <p>{ownerTooltip(point as ChartPoint)}</p>
      </div>
    );

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-sm">
      <p>{point.label}</p>
      <p className="mt-1 font-mono">
        {genre && 'chats' in point && 'totalTurns' in point
          ? `평균 ${chartNumber(point.value)}턴, 채팅 ${chartNumber(point.chats)}개, 총 ${chartNumber(point.totalTurns)}턴`
          : `${distributionNumber(point.value, unit)} ${unit}`}
      </p>
    </div>
  );
}

function GenreBars({ distribution, onSelect }: ChartProps) {
  const points = rankedPoints(distribution);
  const omitted =
    distribution.points.filter((point) => (point.chats ?? 0) >= MIN_GENRE_CHATS)
      .length - points.length;

  if (!points.length)
    return (
      <p className="mt-5 text-sm text-muted-foreground">
        채팅이 5개 이상인 장르가 없습니다.
      </p>
    );

  const minWidth = Math.max(360, points.length * 84 + 80);

  return (
    <>
      {omitted > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          상위 30개, 외 {omitted}개 장르는 아래 표에서 확인해 주세요.
        </p>
      ) : null}
      <div
        className="mt-5 overflow-x-auto rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
        role="region"
        aria-label={`${genreDepthTitle} 차트 가로 스크롤`}
        tabIndex={0}>
        <ChartContainer
          config={{
            value: { label: distribution.unit, color: 'var(--primary)' },
          }}
          className="h-[360px] w-full"
          style={{ minWidth }}
          initialDimension={{ width: minWidth, height: 360 }}
          aria-label={genreDepthTitle}>
          <BarChart
            accessibilityLayer
            data={points}
            margin={{ top: 24, right: 24, bottom: 8, left: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              angle={-40}
              textAnchor="end"
              height={110}
              tickLine={false}
              axisLine={false}
            />
            <YAxis type="number" width={48} tickLine={false} axisLine={false} />
            <ChartTooltip
              isAnimationActive={false}
              content={<DistributionTooltip unit={distribution.unit} genre />}
            />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              maxBarSize={48}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
              className="cursor-pointer"
              onClick={(_data, index) => onSelect(points[index])}>
              <LabelList
                dataKey="value"
                position="top"
                formatter={chartNumber}
                fill="var(--foreground)"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </>
  );
}

function HorizontalBars({ distribution, onSelect }: ChartProps) {
  const ranked = rankedPoints(distribution);
  const points =
    distribution.chartId === 'ai-latency' ? orderedAiPoints(ranked) : ranked;

  return (
    <ChartContainer
      config={{ value: { label: distribution.unit, color: 'var(--primary)' } }}
      className="mt-5 w-full"
      style={{ height: Math.max(180, points.length * 32 + 40) }}
      aria-label={distribution.title}>
      <BarChart
        accessibilityLayer
        data={points}
        layout="vertical"
        margin={{ top: 8, right: 72, bottom: 8, left: 0 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={128}
          interval={0}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          isAnimationActive={false}
          content={<DistributionTooltip unit={distribution.unit} />}
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          barSize={18}
          radius={[0, 3, 3, 0]}
          isAnimationActive={false}
          className="cursor-pointer"
          onClick={(_data, index) => onSelect(points[index])}>
          {distribution.chartId === 'ai-latency'
            ? points.map((point) => (
                <Cell key={point.label} fill={aiFeatureColor(point)} />
              ))
            : null}
          <LabelList
            dataKey="value"
            position="right"
            formatter={chartNumber}
            fill="var(--foreground)"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function DonutCenter({
  viewBox,
  guestPercent,
}: {
  viewBox?: LabelProps['viewBox'];
  guestPercent: number;
}) {
  if (!viewBox) return null;

  const cx =
    'cx' in viewBox
      ? viewBox.cx
      : 'x' in viewBox &&
          typeof viewBox.x === 'number' &&
          'width' in viewBox &&
          typeof viewBox.width === 'number'
        ? viewBox.x + viewBox.width / 2
        : undefined;
  const cy =
    'cy' in viewBox
      ? viewBox.cy
      : 'y' in viewBox &&
          typeof viewBox.y === 'number' &&
          'height' in viewBox &&
          typeof viewBox.height === 'number'
        ? viewBox.y + viewBox.height / 2
        : undefined;

  if (cx === undefined || cy === undefined) return null;

  return (
    <text x={cx} y={cy} textAnchor="middle" fill="var(--foreground)">
      <tspan x={cx} dy="-2" className="text-2xl font-semibold">
        {distributionNumber(guestPercent, '%')}%
      </tspan>
      <tspan x={cx} dy="22" className="text-xs" fill="var(--muted-foreground)">
        게스트
      </tspan>
    </text>
  );
}

function StartedAsDonut({ distribution, onSelect }: ChartProps) {
  const points = distribution.points.map((point, index) => ({
    ...point,
    fill: index === 0 ? 'var(--chart-2)' : 'var(--chart-3)',
  }));
  const guest =
    points.find((point) => point.link.params.startedAs === 'GUEST')?.value ?? 0;

  if (!points.some((point) => point.value > 0))
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        집계된 채팅이 없습니다.
      </p>
    );

  return (
    <>
      <ChartContainer
        config={{ value: { label: '비율', color: 'var(--primary)' } }}
        className="mt-5 h-[220px] w-full"
        aria-label={distribution.title}>
        <PieChart accessibilityLayer>
          <ChartTooltip
            isAnimationActive={false}
            content={<DistributionTooltip unit="%" owner />}
          />
          <Pie
            data={points}
            dataKey="value"
            nameKey="label"
            innerRadius={50}
            outerRadius={76}
            stroke="var(--card)"
            strokeWidth={2}
            labelLine={false}
            label={({ x, y, name, value, textAnchor }) => (
              <text
                x={x}
                y={y}
                textAnchor={textAnchor}
                dominantBaseline="central"
                fill="var(--foreground)">
                {name} {distributionNumber(Number(value), '%')}%
              </text>
            )}
            isAnimationActive={false}
            className="cursor-pointer"
            onClick={(_data, index) => onSelect(points[index])}>
            <Label
              position="center"
              content={<DonutCenter guestPercent={guest} />}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mt-2 space-y-1 text-sm">
        {points.map((point) => (
          <li key={point.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-xs"
              style={{ background: point.fill }}
            />
            {ownerSummary(point)}
          </li>
        ))}
      </ul>
    </>
  );
}

function FirstMessageStats({ distribution, onSelect }: ChartProps) {
  const points = firstMessagePoints(distribution.points);
  const value = (label: string) =>
    points.find((point) => point.label === label)?.value ?? 0;
  const max = Math.max(0, ...points.map((point) => point.value));
  const at = (seconds: number) => (max ? (seconds / max) * 100 : 0);
  const seconds = (seconds: number) =>
    `${chartNumber(seconds)}${distribution.unit}`;

  return (
    <div className="mt-5">
      <div className="grid grid-cols-4 gap-2">
        {points.map((point) => (
          <button
            key={point.label}
            type="button"
            className="cursor-pointer rounded-md border px-3 py-2 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={() => onSelect(point)}>
            <span className="block text-xs text-muted-foreground">
              {point.label}
            </span>
            <span className="mt-1 block font-mono text-lg font-semibold">
              {seconds(point.value)}
            </span>
          </button>
        ))}
      </div>
      <div
        role="img"
        aria-label={`0${distribution.unit}부터 ${seconds(max)}까지, P50 ${seconds(value('P50'))}부터 P90 ${seconds(value('P90'))}까지 칠함, P75 ${seconds(value('P75'))}, 평균 ${seconds(value('평균'))}`}
        className="relative mt-6 h-2 rounded-full bg-muted">
        <span
          data-range="p50-p90"
          className="absolute inset-y-0 rounded-full bg-primary"
          style={{
            left: `${at(value('P50'))}%`,
            width: `${at(value('P90')) - at(value('P50'))}%`,
          }}
        />
        <span
          data-marker="P75"
          className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 bg-foreground"
          style={{ left: `${at(value('P75'))}%` }}
        />
        <span
          data-marker="평균"
          className="absolute top-1/2 size-2.5 -translate-1/2 rotate-45 border border-card bg-chart-2"
          style={{ left: `${at(value('평균'))}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-xs text-muted-foreground">
        <span>0{distribution.unit}</span>
        <span>{seconds(max)}</span>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-4 rounded-full bg-primary"
          />
          P50~P90
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-0.5 bg-foreground" />
          P75
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rotate-45 bg-chart-2" />
          평균
        </span>
      </p>
    </div>
  );
}

function SuccessMeters({ distribution, onSelect }: ChartProps) {
  return (
    <div className="mt-5 space-y-5">
      {orderedAiPoints(distribution.points).map((point) => {
        const warning = point.value < 95;

        return (
          <div key={point.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>{point.label}</span>
              <span
                className={
                  warning ? 'font-mono text-warning-foreground' : 'font-mono'
                }>
                {chartNumber(point.value)}%
              </span>
            </div>
            <ChartContainer
              config={{
                value: {
                  label: '성공률',
                  color: aiFeatureColor(point),
                },
              }}
              className="h-8 w-full"
              aria-label={`${point.label} 성공률`}>
              <BarChart
                accessibilityLayer
                data={[point]}
                layout="vertical"
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="label" hide />
                <ChartTooltip
                  isAnimationActive={false}
                  content={<DistributionTooltip unit="%" />}
                />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  background={{ fill: 'var(--muted)' }}
                  barSize={12}
                  radius={6}
                  isAnimationActive={false}
                  onClick={() => onSelect(point)}
                  className="cursor-pointer"
                />
              </BarChart>
            </ChartContainer>
            {warning ? (
              <p className="text-xs text-warning-foreground">
                <span aria-hidden="true">⚠</span> 성공률 95% 미만, 확인이
                필요합니다.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Histogram({ distribution, onSelect }: ChartProps) {
  return (
    <ChartContainer
      config={{ value: { label: distribution.unit, color: 'var(--primary)' } }}
      className="mt-5 h-[220px] w-full"
      aria-label={distribution.title}>
      <BarChart
        accessibilityLayer
        data={distribution.points}
        barCategoryGap="5%">
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={10}
        />
        <YAxis width={40} tickLine={false} axisLine={false} />
        <ChartTooltip
          isAnimationActive={false}
          content={<DistributionTooltip unit={distribution.unit} />}
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[3, 3, 0, 0]}
          isAnimationActive={false}
          className="cursor-pointer"
          onClick={(_data, index) => onSelect(distribution.points[index])}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function DistributionChart(props: ChartProps) {
  switch (props.distribution.chartId) {
    case 'genre-depth':
      return <GenreBars {...props} />;
    case 'ai-latency':
      return <HorizontalBars {...props} />;
    case 'started-as':
      return <StartedAsDonut {...props} />;
    case 'first-message':
      return <FirstMessageStats {...props} />;
    case 'ai-success':
      return <SuccessMeters {...props} />;

    default:
      return <Histogram {...props} />;
  }
}
