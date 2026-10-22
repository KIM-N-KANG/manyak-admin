import type { DashboardAnalytics } from '@/features/dashboard/types';

const daily: DashboardAnalytics['daily'] = Array.from(
  { length: 90 },
  (_, index) => ({
    date: new Date(Date.UTC(2026, 6, 24 + index)).toISOString().slice(0, 10),
    activeUsers: 280 + ((index * 29) % 240),
    newUsers: 24 + ((index * 7) % 45),
  }),
);

export function getDashboardAnalytics(days: number): DashboardAnalytics {
  const selected = daily.slice(-days);

  return {
    asOf: '2026-10-21T08:55:00Z',
    from: selected[0].date,
    to: selected[selected.length - 1].date,
    todayActiveUsers: daily[daily.length - 1].activeUsers,
    daily: selected,
  };
}
