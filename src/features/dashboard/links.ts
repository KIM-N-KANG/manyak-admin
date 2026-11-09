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
  const query = new URLSearchParams(link.params);

  // 분포는 미삭제 채팅만 세므로 기본이 삭제 포함인 목록에 제외를 명시한다.
  if (link.list !== 'members') query.set('deleted', 'exclude');

  return `/${link.list}?${query}`;
}
