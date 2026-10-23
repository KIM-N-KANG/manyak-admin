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
import { GET as playResponse } from '@/app/api/dashboard/play-installs/route';
import { GET as summaryResponse } from '@/app/api/dashboard/summary/route';
import { DashboardAnalysisScreen } from '@/features/dashboard/analysis-screen';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { getDistributionHref } from '@/features/dashboard/links';
import type { ChartLink } from '@/features/dashboard/types';

const navigation = vi.hoisted(() => ({
  pathname: '/dashboard',
  search: 'range=last7d',
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));
vi.mock('recharts', () => {
  const Container = ({ children }: PropsWithChildren) =>
    createElement('div', null, children);

  return {
    AreaChart: Container,
    LineChart: Container,
    PieChart: Container,
    ScatterChart: Container,
    BarChart: Container,
    Area: () => null,
    Line: Container,
    Pie: Container,
    Scatter: Container,
    Label: () => null,
    LabelList: () => null,
    ReferenceLine: () => null,
    Bar: () => null,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: PropsWithChildren) =>
    createElement('div', null, children),
  ChartLegend: () => null,
  ChartLegendContent: () => null,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

let client: QueryClient;
let failAnalytics: boolean;
let failPlay: boolean;
const requested: string[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T10:00:00Z'));
  navigation.pathname = '/dashboard';
  navigation.search = 'range=last7d';
  navigation.push.mockReset();
  requested.length = 0;
  failAnalytics = false;
  failPlay = false;
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

      if (url.startsWith('/api/dashboard/play-installs'))
        return failPlay
          ? Response.json({ code: 'SERVICE_UNAVAILABLE' }, { status: 503 })
          : playResponse();

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
  vi.useRealTimers();
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
  expect(screen.queryByRole('heading', { name: '이용 분포' })).toBeNull();
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
    expect(requested).toContain(
      '/api/dashboard/analytics?from=2026-10-15&to=2026-10-21',
    );
    expect(requested).toContain(
      '/api/dashboard/charts?from=2026-10-15&to=2026-10-21',
    );

    const memberCard = screen.getByRole('link', { name: /^회원/ });
    const headline = memberCard.querySelector('dl')!.textContent;
    const sevenDays = await chartsResponse(
      new Request(
        'http://localhost/api/dashboard/charts?from=2026-10-15&to=2026-10-21',
      ),
    ).json();
    const sevenTotal = sevenDays.daily.reduce(
      (sum: number, day: { joined: number }) => sum + day.joined,
      0,
    );

    await within(memberCard).findByText(
      new RegExp(`최근 7일 합계 ${sevenTotal.toLocaleString('ko-KR')}명`),
    );

    fireEvent.click(screen.getByRole('button', { name: '기간: 최근 7일' }));
    fireEvent.click(screen.getByRole('button', { name: '최근 90일' }));
    expect(navigation.push).toHaveBeenCalledWith('/dashboard?range=last90d', {
      scroll: false,
    });
    navigation.search = 'range=last90d';
    view.rerender(dashboard());
    await waitFor(() => {
      expect(requested).toContain(
        '/api/dashboard/analytics?from=2026-07-24&to=2026-10-21',
      );
      expect(requested).toContain(
        '/api/dashboard/charts?from=2026-07-24&to=2026-10-21',
      );
    });
    await screen.findByRole('heading', { name: '오늘 활성 사용자' });
    expectDbMetricsVisible();
    expect(requested.filter((url) => url.includes('/summary'))).toHaveLength(1);

    const ninetyDays = await chartsResponse(
      new Request(
        'http://localhost/api/dashboard/charts?from=2026-07-24&to=2026-10-21',
      ),
    ).json();
    const ninetyTotal = ninetyDays.daily.reduce(
      (sum: number, day: { joined: number }) => sum + day.joined,
      0,
    );
    const updatedCard = screen.getByRole('link', { name: /^회원/ });

    await within(updatedCard).findByText(
      new RegExp(`최근 90일 합계 ${ninetyTotal.toLocaleString('ko-KR')}명`),
    );
    expect(updatedCard.querySelector('dl')!.textContent).toBe(headline);
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

describe('개요와 분석 화면 분리', () => {
  it('분석은 분포 8종과 기존 목록 링크만 표시하고 개요·Amplitude 요청은 하지 않는다', async () => {
    navigation.pathname = '/dashboard/analytics';

    const view = render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(DashboardAnalysisScreen),
      ),
    );

    await screen.findByRole('heading', { name: '이용 분포' });
    expect(
      screen.getByRole('heading', { name: '분석', level: 1 }),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '일별 추이' })).toBeNull();
    expect(
      screen.queryByRole('region', { name: 'Amplitude 사용자 지표' }),
    ).toBeNull();
    expect(screen.getAllByText('수치 및 관련 목록')).toHaveLength(8);
    expect(requested).toEqual([
      '/api/dashboard/charts?from=2026-10-15&to=2026-10-21',
    ]);

    const data = await chartsResponse(
      new Request(
        'http://localhost/api/dashboard/charts?from=2026-10-15&to=2026-10-21',
      ),
    ).json();
    const links = Array.from(view.container.querySelectorAll('a')).map((link) =>
      link.getAttribute('href'),
    );

    expect(links).toEqual(
      data.distributions.flatMap(
        (distribution: { points: { link: ChartLink }[] }) =>
          distribution.points.map((point) => getDistributionHref(point.link)),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: '기간: 최근 7일' }));
    fireEvent.click(screen.getByRole('button', { name: '최근 90일' }));
    expect(navigation.push).toHaveBeenCalledWith(
      '/dashboard/analytics?range=last90d',
      { scroll: false },
    );
    navigation.search = 'range=last90d';
    view.rerender(
      createElement(
        QueryClientProvider,
        { client },
        createElement(DashboardAnalysisScreen),
      ),
    );
    await waitFor(() =>
      expect(requested).toContain(
        '/api/dashboard/charts?from=2026-07-24&to=2026-10-21',
      ),
    );
    expect(
      requested.some(
        (url) => url.includes('/summary') || url.includes('/analytics'),
      ),
    ).toBe(false);
  });

  it('개요의 지표 전환은 새 경로와 기간을 유지하고 일별 목록 이동을 보존한다', async () => {
    const view = render(dashboard());

    await screen.findByRole('heading', { name: '일별 추이' });
    expect(
      screen.getByRole('heading', { name: '개요', level: 1 }),
    ).toBeTruthy();

    for (const [label, direction] of [
      ['이프 지급', 'granted'],
      ['이프 소진', 'spent'],
    ]) {
      expect(
        screen
          .getByRole('link', { name: new RegExp(`^${label}`) })
          .getAttribute('href'),
      ).toBe(`/credits/transactions?direction=${direction}`);
    }

    fireEvent.change(screen.getByRole('combobox', { name: '지표' }), {
      target: { value: 'spent' },
    });
    expect(navigation.push).toHaveBeenCalledWith(
      '/dashboard?range=last7d&metric=spent',
    );
    navigation.search = 'range=last7d&metric=spent';
    view.rerender(dashboard());

    const links = Array.from(view.container.querySelectorAll('a')).map((link) =>
      link.getAttribute('href'),
    );

    expect(
      links.some(
        (href) =>
          href?.startsWith('/credits/transactions?direction=spent') &&
          href.includes('date='),
      ),
    ).toBe(true);
    expectDbMetricsVisible();
  });
});

it('직접 날짜를 적용하고 Esc로 닫으면 기간 버튼에 포커스가 돌아온다', async () => {
  render(dashboard());
  await screen.findByRole('heading', { name: '일별 추이' });

  const trigger = screen.getByRole('button', { name: '기간: 최근 7일' });

  fireEvent.click(trigger);

  for (const [from, to, message] of [
    ['', '2026-10-10', '시작 날짜와 끝 날짜를 올바르게 입력해 주세요.'],
    [
      '2026-10-11',
      '2026-10-10',
      '끝 날짜는 시작 날짜와 같거나 이후로 선택해 주세요.',
    ],
    [
      '2026-10-01',
      '2026-10-22',
      '끝 날짜는 오늘 또는 이전 날짜로 선택해 주세요.',
    ],
    [
      '2025-10-20',
      '2026-10-21',
      '시작 날짜와 끝 날짜를 포함해 366일 이내로 선택해 주세요.',
    ],
  ]) {
    fireEvent.change(screen.getByLabelText('시작 날짜'), {
      target: { value: from },
    });
    fireEvent.change(screen.getByLabelText('끝 날짜'), {
      target: { value: to },
    });
    expect(screen.getByRole('alert').textContent).toBe(message);
    expect(
      screen.getByRole('button', { name: '적용' }).hasAttribute('disabled'),
    ).toBe(true);
  }

  fireEvent.change(screen.getByLabelText('시작 날짜'), {
    target: { value: '2026-10-01' },
  });
  fireEvent.change(screen.getByLabelText('끝 날짜'), {
    target: { value: '2026-10-10' },
  });
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '적용' }));
  expect(navigation.push).toHaveBeenCalledWith(
    '/dashboard?from=2026-10-01&to=2026-10-10',
    { scroll: false },
  );
  await waitFor(() =>
    expect(trigger.getAttribute('aria-expanded')).toBe('false'),
  );
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByLabelText('시작 날짜'), { key: 'Escape' });
  await waitFor(() =>
    expect(trigger.getAttribute('aria-expanded')).toBe('false'),
  );
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
it('기존 days URL은 다른 쿼리를 유지하며 상대 범위로 교체한다', () => {
  navigation.search = 'days=7&metric=spent';
  render(dashboard());
  expect(navigation.replace).toHaveBeenCalledWith(
    '/dashboard?metric=spent&range=last7d',
    { scroll: false },
  );
});

it('Play 503은 설치 카드에만 설치 지표 사용 불가를 표시하고 DB·Amplitude를 유지한다', async () => {
  failPlay = true;
  render(dashboard());
  await screen.findByText('설치 지표 사용 불가');
  await screen.findByRole('heading', { name: '오늘 활성 사용자' });
  await screen.findByRole('heading', { name: '일별 추이' });
  expectDbMetricsVisible();
  expect(
    screen.getByRole('region', { name: '앱 설치(Android)' }).textContent,
  ).toContain('설치 지표 사용 불가');
});
