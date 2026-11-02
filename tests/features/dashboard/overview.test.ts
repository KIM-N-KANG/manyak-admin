// @vitest-environment jsdom
import { createElement } from 'react';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import {
  getDashboardCharts,
  summary as dashboardSummary,
} from '@/fixtures/dashboard';
import { playInstalls } from '@/fixtures/play-installs';

const nav = vi.hoisted(() => ({ search: '', push: vi.fn(), replace: vi.fn() }));
const state = vi.hoisted(() => ({
  charts: undefined as unknown,
  error: false,
  requests: [] as string[],
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
}));
vi.mock('@/features/shared/use-api', () => ({
  useApi: (url: string) => {
    state.requests.push(url);

    const data = url.startsWith('/api/dashboard/charts')
      ? state.charts
      : url === '/api/dashboard/summary'
        ? dashboardSummary
        : url.includes('/play-installs')
          ? playInstalls
          : {
              asOf: '2026-10-25T00:00:00Z',
              todayActiveUsers: { total: 220, web: 200, android: 20 },
              pendingDates: [],
              daily: [
                {
                  date: '2026-10-24',
                  activeUsers: { total: 200, web: 180, android: 20 },
                },
              ],
            };

    return {
      data: state.error && url.includes('/charts') ? undefined : data,
      isPending: false,
      isError: state.error && url.includes('/charts'),
      error:
        state.error && url.includes('/charts') ? new Error('failed') : null,
      refetch: vi.fn(),
    };
  },
}));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-25T03:00:00Z'));
  nav.search = '';
  state.error = false;
  state.requests = [];

  const charts = getDashboardCharts({ from: '2026-09-26', to: '2026-10-25' });

  state.charts = {
    ...charts,
    totals: { joined: 71, chats: 12, turns: 500, revenue: 9600 },
    previous: {
      from: '2026-08-27',
      to: '2026-09-25',
      totals: { joined: 58, chats: 0, turns: 500, revenue: 19200 },
    },
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});
it('개요는 기간 합계와 증감 카드 여섯 개를 3열로 그리고 일별 그래프는 하나만 표시한다', () => {
  render(createElement(DashboardScreen));

  const grid = screen.getByRole('region', { name: '요약 지표' });

  expect(
    within(grid)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href')),
  ).toEqual([
    '/analytics/audience?tab=activity',
    '/members',
    '/chats',
    '/chats?sort=turnCount',
    '/payments',
    '/analytics/inflow?tab=installs',
  ]);
  expect(grid.className).toContain('xl:grid-cols-3');

  const member = within(grid).getByRole('link', { name: /^가입자/ });

  expect(member.textContent).toContain('71명');
  expect(member.textContent).toContain('▲ 22.4%');
  expect(member.textContent).toContain('이전 30일 대비');
  expect(within(grid).getByText('▼ 50.0%')).toBeTruthy();
  expect(within(grid).getByText('비교할 이전 값 없음')).toBeTruthy();
  expect(within(grid).getByText('변동 없음')).toBeTruthy();
  expect(within(grid).getByText('▲ 10.0%')).toBeTruthy();
  expect(screen.getAllByLabelText(/일별 추이$/)).toHaveLength(1);
  expect(
    screen.getByRole('combobox', { name: '지표' }).getAttribute('value') ??
      (screen.getByRole('combobox', { name: '지표' }) as HTMLSelectElement)
        .value,
  ).toBe('joined');
  expect(screen.getAllByRole('columnheader')).toHaveLength(9);
  expect(state.requests).toContain(
    '/api/dashboard/analytics?from=2026-10-24&to=2026-10-25',
  );
});
it('지표 선택은 metric 쿼리를 기록하고 모르는 값은 가입으로 표시한다', () => {
  nav.search = 'range=last7d&metric=unknown';
  render(createElement(DashboardScreen));

  const select = screen.getByRole('combobox', {
    name: '지표',
  }) as HTMLSelectElement;

  expect(select.value).toBe('joined');
  fireEvent.change(select, { target: { value: 'spent' } });
  expect(nav.push).toHaveBeenCalledWith(
    '/dashboard?range=last7d&metric=spent',
    { scroll: false },
  );
});
it('이전 서버 응답에 totals와 previous가 없으면 DB 카드 값과 증감은 준비 중이며 일별 합을 쓰지 않는다', () => {
  state.charts = getDashboardCharts({ from: '2026-09-26', to: '2026-10-25' });
  delete (state.charts as Record<string, unknown>).totals;
  delete (state.charts as Record<string, unknown>).previous;
  render(createElement(DashboardScreen));

  const member = screen.getByRole('link', { name: /^가입자/ });

  expect(member.textContent).toContain('준비 중');
  expect(member.textContent).toContain('오늘');
  expect(member.textContent).toContain('누적');
});
