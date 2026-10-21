// @vitest-environment jsdom

import { createElement, type PropsWithChildren } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as analyticsResponse } from '@/app/api/dashboard/analytics/route';
import { GET as chartsResponse } from '@/app/api/dashboard/charts/route';
import { GET as summaryResponse } from '@/app/api/dashboard/summary/route';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';

const navigation = vi.hoisted(() => ({ search: 'days=7', push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock('recharts', () => {
  const Container = ({ children }: PropsWithChildren) =>
    createElement('div', null, children);

  return {
    AreaChart: Container,
    BarChart: Container,
    Area: () => null,
    Bar: () => null,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: PropsWithChildren) =>
    createElement('div', null, children),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

let client: QueryClient;
let failAnalytics: boolean;
const requested: string[] = [];

beforeEach(() => {
  navigation.search = 'days=7';
  navigation.push.mockReset();
  requested.length = 0;
  failAnalytics = false;
  client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
        throwOnError: false,
      },
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requested.push(url);

      const request = new Request(`http://localhost${url}`);

      if (url.startsWith('/api/dashboard/summary')) return summaryResponse();

      if (url.startsWith('/api/dashboard/charts'))
        return chartsResponse(request);

      if (url.startsWith('/api/dashboard/analytics'))
        return failAnalytics
          ? Response.json({ message: 'Amplitude unavailable' }, { status: 503 })
          : analyticsResponse(request);

      throw new Error(`Unexpected request: ${url}`);
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

function dashboard() {
  return createElement(
    QueryClientProvider,
    { client },
    createElement(DashboardScreen),
  );
}

function expectDbMetricsVisible() {
  expect(screen.getByText('회원', { selector: 'p' })).toBeTruthy();
  expect(screen.getByText('결제 금액', { selector: 'p' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '일별 추이' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '이용 분포' })).toBeTruthy();
}

describe('Amplitude 실패 격리', () => {
  it('503이어도 DB 지표를 유지하고 Amplitude만 재시도해 복구한다', async () => {
    failAnalytics = true;
    render(dashboard());

    const region = screen.getByRole('region', {
      name: 'Amplitude 사용자 지표',
    });
    const alert = await within(region).findByRole('alert');

    expect(alert.textContent).toContain('불러올 수 없음');
    await screen.findByRole('heading', { name: '일별 추이' });
    expectDbMetricsVisible();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(
      within(region).queryByRole('heading', { name: '오늘 활성 사용자' }),
    ).toBeNull();

    const dbRequests = requested.filter((url) => !url.includes('/analytics'));

    failAnalytics = false;
    fireEvent.click(within(region).getByRole('button', { name: '다시 시도' }));
    await within(region).findByRole('heading', { name: '오늘 활성 사용자' });
    expect(within(region).queryByRole('alert')).toBeNull();
    expectDbMetricsVisible();
    expect(requested.filter((url) => url.includes('/analytics'))).toHaveLength(
      2,
    );
    expect(requested.filter((url) => !url.includes('/analytics'))).toEqual(
      dbRequests,
    );
  });

  it('같은 기간 선택으로 DB 추이와 Amplitude 요청을 함께 전환한다', async () => {
    const view = render(dashboard());

    await screen.findByRole('heading', { name: '오늘 활성 사용자' });
    expect(requested).toContain('/api/dashboard/analytics?days=7');
    expect(requested).toContain('/api/dashboard/charts?days=7');
    fireEvent.change(screen.getByRole('combobox', { name: '기간' }), {
      target: { value: '90' },
    });
    expect(navigation.push).toHaveBeenCalledWith('/?days=90');
    navigation.search = 'days=90';
    view.rerender(dashboard());
    await waitFor(() => {
      expect(requested).toContain('/api/dashboard/analytics?days=90');
      expect(requested).toContain('/api/dashboard/charts?days=90');
    });
    await screen.findByRole('heading', { name: '오늘 활성 사용자' });
    expectDbMetricsVisible();
    expect(requested.filter((url) => url.includes('/summary'))).toHaveLength(1);
  });

  it('출처 도움말은 키보드 포커스로 지연·팀 계정 제외 기준을 보여 준다', async () => {
    render(dashboard());
    await screen.findByRole('heading', { name: '오늘 활성 사용자' });

    const button = screen.getByRole('button', {
      name: 'Amplitude 출처와 집계 안내',
    });

    act(() => button.focus());

    const tooltip = await screen.findByRole('tooltip');

    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(tooltip.textContent).toContain('몇 분 늦게');
    expect(tooltip.textContent).toContain('팀 계정을 제외');
  });
});
