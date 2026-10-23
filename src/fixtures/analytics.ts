import type { DateRange } from '@/features/dashboard/date-range';
import type { DashboardAnalytics } from '@/features/dashboard/types';
import { rangeDaily } from '@/fixtures/range-daily';

const daily: DashboardAnalytics['daily'] = Array.from(
  { length: 366 },
  (_, index) => ({
    date: new Date(Date.UTC(2025, 9, 21 + index)).toISOString().slice(0, 10),
    activeUsers: 280 + ((index * 29) % 240),
    newUsers: 24 + ((index * 7) % 45),
  }),
);

export function getDashboardAnalytics(
  days: number | DateRange,
): DashboardAnalytics {
  const selected =
    typeof days === 'number'
      ? daily.slice(-days)
      : rangeDaily(daily, days, { activeUsers: 0, newUsers: 0 });

  return {
    asOf: '2026-10-21T08:55:00Z',
    from: typeof days === 'number' ? selected[0].date : days.from,
    to: typeof days === 'number' ? selected[selected.length - 1].date : days.to,
    todayActiveUsers: daily[daily.length - 1].activeUsers,
    daily: selected,
  };
}
