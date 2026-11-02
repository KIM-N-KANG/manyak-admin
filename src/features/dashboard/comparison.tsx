import { shiftDate } from '@/features/analytics/range';

import type { DateRange } from './date-range';

export function previousPeriod(range: DateRange) {
  const days = (Date.parse(range.to) - Date.parse(range.from)) / 86400000 + 1;

  return {
    from: shiftDate(range.from, -days),
    to: shiftDate(range.from, -1),
    days,
  };
}

export function changeText(value: number, previous: number) {
  if (previous === 0) return '비교할 이전 값 없음';

  if (value === previous) return '변동 없음';

  return `${value > previous ? '▲' : '▼'} ${Math.abs(((value - previous) / previous) * 100).toFixed(1)}%`;
}

export function Comparison({
  value,
  previous,
  days,
  status,
}: {
  value?: number | null;
  previous?: number | null;
  days: number;
  status?: string;
}) {
  return (
    <span className="inline-flex flex-col text-xs font-normal text-muted-foreground">
      <span>
        {status ??
          (value == null || previous == null
            ? '준비 중'
            : changeText(value, previous))}
      </span>
      <span className="mt-1">이전 {days}일 대비</span>
    </span>
  );
}
