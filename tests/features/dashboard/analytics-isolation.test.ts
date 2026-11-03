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
import { DomainScreen } from '@/features/analytics/domain-screen';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { getDistributionHref } from '@/features/dashboard/links';
import type { ChartLink } from '@/features/dashboard/types';
import { metricFixture } from '@/fixtures/metrics';

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
    Rectangle: () => null,
    usePlotArea: () => undefined,
    useXAxisScale: () => undefined,
    useYAxisScale: () => undefined,
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
    Cell: () => null,
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
let failSummary: boolean;
let failCost: boolean;
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
  failSummary = false;
  failCost = false;
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

      if (failCost && url.includes('/quality/ai-cost?from=2026-10-15'))
        return Response.json({ message: 'unavailable' }, { status: 503 });

      const request = new Request(`http://localhost${url}`);

      if (url.startsWith('/api/dashboard/play-installs'))
        return failPlay
          ? Response.json({ code: 'SERVICE_UNAVAILABLE' }, { status: 503 })
          : playResponse();

      if (url.startsWith('/api/dashboard/summary'))
        return failSummary
          ? Response.json({ message: 'failure' }, { status: 500 })
          : summaryResponse();

      if (url.startsWith('/api/dashboard/charts'))
        return chartsResponse(request);

      if (url.startsWith('/api/dashboard/analytics'))
        return failAnalytics
          ? Response.json({ message: 'Amplitude unavailable' }, { status: 503 })
          : analyticsResponse(request);

      const parsed = new URL(url, 'http://localhost');

      return Response.json(
        metricFixture(parsed.pathname.replace('/api', ''), parsed.searchParams),
      );
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

async function expectDbMetricsVisible() {
  expect(
    screen.getByRole('heading', { name: '가입자', level: 3 }),
  ).toBeTruthy();
  expect(
    screen.getByRole('heading', { name: '결제 금액 (환불 포함)', level: 3 }),
  ).toBeTruthy();
  expect(
    await screen.findByRole('region', { name: '일별 지표 추이' }),
  ).toBeTruthy();
  expect(screen.queryByRole('heading', { name: '이용 분포' })).toBeNull();
}

describe('Amplitude 실패 격리', () => {
  it('503이어도 DB 지표를 유지하고 Amplitude만 재시도해 복구한다', async () => {
    failAnalytics = true;
    render(dashboard());

    const region = screen.getByRole('region', {
      name: '오늘 활성 사용자',
    });
    const alert = await within(region).findByRole('alert');

    expect(alert.textContent).toContain('불러올 수 없음');
    expect(alert.getAttribute('data-slot')).toBeNull();
    expect(region.className).not.toMatch(/min-h-|h-56/);
    await screen.findByRole('region', { name: '일별 지표 추이' });
    await expectDbMetricsVisible();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(within(region).queryByText('합계')).toBeNull();

    const dbRequests = requested.filter((url) => !url.includes('/analytics'));

    failAnalytics = false;
    fireEvent.click(within(region).getByRole('button', { name: '다시 시도' }));
    await within(region).findByText('합계');
    expect(within(region).queryByRole('alert')).toBeNull();
    await expectDbMetricsVisible();
    expect(requested.filter((url) => url.includes('/analytics'))).toHaveLength(
      2,
    );
    expect(requested.filter((url) => !url.includes('/analytics'))).toEqual(
      dbRequests,
    );
  });

  it('기간 선택은 DB 추이와 Amplitude 일별 범위를 전환하고 오늘 카드의 집계는 유지한다', async () => {
    const view = render(dashboard());

    await screen.findByRole('heading', { name: '오늘 활성 사용자' });
    expect(requested).toContain(
      '/api/dashboard/analytics?from=2026-10-15&to=2026-10-21',
    );
    expect(requested).toContain(
      '/api/dashboard/charts?from=2026-10-15&to=2026-10-21',
    );

    const memberCard = await screen.findByRole('link', { name: /^가입자/ });
    const headline = memberCard.querySelector(
      '[data-overview-slot="detail"]',
    )!.textContent;
    const sevenDays = await chartsResponse(
      new Request(
        'http://localhost/api/dashboard/charts?from=2026-10-15&to=2026-10-21',
      ),
    ).json();
    const sevenTotal = sevenDays.totals.joined;

    await within(memberCard).findByText(
      `${sevenTotal.toLocaleString('ko-KR')}`,
    );

    fireEvent.click(screen.getByRole('button', { name: '기간: 최근 7일' }));
    fireEvent.click(screen.getByRole('button', { name: '최근 90일' }));
    expect(navigation.push).toHaveBeenCalledWith('/dashboard?range=last90d', {
      scroll: false,
    });
    navigation.search = 'range=last90d';
    view.rerender(dashboard());
    await waitFor(() => {
      expect(requested.filter((url) => url.includes('/analytics'))).toEqual([
        '/api/dashboard/analytics?from=2026-10-15&to=2026-10-21',
        '/api/dashboard/analytics?from=2026-07-24&to=2026-10-21',
      ]);
      expect(requested).toContain(
        '/api/dashboard/charts?from=2026-07-24&to=2026-10-21',
      );
    });
    await screen.findByRole('heading', { name: '오늘 활성 사용자' });
    await expectDbMetricsVisible();
    expect(requested.filter((url) => url.includes('/summary'))).toHaveLength(1);

    const ninetyDays = await chartsResponse(
      new Request(
        'http://localhost/api/dashboard/charts?from=2026-07-24&to=2026-10-21',
      ),
    ).json();
    const ninetyTotal = ninetyDays.totals.joined;
    const updatedCard = screen.getByRole('link', { name: /^가입자/ });

    await within(updatedCard).findByText(
      `${ninetyTotal.toLocaleString('ko-KR')}`,
    );
    expect(
      updatedCard.querySelector('[data-overview-slot="detail"]')!.textContent,
    ).toBe(headline);
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
    expect(tooltip.textContent).toContain(
      '국가가 한국이거나 국가 정보가 없는 웹과 앱 사용자를 집계합니다.',
    );
    expect(tooltip.textContent).toContain(
      '같은 날 웹과 앱을 함께 쓴 사람을 한 번 셉니다.',
    );
    expect(tooltip.textContent).not.toContain('국가와 무관');
    expect(tooltip.textContent).toContain(
      '팀 계정 코호트가 설정된 경우 해당 사용자는 제외합니다.',
    );
  });
});

describe('개요와 도메인 분포 영역 분리', () => {
  it.each([
    ['chats', '', ['채팅 참여 영역', '채팅 소유자 영역'], 5],
    ['content', '', ['콘텐츠 영역'], 2],
    ['ops', 'tab=ai-quality', ['AI 품질 영역'], 2],
  ] as const)(
    '%s는 해당 분포만 그리며 기존 목록 링크와 기간 이동을 유지한다',
    async (domain, search, areas, count) => {
      navigation.pathname = `/analytics/${domain}`;
      navigation.search = `range=last7d${search ? `&${search}` : ''}`;

      const element = () =>
        createElement(
          QueryClientProvider,
          { client },
          createElement(DomainScreen, { domain }),
        );
      const view = render(element());

      await waitFor(() =>
        expect(screen.getAllByText('수치 및 관련 목록')).toHaveLength(count),
      );
      expect(
        screen.queryByRole('region', { name: '오늘 활성 사용자' }),
      ).toBeNull();

      const data = await chartsResponse(
        new Request(
          'http://localhost/api/dashboard/charts?from=2026-10-15&to=2026-10-21',
        ),
      ).json();
      const ids =
        domain === 'chats'
          ? [
              'genre-depth',
              'turns',
              'first-message',
              'started-as',
              'member-chats',
            ]
          : domain === 'content'
            ? ['creation-mode', 'characters']
            : ['ai-latency', 'ai-success'];
      const links = areas.flatMap((label) =>
        Array.from(
          screen.getByRole('region', { name: label }).querySelectorAll('a'),
        ).map((link) => link.getAttribute('href')),
      );

      expect(links.sort()).toEqual(
        data.distributions
          .filter((distribution: { chartId: string }) =>
            ids.includes(distribution.chartId),
          )
          .flatMap((distribution: { points: { link: ChartLink }[] }) =>
            distribution.points.map((point) => getDistributionHref(point.link)),
          )
          .sort(),
      );
      fireEvent.click(screen.getByRole('button', { name: '기간: 최근 7일' }));
      fireEvent.click(screen.getByRole('button', { name: '최근 90일' }));
      expect(navigation.push).toHaveBeenCalledWith(
        `/analytics/${domain}?range=last90d${search ? `&${search}` : ''}`,
        { scroll: false },
      );
      navigation.search = `range=last90d${search ? `&${search}` : ''}`;
      view.rerender(element());
      await waitFor(() =>
        expect(requested).toContain(
          '/api/dashboard/charts?from=2026-07-24&to=2026-10-21',
        ),
      );
      expect(
        requested.some(
          (url) =>
            url.includes('/summary') || url.includes('/dashboard/analytics'),
        ),
      ).toBe(false);
    },
  );

  it('개요의 지표 전환은 새 경로와 기간을 유지하고 일별 목록 이동을 보존한다', async () => {
    const view = render(dashboard());

    await screen.findByRole('region', { name: '일별 지표 추이' });
    expect(
      screen.getByRole('heading', { name: '개요', level: 1 }),
    ).toBeTruthy();

    const select = screen.getByRole('combobox', { name: '지표' });

    fireEvent.change(select, { target: { value: 'spent' } });
    expect(navigation.push).toHaveBeenCalledWith(
      '/dashboard?range=last7d&metric=spent',
      { scroll: false },
    );

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
    await expectDbMetricsVisible();
  });
});

it('직접 날짜를 적용하고 Esc로 닫으면 기간 버튼에 포커스가 돌아온다', async () => {
  render(dashboard());
  await screen.findByRole('region', { name: '일별 지표 추이' });

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
  await screen.findByRole('region', { name: '일별 지표 추이' });
  await expectDbMetricsVisible();
  expect(
    screen.getByRole('region', { name: '앱 설치(Android)' }).textContent,
  ).toContain('설치 지표 사용 불가');
});

it('DB 요약 실패는 인라인 텍스트로 표시하고 같은 요청만 재시도한다', async () => {
  failSummary = true;
  render(dashboard());

  const alert = await screen.findByRole('alert');

  expect(alert.getAttribute('data-slot')).toBeNull();
  expect(alert.querySelector('[data-slot="card"]')).toBeNull();
  expect(alert.textContent).toContain('데이터 불러오기 실패');
  await screen.findByRole('region', { name: '일별 지표 추이' });

  const otherRequests = requested.filter((url) => !url.includes('/summary'));

  failSummary = false;
  fireEvent.click(within(alert).getByRole('button', { name: '다시 시도' }));
  await screen.findByRole('heading', { name: '가입자', level: 3 });
  expect(requested.filter((url) => !url.includes('/summary'))).toEqual(
    otherRequests,
  );
  expect(screen.queryByRole('alert')).toBeNull();
});

it('AI 비용 503은 나머지 일곱 카드 값을 유지하고 선택 비용만 다시 시도한다', async () => {
  failCost = true;
  render(dashboard());

  const cost = within(screen.getByRole('region', { name: 'AI 비용' }));

  await cost.findByRole('alert');

  const grid = screen.getByRole('region', { name: '요약 지표' });

  await waitFor(() => {
    const others = Array.from(grid.children).filter(
      (node) => node.getAttribute('aria-label') !== 'AI 비용',
    );

    expect(others).toHaveLength(7);

    for (const node of others) {
      expect(node.querySelector('[data-slot="skeleton"]')).toBeNull();
      expect(
        node.querySelector('[data-overview-slot="value"]')!.textContent,
      ).not.toBe('');
      expect(within(node as HTMLElement).queryByRole('alert')).toBeNull();
    }
  });

  const otherRequests = requested.filter(
    (url) => !url.includes('/quality/ai-cost?from=2026-10-15'),
  );

  failCost = false;
  fireEvent.click(cost.getByRole('button', { name: '다시 시도' }));
  await waitFor(() => expect(cost.queryByRole('alert')).toBeNull());
  expect(
    requested.filter(
      (url) => !url.includes('/quality/ai-cost?from=2026-10-15'),
    ),
  ).toEqual(otherRequests);
});

it('최근 30일의 여덟 미니 그래프는 기존 BFF 요청 여섯 번만 사용한다', async () => {
  navigation.search = 'range=last30d';
  render(dashboard());
  await waitFor(() => expect(requested).toHaveLength(6));
  expect([...requested].sort()).toEqual(
    [
      '/api/dashboard/summary',
      '/api/dashboard/charts?from=2026-09-22&to=2026-10-21',
      '/api/dashboard/analytics?from=2026-09-22&to=2026-10-21',
      '/api/dashboard/play-installs',
      '/api/quality/ai-cost?from=2026-09-22&to=2026-10-21',
      '/api/quality/ai-cost?from=2026-08-23&to=2026-09-21',
    ].sort(),
  );

  const grid = screen.getByRole('region', { name: '요약 지표' });

  await waitFor(() =>
    expect(grid.querySelectorAll('[data-overview-trend] svg')).toHaveLength(8),
  );

  for (const card of grid.children)
    expect(
      card.querySelectorAll('[data-overview-trend] svg path'),
    ).toHaveLength(1);
});

it('분석 503이면 오늘 활성 사용자만 그래프를 비우고 다른 일곱 선은 유지한다', async () => {
  failAnalytics = true;
  navigation.search = 'range=last30d';
  render(dashboard());

  const active = screen.getByRole('region', { name: '오늘 활성 사용자' });

  await within(active).findByRole('alert');

  const grid = screen.getByRole('region', { name: '요약 지표' });

  await waitFor(() =>
    expect(grid.querySelectorAll('[data-overview-trend] svg')).toHaveLength(7),
  );
  expect(active.querySelector('svg')).toBeNull();
});
it('스토리 일별 값이 하루뿐이면 숫자·증감을 유지하고 미니 그래프만 비운다', async () => {
  const data = await (
    await chartsResponse(
      new Request(
        'http://localhost/api/dashboard/charts?from=2026-10-15&to=2026-10-21',
      ),
    )
  ).json();

  data.daily = data.daily.slice(0, 1);
  client.setQueryData(
    ['/api/dashboard/charts?from=2026-10-15&to=2026-10-21'],
    data,
  );
  render(dashboard());

  const story = await screen.findByRole('region', { name: '스토리 생성' });

  expect(story.querySelector('[data-overview-trend]')).toBeTruthy();
  expect(story.querySelector('svg')).toBeNull();
  expect(story.querySelector('[data-overview-slot="value"]')!.textContent).toBe(
    `${data.totals.stories.toLocaleString('ko-KR')}개`,
  );
  expect(
    story.querySelector('[data-overview-slot="comparison"]')!.textContent,
  ).toBe('이전 7일 대비');
});
