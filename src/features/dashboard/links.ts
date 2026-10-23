import type { ChartLink, MetricKey } from '@/features/dashboard/types';

export const paymentHistoryHref = '/payments';

const metricPaths: Record<MetricKey, string> = {
  joined: '/members',
  chats: '/chats',
  turns: '/chats',
  stories: '/stories',
  granted: '/credits/transactions?direction=granted',
  spent: '/credits/transactions?direction=spent',
  payments: paymentHistoryHref,
  revenue: paymentHistoryHref,
  attendance: '/members',
};

export function getDailyMetricHref(metric: MetricKey, date: string) {
  const [path, search] = metricPaths[metric].split('?');
  const query = new URLSearchParams(search);

  if (metric === 'granted' || metric === 'spent') query.set('date', date);
  else if (metric === 'attendance') query.set('attendanceDate', date);
  else if (metric === 'turns') query.set('turnDate', date);
  else {
    query.set('from', date);
    query.set('to', date);
  }

  return `${path}?${query}`;
}

export function getDistributionHref(link: ChartLink) {
  return `/${link.list}?${new URLSearchParams(link.params)}`;
}
