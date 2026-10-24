// @vitest-environment jsdom
import { createElement, type PropsWithChildren } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { AnalyticsSection } from '@/features/dashboard/analytics-section';
import type { DashboardAnalytics } from '@/features/dashboard/types';
import { getDashboardAnalytics } from '@/fixtures/analytics';

vi.mock('recharts', () => {
  const Container = ({ children }: PropsWithChildren) =>
    createElement('div', null, children);

  return {
    LineChart: ({ children, data }: PropsWithChildren<{ data: unknown }>) =>
      createElement(
        'div',
        { 'data-trend-rows': JSON.stringify(data) },
        children,
      ),
    Line: Container,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    LabelList: () => null,
  };
});
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: PropsWithChildren) =>
    createElement('div', null, children),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
  ChartLegend: () => null,
  ChartLegendContent: () => null,
}));

const clients: QueryClient[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T10:00:00Z'));
});

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function draw(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock);

  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
    },
  });

  clients.push(client);

  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AnalyticsSection),
    ),
  );
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1);
  });
}

it('서버 합계를 크게 표시하고 Web·Android를 더해 합계를 재계산하지 않는다', async () => {
  const data: DashboardAnalytics = {
    ...getDashboardAnalytics(7),
    todayActiveUsers: { total: 203, web: 186, android: 19 },
  };

  draw(vi.fn().mockResolvedValue(Response.json(data)));

  const heading = await screen.findByRole('heading', {
    name: '오늘 활성 사용자',
  });
  const card = within(heading.closest('[role=region]')!);

  await card.findByText('203');

  expect(card.getByText('203').closest('dd')!.className).toContain('text-3xl');
  expect(card.getByText('186')).toBeTruthy();
  expect(card.getByText('19')).toBeTruthy();
  expect(card.queryByText('205')).toBeNull();
  expect(card.getByText('웹')).toBeTruthy();
  expect(card.getByText('앱')).toBeTruthy();
  act(() =>
    screen.getByRole('button', { name: 'Amplitude 출처와 집계 안내' }).focus(),
  );

  const tooltip = (await screen.findByRole('tooltip')).textContent!;

  expect(tooltip).toContain(
    '국가가 한국이거나 국가 정보가 없는 사용자를 집계하고 앱은 그 밖 국가에서 로그인한 사용자도 더합니다.',
  );
  expect(tooltip).toContain(
    '같은 날 웹과 앱, 또는 국내와 해외에서 앱을 쓴 사람은 두 번 셉니다.',
  );
  expect(tooltip).not.toContain('국가와 무관');
  expect(screen.queryByText('[object Object]')).toBeNull();
});
it('준비된 0은 준비 중이 아니라 0으로 표시한다', async () => {
  const data = {
    ...getDashboardAnalytics(7),
    todayActiveUsers: { total: 0, web: 0, android: 0 },
  };

  draw(vi.fn().mockResolvedValue(Response.json(data)));

  const heading = await screen.findByRole('heading', {
    name: '오늘 활성 사용자',
  });

  await waitFor(() =>
    expect(
      within(heading.closest('[role=region]')!).getAllByText('0', {
        selector: 'span',
      }),
    ).toHaveLength(3),
  );
  expect(
    within(heading.closest('[role=region]')!).queryByText('준비 중'),
  ).toBeNull();
});
it('오늘 null은 가짜 0 없이 준비 중으로 표시하고 개요 차트는 만들지 않는다', async () => {
  const data = {
    ...getDashboardAnalytics(7),
    todayActiveUsers: null,
    pendingDates: ['2026-10-18'],
  };
  const view = draw(vi.fn().mockResolvedValue(Response.json(data)));

  await waitFor(() => expect(screen.getAllByText('준비 중')).toHaveLength(3));
  expect(view.container.querySelector('[data-trend-rows]')).toBeNull();
  expect(screen.queryByRole('table')).toBeNull();
});
it.each([{ pendingDates: [] as string[] }, { pendingDates: ['2026-10-18'] }])(
  '오늘 null 또는 준비 중 날짜 $pendingDates이면 60초 뒤 같은 범위를 재요청하고 준비되면 멈춘다',
  async ({ pendingDates }) => {
    vi.useRealTimers();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T10:00:00Z'));

    const ready = getDashboardAnalytics(7);
    const pending = {
      ...ready,
      todayActiveUsers: null,
      pendingDates,
      daily: ready.daily.filter((day) => !pendingDates.includes(day.date)),
    };
    const fetchMock = vi
      .fn()
      .mockImplementation(async () =>
        Response.json(fetchMock.mock.calls.length === 1 ? pending : ready),
      );

    draw(fetchMock);
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(59998);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      fetchMock.mock.calls.every(
        ([url]) =>
          url === '/api/dashboard/analytics?from=2026-10-21&to=2026-10-21',
      ),
    ).toBe(true);
    expect(screen.queryByText(/60초 뒤 다시/)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  },
);
