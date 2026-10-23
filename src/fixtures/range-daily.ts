import type { DateRange } from '@/features/dashboard/date-range';

export function rangeDaily<T extends { date: string }>(
  daily: T[],
  range: DateRange,
  empty: Omit<T, 'date'>,
): T[] {
  const byDate = new Map(daily.map((day) => [day.date, day]));
  const count = (Date.parse(range.to) - Date.parse(range.from)) / 86400000 + 1;

  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.parse(range.from) + i * 86400000)
      .toISOString()
      .slice(0, 10);

    return byDate.get(date) ?? ({ ...empty, date } as T);
  });
}
