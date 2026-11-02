// @vitest-environment jsdom
import type * as React from 'react';
import { createElement, type PropsWithChildren } from 'react';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { getDashboardCharts, summary } from '@/fixtures/dashboard';
import { playInstalls } from '@/fixtures/play-installs';

const nav = vi.hoisted(() => ({ search: '', push: vi.fn(), replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
}));

const data = getDashboardCharts({ from: '2026-10-19', to: '2026-10-21' });

data.daily = data.daily.map((day, i) => ({
  ...day,
  joined: i + 1,
  spent: [100, 300, 1100][i],
}));
vi.mock('@/features/shared/use-api', () => ({
  useApi: (url: string) => ({
    data: url.includes('/charts')
      ? data
      : url.includes('/summary')
        ? summary
        : url.includes('/play-installs')
          ? playInstalls
          : {
              todayActiveUsers: null,
              asOf: '2026-10-21T00:00:00Z',
              pendingDates: [],
              daily: [],
            },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('recharts', async () => {
  const react = await vi.importActual<typeof React>('react');
  const Rows = react.createContext<Record<string, number | string>[]>([]);

  return {
    LineChart: ({
      data,
      children,
      onClick,
    }: PropsWithChildren<{
      data: Record<string, number | string>[];
      onClick: (state: { activeTooltipIndex: number }) => void;
    }>) =>
      react.createElement(
        Rows,
        { value: data },
        react.createElement(
          'div',
          null,
          children,
          data.map((row, i) =>
            react.createElement('button', {
              key: row.date,
              type: 'button',
              'aria-label': `${row.date} 점`,
              onClick: () => onClick({ activeTooltipIndex: i }),
            }),
          ),
        ),
      ),
    Line: ({ dataKey }: { dataKey: string }) => {
      const rows = react.useContext(Rows);

      return react.createElement('span', {
        'data-line-key': dataKey,
        'data-values': JSON.stringify(rows.map((row) => row[dataKey])),
      });
    },
    ReferenceLine: ({ y }: { y: number }) =>
      react.createElement('span', { 'data-average': y }),
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({
    children,
    config,
    ...props
  }: PropsWithChildren<{ config: unknown }>) =>
    createElement(
      'div',
      { ...props, 'data-config': JSON.stringify(config) },
      children,
    ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T03:00:00Z'));
  nav.search = 'from=2026-10-19&to=2026-10-21';
  nav.push.mockReset();
  nav.replace.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('metric=spent URL로 재렌더링하면 유일한 선·값·단위·평균과 점 이동이 함께 바뀐다', () => {
  const initialSearch = nav.search;
  const view = render(createElement(DashboardScreen));

  expect(
    view.container
      .querySelector('[data-line-key]')
      ?.getAttribute('data-line-key'),
  ).toBe('joined');
  fireEvent.change(screen.getByRole('combobox', { name: '지표' }), {
    target: { value: 'spent' },
  });
  expect(nav.push).toHaveBeenLastCalledWith(
    `/dashboard?${initialSearch}&metric=spent`,
    { scroll: false },
  );
  nav.search = `${initialSearch}&metric=spent`;
  view.rerender(createElement(DashboardScreen));

  const chart = screen.getByLabelText('이프 소모 일별 추이');
  const lines = view.container.querySelectorAll('[data-line-key]');

  expect(lines).toHaveLength(1);
  expect(lines[0].getAttribute('data-line-key')).toBe('spent');
  expect(JSON.parse(lines[0].getAttribute('data-values')!)).toEqual([
    100, 300, 1100,
  ]);
  expect(
    chart.querySelector('[data-average]')?.getAttribute('data-average'),
  ).toBe('500');
  expect(screen.getByText('기간 평균 500이프')).toBeTruthy();
  expect(screen.queryByLabelText('가입 일별 추이')).toBeNull();
  fireEvent.click(within(chart).getByRole('button', { name: '2026-10-19 점' }));
  expect(nav.push).toHaveBeenLastCalledWith(
    '/credits/transactions?direction=spent&date=2026-10-19',
  );

  fireEvent.click(screen.getByRole('button', { name: /^기간:/ }));
  fireEvent.click(screen.getByRole('button', { name: '최근 7일' }));
  expect(nav.push).toHaveBeenLastCalledWith(
    '/dashboard?metric=spent&range=last7d',
    { scroll: false },
  );

  nav.search = initialSearch;
  view.rerender(createElement(DashboardScreen));
  expect(view.container.querySelectorAll('[data-line-key]')).toHaveLength(1);
  expect(
    view.container
      .querySelector('[data-line-key]')
      ?.getAttribute('data-line-key'),
  ).toBe('joined');
  expect(screen.getByText('기간 평균 2명')).toBeTruthy();
});
