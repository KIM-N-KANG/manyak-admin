// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { CreditTransactionsScreen } from '@/features/credits/credit-transactions-screen';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { SubmissionsScreen } from '@/features/moderation/submissions-screen';
import { summary } from '@/fixtures/dashboard';
import { playInstalls } from '@/fixtures/play-installs';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('days=7'),
}));
vi.mock('recharts', () => {
  const box = ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children);

  return {
    usePlotArea: () => undefined,
    useXAxisScale: () => undefined,
    useYAxisScale: () => undefined,
    LineChart: box,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    ReferenceLine: () => null,
  };
});
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

let client: QueryClient;
let chartsDelay = 1000;
let summaryDelay = 1000;

beforeEach(() => {
  vi.useFakeTimers();
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false },
    },
  });
  chartsDelay = 1000;
  summaryDelay = 1000;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const data = url.includes('/summary')
        ? summary
        : url.includes('/analytics')
          ? {
              asOf: '2026-10-24T03:00:00Z',
              pendingDates: [],
              todayActiveUsers: { total: 10, web: 6, android: 4 },
              daily: [],
            }
          : url.includes('play-installs')
            ? playInstalls
            : {
                from: '2026-10-18',
                to: '2026-10-24',
                daily: [],
                distributions: [],
              };

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          url.includes('/charts') ? chartsDelay : summaryDelay,
        ),
      );

      return Response.json(data);
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const tick = async (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

function draw(
  component:
    | typeof DashboardScreen
    | typeof CreditTransactionsScreen
    | typeof SubmissionsScreen,
) {
  return render(
    createElement(QueryClientProvider, { client }, createElement(component)),
  );
}

it('1초 응답 동안 개요의 10개 카드와 8개 추이를 같은 칸에 예약하고 값으로 교체한다', async () => {
  draw(DashboardScreen);

  const grid = screen.getByRole('region', { name: '요약 지표' });
  const dbSkeletons = Array.from(grid.children).slice(1, 9) as HTMLElement[];

  expect(grid.children).toHaveLength(10);
  expect(grid.children[0].getAttribute('aria-label')).toBe('오늘 활성 사용자');
  expect(grid.children[9].getAttribute('aria-label')).toBe('앱 설치(Android)');

  for (const card of dbSkeletons)
    expect(card.getAttribute('data-loading-layout')).toBe('summary-card');

  await tick(199);

  for (const card of dbSkeletons) expect(card.style.visibility).toBe('hidden');

  await tick(1);

  for (const card of dbSkeletons) expect(card.style.visibility).toBe('visible');

  for (const card of grid.children)
    expect(card.querySelector('[data-slot="skeleton"]')).toBeTruthy();

  const charts = document.querySelector('[data-loading-layout="charts"]')!;

  expect(charts.children).toHaveLength(8);
  await tick(802);
  expect(grid.children).toHaveLength(10);
  expect(grid.getAttribute('aria-busy')).toBe('false');
  expect(grid.querySelector('[data-slot="skeleton"]')).toBeNull();
  expect(
    Array.from(grid.children).map(
      (card) => card.querySelector('h3, p')?.textContent,
    ),
  ).toEqual([
    '오늘 활성 사용자',
    '가입자',
    '채팅 시작',
    '턴',
    '스토리',
    '이프 적립',
    '이프 소모',
    '결제 건수',
    '결제 금액 (환불 포함)',
    '앱 설치(Android)',
  ]);
});
it('요약이 먼저 오면 누적·오늘을 유지하고 기간 합계 줄 높이만 예약한다', async () => {
  summaryDelay = 100;
  draw(DashboardScreen);
  await tick(250);

  const card = screen.getByRole('link', { name: /^가입자/ });

  expect(within(card).getByText('누적')).toBeTruthy();
  expect(within(card).getByText('오늘')).toBeTruthy();

  const skeleton = card.querySelector('[data-slot="skeleton"]')!;

  expect(skeleton.className).toContain('h-5');
  expect(within(card).getByText('데이터를 불러오는 중입니다…').className).toBe(
    'sr-only',
  );
});
it.each([
  ['이프 내역', CreditTransactionsScreen, 4],
  ['검수 제출', SubmissionsScreen, 11],
] as const)(
  '%s 로딩은 머리 행과 본문 10행·실제 열 수를 예약한다',
  async (_name, component, columns) => {
    draw(component);
    await tick(201);

    const table = document.querySelector(
      '[data-loading-layout="table"] > div > div',
    )!;

    expect(table.children).toHaveLength(11);
    expect(table.children[0].children).toHaveLength(columns);
  },
);
