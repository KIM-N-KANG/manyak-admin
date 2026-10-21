import type { MetricKey } from '@/features/dashboard/types';

export const paymentHistoryHref = '/payments';

const metricPaths: Record<MetricKey, string> = {
  joined: '/members',
  chats: '/chats',
  turns: '/chats?sort=turns',
  stories: '/stories',
  granted: '/members?creditDirection=granted',
  spent: '/members?creditDirection=spent&sort=spent',
  payments: paymentHistoryHref,
  revenue: paymentHistoryHref,
  attendance: '/members',
};

export function getDailyMetricHref(metric: MetricKey, date: string) {
  const [path, search] = metricPaths[metric].split('?');
  const query = new URLSearchParams(search);

  if (metric === 'granted' || metric === 'spent') query.set('creditDate', date);
  else if (metric === 'attendance') query.set('attendanceDate', date);
  else if (metric === 'turns') query.set('turnDate', date);
  else {
    query.set('from', date);
    query.set('to', date);
  }

  return `${path}?${query}`;
}
