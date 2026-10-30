// @vitest-environment jsdom
import { createElement, type PropsWithChildren } from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { SessionLengthContent } from '@/features/analytics/session-lengths';
import type { SessionLengthResponse } from '@/features/analytics/types';
import { metricFixture } from '@/fixtures/metrics';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('recharts', () => {
  const Box = ({ children }: PropsWithChildren) =>
    createElement('div', null, children);

  return {
    CartesianGrid: Box,
    Line: Box,
    LineChart: Box,
    Bar: Box,
    BarChart: Box,
    XAxis: () => null,
    YAxis: () => null,
    LabelList: () => null,
  };
});
vi.mock('@/components/ui/chart', () => ({
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
  ChartContainer: ({ children }: PropsWithChildren) =>
    createElement('div', null, children),
}));
afterEach(cleanup);
it('세션 구간 9개는 서버의 순서·합계·중앙값을 쓰고 973개를 42.0%로 보인다', () => {
  const data = metricFixture(
    '/users/session-lengths',
    new URLSearchParams('from=2026-10-20&to=2026-10-21'),
  ) as SessionLengthResponse;

  render(createElement(SessionLengthContent, { data, platform: 'all' }));
  expect(screen.getByText('2,317개')).toBeTruthy();
  expect(screen.getByText('973개 (42.0%)')).toBeTruthy();
  expect(screen.getByText('211개 (9.1%) 중앙값')).toBeTruthy();

  const rows = screen
    .getByText('973개 (42.0%)')
    .closest('table')!
    .querySelectorAll('tbody tr');

  expect(rows).toHaveLength(9);
  expect(rows[0].textContent).toContain('3초 미만');
  expect(rows[8].textContent).toContain('1시간 이상');
});
it('빈 세션은 합계 0과 중앙값·분포의 세션 없음을 보인다', () => {
  const data: SessionLengthResponse = {
    asOf: '',
    from: '2026-10-21',
    to: '2026-10-21',
    segment: 'all',
    pendingDates: [],
    bins: [],
    platforms: [
      { platform: 'all', sessions: [], totalSessions: 0, medianBin: null },
    ],
  };

  render(createElement(SessionLengthContent, { data, platform: 'all' }));
  expect(screen.getByText('0개')).toBeTruthy();
  expect(screen.getAllByText('세션 없음')).toHaveLength(2);
});
