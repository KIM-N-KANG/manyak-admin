import type { ChartPoint, Distribution } from '@/features/dashboard/types';

export const genreDepthTitle = '장르별 평균 턴 수';

export function rankedPoints(distribution: Distribution): ChartPoint[] {
  const sorted = distribution.points.toSorted(
    (a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ko'),
  );

  return distribution.chartId === 'genre-depth' ? sorted.slice(0, 30) : sorted;
}

export function periodAverage(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

export function chartNumber(value: unknown) {
  return typeof value === 'number'
    ? value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
    : String(value ?? '');
}
