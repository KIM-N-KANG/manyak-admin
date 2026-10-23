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
  Scatter,
  ScatterChart,
  type ScatterShapeProps,
  XAxis,
  YAxis,
} from 'recharts';

import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
} from '@/components/ui/chart';
import {
  aiFeatureColor,
  chartNumber,
  distributionNumber,
  genreDepthTitle,
  MIN_GENRE_CHATS,
  orderedAiPoints,
  rankedPoints,
} from '@/features/dashboard/chart-data';
import type { ChartPoint, Distribution } from '@/features/dashboard/types';

import { ChartEndLabels } from './chart-end-labels';

type ChartProps = {
  distribution: Distribution;
  onSelect: (point: ChartPoint) => void;
};

function DistributionTooltip({
  active,
  payload,
  unit,
  genre = false,
}: {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  unit: string;
  genre?: boolean;
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
    <ChartContainer
      config={{ value: { label: '비율', color: 'var(--primary)' } }}
      className="mt-5 h-[260px] w-full"
      aria-label={distribution.title}>
      <PieChart accessibilityLayer>
        <ChartTooltip
          isAnimationActive={false}
          content={<DistributionTooltip unit="%" />}
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
        <ChartLegend
          formatter={(value) => (
            <span className="text-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ChartContainer>
  );
}

function FirstMessagePlot({ distribution, onSelect }: ChartProps) {
  const percentiles = ['P50', 'P75', 'P90'].flatMap((label) =>
    distribution.points
      .filter((point) => point.label === label)
      .map((point) => ({ ...point, position: 1 })),
  );
  const means = distribution.points
    .filter((point) => point.label === '평균')
    .map((point) => ({ ...point, position: 1 }));

  function percentileShape({ cx, cy, index }: ScatterShapeProps) {
    const point = percentiles[index];

    if (cx === undefined || cy === undefined || !point) return <g />;

    return <circle cx={cx} cy={cy} r={5} fill="var(--primary)" />;
  }

  return (
    <ChartContainer
      config={{
        percentiles: { label: '백분위', color: 'var(--primary)' },
        mean: { label: '평균', color: 'var(--chart-2)' },
      }}
      className="mt-5 h-[220px] w-full"
      aria-label={distribution.title}>
      <ScatterChart
        accessibilityLayer
        margin={{ top: 48, right: 48, bottom: 20, left: 24 }}>
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          dataKey="value"
          domain={[0, 'auto']}
          name="시간"
          unit="초"
          tickLine={false}
          axisLine={false}
        />
        <YAxis type="number" dataKey="position" domain={[0, 2]} hide />
        <ChartTooltip
          isAnimationActive={false}
          content={<DistributionTooltip unit={distribution.unit} />}
        />
        <Scatter
          name="백분위"
          data={percentiles}
          line={{ stroke: 'var(--primary)' }}
          fill="var(--primary)"
          shape={percentileShape}
          isAnimationActive={false}
          onClick={(_data, index) => onSelect(percentiles[index])}
          className="cursor-pointer"
        />
        <Scatter
          name="평균"
          legendType="diamond"
          data={means}
          fill="var(--chart-2)"
          shape="diamond"
          isAnimationActive={false}
          onClick={(_data, index) => onSelect(means[index])}
          className="cursor-pointer"
        />
        <ChartEndLabels
          labels={[...percentiles, ...means].map((point, index) => ({
            id: point.label,
            x: point.value,
            y: 1,
            centered: true,
            offsetY: index < percentiles.length ? -20 - index * 18 : 24,
            text: `${point.label} ${chartNumber(point.value)}초`,
          }))}
        />
        <ChartLegend
          formatter={(value) => (
            <span className="text-foreground">{value}</span>
          )}
        />
      </ScatterChart>
    </ChartContainer>
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
      return <FirstMessagePlot {...props} />;
    case 'ai-success':
      return <SuccessMeters {...props} />;

    default:
      return <Histogram {...props} />;
  }
}
