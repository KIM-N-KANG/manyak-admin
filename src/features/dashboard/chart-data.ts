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

export function aiFeatureLabel(value: string) {
  const labels: Record<string, string> = {
    chat_response: 'AI 응답 생성',
    choice_generation: '선택지 생성',
    storyline_generation: '스토리라인 생성',
    story_completion: '간편 제작',
  };

  return labels[value] ?? value;
}
export function distributionNumber(value: number, unit: string) {
  return value.toLocaleString(
    'ko-KR',
    unit === '%'
      ? { minimumFractionDigits: 1, maximumFractionDigits: 1 }
      : { maximumFractionDigits: 1 },
  );
}
