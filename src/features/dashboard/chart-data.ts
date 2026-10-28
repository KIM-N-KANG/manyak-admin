import type { ChartPoint, Distribution } from '@/features/dashboard/types';

export const aiFeatures = [
  'chat_response',
  'choice_generation',
  'chat_image',
  'storyline_generation',
  'story_completion',
] as const;
export const MIN_GENRE_CHATS = 5;

export const genreDepthTitle = '장르별 평균 턴 수';

export function rankedPoints(distribution: Distribution): ChartPoint[] {
  if (distribution.chartId === 'genre-depth')
    return distribution.points
      .filter((point) => (point.chats ?? 0) >= MIN_GENRE_CHATS)
      .slice(0, 30);

  const sorted = distribution.points.toSorted(
    (a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ko'),
  );

  return sorted;
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
    chat_image: '실시간 이미지 생성',
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

export function aiFeatureIndex(point: ChartPoint) {
  const feature = point.link.params.aiFeature ?? point.label;
  const index = aiFeatures.findIndex(
    (key) => key === feature || aiFeatureLabel(key) === feature,
  );

  return index < 0 ? aiFeatures.length : index;
}
export function orderedAiPoints(points: ChartPoint[]) {
  return points.toSorted((a, b) => aiFeatureIndex(a) - aiFeatureIndex(b));
}
export function aiFeatureColor(point: ChartPoint) {
  const index = aiFeatureIndex(point);

  return index < aiFeatures.length
    ? `var(--chart-${index + 1})`
    : 'var(--muted-foreground)';
}

const firstMessageLabels = ['평균', 'P50', 'P75', 'P90'];

/** 첫 입력 숫자 칸을 평균, P50, P75, P90 순서로 반환한다. */
export function firstMessagePoints(points: ChartPoint[]) {
  return firstMessageLabels.flatMap((label) =>
    points.filter((point) => point.label === label),
  );
}

const count = (value: number | null | undefined) =>
  value == null ? '—' : value.toLocaleString('ko-KR');

/** 채팅 소유자 줄 문구를 반환한다. */
export function ownerSummary(point: ChartPoint) {
  return `${point.label} ${count(point.users)}명, 채팅 ${count(point.chats)}개`;
}

/** 채팅 소유자 조각 툴팁 문구를 반환한다. */
export function ownerTooltip(point: ChartPoint) {
  return `${point.label} ${distributionNumber(point.value, '%')}%, ${count(point.users)}명, 채팅 ${count(point.chats)}개`;
}
