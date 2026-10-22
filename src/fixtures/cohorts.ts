import { aiCalls } from '@/fixtures/entities';
import { inPeriod, periodFor } from '@/fixtures/query';

export const turnBounds = [
  [0, 0],
  [1, 1],
  [2, 2],
  [3, 4],
  [5, 6],
  [7, 9],
  [10, 14],
  [15, 19],
  [20, 29],
  [30, 49],
  [50, Infinity],
];
export function chatBucket(count: number) {
  return count <= 0
    ? null
    : count === 1
      ? 0
      : count === 2
        ? 1
        : count <= 4
          ? 2
          : count <= 9
            ? 3
            : 4;
}
export function selectAiCalls(query: URLSearchParams) {
  const period = periodFor(query, 'ai');

  return aiCalls.filter(
    (call) =>
      inPeriod(call.createdAt, period) &&
      (!query.get('aiFeature') || call.feature === query.get('aiFeature')) &&
      (!query.get('aiStatus') ||
        (query.get('aiStatus') === 'FINISHED'
          ? call.status !== 'STARTED'
          : call.status === query.get('aiStatus'))) &&
      (!query.has('hasLatency') ||
        (call.latencySeconds !== null) ===
          (query.get('hasLatency') === 'true')),
  );
}
export function hasAiFilters(query: URLSearchParams) {
  return ['aiFrom', 'aiTo', 'aiStatus', 'hasLatency', 'aiFeature'].some((key) =>
    query.has(key),
  );
}
