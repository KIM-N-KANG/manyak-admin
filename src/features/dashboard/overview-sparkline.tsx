import { chartDates } from '@/features/analytics/range';

import type { DateRange } from './date-range';

export type TrendPoint = { date: string; value: number | null };

export function trendSeries(
  points: TrendPoint[],
  range: DateRange,
  pending: string[] = [],
): TrendPoint[] {
  const values = new Map(points.map((point) => [point.date, point.value]));
  const missing = new Set(pending);

  return chartDates(range.from, range.to).map((date) => ({
    date,
    value: missing.has(date) ? null : (values.get(date) ?? null),
  }));
}

export function Sparkline({ trend }: { trend?: TrendPoint[] }) {
  const points = [...(trend ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const values = points.flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  let path = '';

  if (values.length >= 2) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const start = Date.parse(points[0].date);
    const span = Date.parse(points.at(-1)!.date) - start || 1;
    let previous: number | null = null;

    for (const point of points) {
      const time = Date.parse(point.date);

      if (point.value === null) {
        previous = null;

        continue;
      }

      const x = 2 + ((time - start) / span) * 96;
      const y =
        max === min ? 32 : 62 - ((point.value - min) / (max - min)) * 60;

      path += `${previous === null || time - previous > 86400000 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)} `;
      previous = time;
    }
  }

  return (
    <div
      data-overview-trend=""
      aria-hidden="true"
      className="pointer-events-none relative col-start-2 row-start-1 row-end-4 min-h-0 min-w-0 self-stretch">
      {path ? (
        <svg
          viewBox="0 0 100 64"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
          className="absolute inset-0 h-full w-full">
          <path
            d={path.trim()}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}
    </div>
  );
}
