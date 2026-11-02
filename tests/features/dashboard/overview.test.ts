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
    totals: {
      joined: 71,
      chats: 12,
      turns: 500,
      revenue: 9600,
      stories: 23,
      spent: 4800,
    },
    previous: {
      from: '2026-08-27',
      to: '2026-09-25',
      totals: {
        joined: 58,
        chats: 0,
        turns: 500,
        revenue: 19200,
        stories: 10,
        spent: 6000,
      },
    },
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});
it('개요는 기간 합계와 증감 카드 여덟 개를 반응형 격자로 그리고 일별 그래프는 하나만 표시한다', () => {
  render(createElement(DashboardScreen));

  const grid = screen.getByRole('region', { name: '요약 지표' });

  expect(
    within(grid)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href')),
  ).toEqual([
    '/analytics/audience?tab=activity',
    '/members',
    '/analytics/inflow?tab=installs',
    '/stories',
    '/chats',
    '/chats?sort=turnCount',
    '/payments',
    '/credits/transactions?direction=spent',
  ]);

  for (const className of [
    'grid-cols-1',
    'sm:grid-cols-2',
    'xl:grid-cols-4',
    'items-stretch',
  ])
    expect(grid.classList.contains(className)).toBe(true);

  expect(grid.classList.contains('lg:grid-cols-3')).toBe(false);
  expect(grid.classList.contains('2xl:grid-cols-6')).toBe(false);

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

  for (const label of [
    '가입자',
    '스토리 생성',
    '채팅 시작',
    '턴',
    '결제 금액 (환불 포함)',
    '이프 소모',
  ]) {
    const card = screen.getByRole('region', { name: label });

    expect(within(card).getAllByText('준비 중')).toHaveLength(2);
    expect(card.textContent).toContain('오늘');
    expect(card.textContent).toContain('누적');
  }
});

it('여덟 개요 카드는 같은 슬롯 순서와 줄 높이를 쓰고 작은 줄의 전체 내용을 제공한다', () => {
  Object.assign((state.charts as { totals: object }).totals, {
    revenue: 1234567890,
  });
  render(createElement(DashboardScreen));

  const grid = screen.getByRole('region', { name: '요약 지표' });
  const cards = Array.from(grid.children);

  expect(cards).toHaveLength(8);

  const expected = ['title', 'value', 'change', 'comparison', 'detail'];
  const classes = cards.map((card) => {
    expect(card.getAttribute('data-overview-card')).toBe('');

    const slots = Array.from(card.querySelectorAll('[data-overview-slot]'));

    expect(
      slots.map((slot) => slot.getAttribute('data-overview-slot')),
    ).toEqual(expected);
    expect(
      within(slots[0] as HTMLElement).getByRole('heading', { level: 3 }),
    ).toBeTruthy();
    expect(card.querySelector('button[aria-label$="안내"]')).toBeTruthy();
    expect(slots[1].classList.contains('whitespace-nowrap')).toBe(true);
    expect(slots[1].classList.contains('tabular-nums')).toBe(true);
    expect(slots[1].classList.contains('2xl:text-lg')).toBe(false);
    expect(slots[1].contains(slots[2])).toBe(false);
    expect(slots[4].classList.contains('truncate')).toBe(true);
    expect(slots[4].getAttribute('title')).toBe(slots[4].textContent);

    return slots.map((slot) => slot.className);
  });

  for (const slots of classes) expect(slots).toEqual(classes[0]);

  expect(
    within(cards[6] as HTMLElement).getByText('1,234,567,890'),
  ).toBeTruthy();

  expect(
    cards[0].querySelector('[data-overview-slot="detail"]')?.textContent,
  ).toBe('웹 200명, 앱 20명');
});

it('스토리 생성과 이프 소모는 기존 응답의 기간 합계·증감·오늘과 누적·링크를 표시한다', () => {
  render(createElement(DashboardScreen));

  for (const [label, value, change, href, today, total, unit] of [
    [
      '스토리 생성',
      '23개',
      '▲ 130.0%',
      '/stories',
      dashboardSummary.stories.createdToday,
      dashboardSummary.stories.total,
      '개',
    ],
    [
      '이프 소모',
      '4,800이프',
      '▼ 20.0%',
      '/credits/transactions?direction=spent',
      dashboardSummary.credits.spentToday,
      dashboardSummary.credits.spentTotal,
      '이프',
    ],
  ] as const) {
    const card = screen.getByRole('region', { name: label });
    const link = within(card).getByRole('link');

    expect(link.getAttribute('href')).toBe(href);
    expect(
      card.querySelector('[data-overview-slot="value"]')!.textContent,
    ).toBe(value);
    expect(within(card).getByText(change)).toBeTruthy();
    expect(within(card).getByText('이전 30일 대비')).toBeTruthy();
    expect(
      card.querySelector('[data-overview-slot="detail"]')!.textContent,
    ).toBe(
      `오늘 ${today.toLocaleString('ko-KR')}${unit}, 누적 ${total.toLocaleString('ko-KR')}${unit}`,
    );
    expect(
      within(card).getByRole('button', { name: `${label} 집계 안내` }),
    ).toBeTruthy();
  }

  expect(state.requests).toHaveLength(4);
  expect(state.requests.map((url) => url.split('?')[0]).sort()).toEqual([
    '/api/dashboard/analytics',
    '/api/dashboard/charts',
    '/api/dashboard/play-installs',
    '/api/dashboard/summary',
  ]);
});
it('차트 실패는 DB 카드 여섯 장의 숫자와 증감에 표시하고 오늘·누적 줄은 유지한다', () => {
  state.error = true;
  render(createElement(DashboardScreen));

  for (const label of [
    '가입자',
    '스토리 생성',
    '채팅 시작',
    '턴',
    '결제 금액 (환불 포함)',
    '이프 소모',
  ]) {
    const card = screen.getByRole('region', { name: label });

    expect(within(card).getAllByText('불러오기 실패')).toHaveLength(2);
    expect(
      card.querySelector('[data-overview-slot="detail"]')!.textContent,
    ).toMatch(/^오늘 .+, 누적 /);
  }
});
