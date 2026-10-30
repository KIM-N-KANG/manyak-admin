// @vitest-environment jsdom
import type * as React from 'react';
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
import { setTimeout as realDelay } from 'node:timers/promises';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { AdminShell } from '@/components/admin/admin-shell';
import {
  type DomainName,
  DomainScreen,
} from '@/features/analytics/domain-screen';
import { legacyHref, LegacyRoute } from '@/features/analytics/legacy-route';
import type {
  AiCostResponse,
  CampaignAnalyticsResponse,
} from '@/features/analytics/types';
import { getDashboardCharts } from '@/fixtures/dashboard';
import { infraMetricsFixture, infraTablesFixture } from '@/fixtures/infra';
import { metricFixture } from '@/fixtures/metrics';
import { playInstalls } from '@/fixtures/play-installs';

const nav = vi.hoisted(() => ({
  search: '',
  path: '/analytics/growth',
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => nav.path,
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
}));
vi.mock('recharts', async () => {
  const { createContext, useContext } =
    await vi.importActual<typeof React>('react');
  const PlotData = createContext<unknown[]>([]);
  const Box = ({ children }: PropsWithChildren) =>
    createElement('div', null, children);
  const Plot = ({
    children,
    data,
    onClick,
  }: PropsWithChildren<{
    data: unknown[];
    onClick?: (state: { activeTooltipIndex: number }) => void;
  }>) =>
    createElement(
      PlotData,
      { value: data ?? [] },
      createElement(
        'div',
        {
          'data-rows': JSON.stringify(data),
          onClick: onClick
            ? () => onClick({ activeTooltipIndex: 0 })
            : undefined,
        },
        children,
      ),
    );
  const LabelList = ({
    dataKey,
  }: {
    dataKey?: string | ((row: unknown) => string);
  }) => {
    const data = useContext(PlotData);

    return typeof dataKey === 'function'
      ? createElement(
          'div',
          { 'data-testid': 'bar-labels' },
          data.map((row, i) => createElement('span', { key: i }, dataKey(row))),
        )
      : null;
  };

  return {
    PieChart: Box,
    Pie: Box,
    Cell: Box,
    ScatterChart: Plot,
    Scatter: Box,
    ReferenceArea: Box,
    usePlotArea: () => undefined,
    useXAxisScale: () => undefined,
    useYAxisScale: () => undefined,
    LineChart: Plot,
    BarChart: Plot,
    Line: Box,
    Bar: Box,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Label: Box,
    LabelList,
    ReferenceLine: () => null,
  };
});
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({
    children,
    config,
    initialDimension,
    ...props
  }: PropsWithChildren<{ config?: unknown; initialDimension?: unknown }>) =>
    createElement(
      'div',
      {
        ...props,
        'data-config': JSON.stringify(config),
        'data-initial-size': JSON.stringify(initialDimension),
      },
      children,
    ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
  ChartLegend: () => null,
  ChartLegendContent: () => null,
}));

let client: QueryClient;
let fail: string;
let noCampaigns = false;
const requests: string[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));
  nav.search = '';
  nav.push.mockReset();
  nav.replace.mockReset();
  requests.length = 0;
  fail = '';
  noCampaigns = false;

  const storage = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 60000,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requests.push(url);

      const parsed = new URL(url, 'http://localhost');

      if (parsed.pathname === '/api/dashboard/charts')
        return Response.json(
          getDashboardCharts({
            from: parsed.searchParams.get('from')!,
            to: parsed.searchParams.get('to')!,
          }),
        );

      if (parsed.pathname === '/api/infra/metrics')
        return Response.json(
          infraMetricsFixture(
            parsed.searchParams.get('from')!,
            parsed.searchParams.get('to')!,
          ),
        );

      if (parsed.pathname === '/api/infra/db-tables')
        return Response.json(infraTablesFixture());

      if (fail && parsed.pathname.includes(fail))
        return Response.json({ message: '설정 없음' }, { status: 503 });

      if (parsed.pathname === '/api/dashboard/play-installs')
        return Response.json(playInstalls);

      if (noCampaigns && parsed.pathname === '/api/campaigns')
        return Response.json({ items: [] });

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

function draw(domain: DomainName) {
  nav.path = `/analytics/${domain}`;

  const element = () =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(DomainScreen, { domain }),
    );
  const view = render(element());

  return {
    ...view,
    change: (search: string) => {
      nav.search = search;
      view.rerender(element());
    },
    go: () => {
      nav.search = new URL(
        nav.push.mock.calls.at(-1)![0],
        'http://localhost',
      ).search.slice(1);
      view.rerender(element());
    },
  };
}

async function waitForLoadedRequests(count: number, headings: string[]) {
  await waitFor(() => {
    expect(requests).toHaveLength(count);
    expect(client.isFetching()).toBe(0);

    for (const name of headings)
      expect(screen.getAllByRole('heading', { name }).length).toBeGreaterThan(
        0,
      );
  });
}

it.each([
  [
    'growth',
    ['유입', '앱 설치', '활동', '가입', '리텐션'],
    '활동',
    [
      '/api/users/activity',
      '/api/quality/client',
      '/api/users/sessions',
      '/api/users/session-lengths',
    ],
  ],
  [
    'stories',
    ['제작', '간편 제작 퍼널', '상세 진입 퍼널'],
    '제작',
    [
      '/api/conversion/funnels/story-creation',
      '/api/conversion/funnels/creation-entry-chat',
      '/api/dashboard/charts',
      '/api/quality/client',
    ],
  ],
  [
    'chats',
    ['참여', '옵션과 입력'],
    '참여',
    [
      '/api/conversion/turn-reach',
      '/api/dashboard/charts',
      '/api/conversion/funnels/story-detail-chat',
    ],
  ],
  ['payments', [], '', ['/api/dashboard/charts', '/api/quality/client']],
  [
    'ops',
    ['서비스', 'AI 품질', 'AI 비용', '서비스와 요청', '저장소', 'DB 테이블'],
    '서비스',
    ['/api/infra/metrics'],
  ],
] as const)(
  '%s 기본 탭과 요청은 해당 도메인의 영역만 포함한다',
  async (domain, tabs, selected, paths) => {
    draw(domain);
    await waitFor(() => expect(requests).toHaveLength(paths.length));
    expect(
      requests.map((url) => new URL(url, 'http://localhost').pathname).sort(),
    ).toEqual([...paths].sort());
    expect(screen.queryAllByRole('tab').map((tab) => tab.textContent)).toEqual(
      tabs,
    );

    if (selected)
      expect(
        screen
          .getByRole('tab', { name: selected })
          .getAttribute('aria-selected'),
      ).toBe('true');

    expect(requests.some((url) => url === '/api/campaigns')).toBe(false);
  },
);

it.each(['growth', 'stories', 'chats'] as const)(
  '%s의 퍼널은 90일 기간에서 해당 영역만 막고 366일 영역은 요청한다',
  async (domain) => {
    nav.search =
      domain === 'growth' ? 'tab=signups&range=last90d' : 'range=last90d';

    const view = draw(domain);

    await screen.findByText('기간 확인 필요');
    expect(requests.some((url) => url.includes('/conversion/funnels/'))).toBe(
      false,
    );
    expect(
      requests.some((url) =>
        url.includes(
          domain === 'growth' ? '/users/signups' : '/dashboard/charts',
        ),
      ),
    ).toBe(true);
    expect(new URLSearchParams(nav.search).get('range')).toBe('last90d');
    fireEvent.click(screen.getByRole('button', { name: /최근 31일로 맞추기/ }));
    view.go();
    await waitFor(() =>
      expect(requests.some((url) => url.includes('/conversion/funnels/'))).toBe(
        true,
      ),
    );
    expect(nav.search).toContain('to=2026-10-23');
    expect(nav.search).toContain('from=2026-09-23');
  },
);

it('성장 유입의 하위 구분은 기간과 캠페인 조건을 유지하고 지원하지 않는 선택기를 숨긴다', async () => {
  nav.search = 'tab=trend&campaign=TEST&platform=android&segment=member';

  const view = draw('growth');

  await screen.findByRole('heading', { name: '웹 DAU' });
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    '유입',
    '앱 설치',
    '활동',
    '가입',
    '리텐션',
    '캠페인 추이',
    '첫 방문 활성화',
    '광고 소재',
    '유입 소스',
    '앱 유입',
    '푸시 열람',
  ]);
  expect(screen.queryByRole('combobox', { name: '플랫폼' })).toBeNull();
  expect(screen.queryByRole('combobox', { name: '대상' })).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: '유입 소스' }));
  view.go();
  await waitFor(() =>
    expect(
      requests.some((url) => url.startsWith('/api/campaigns/sources?')),
    ).toBe(true),
  );
  expect(nav.search).toContain('campaign=TEST');
  expect(screen.queryByRole('combobox', { name: '광고 캠페인' })).toBeNull();
});

it('성장 활동의 실패는 세션 두 요청과 상태를 가리지 않는다', async () => {
  fail = '/users/activity';
  draw('growth');
  await screen.findByText('Amplitude 지표를 불러올 수 없음');
  await screen.findByRole('heading', { name: '평균 세션 길이' });
  await screen.findByRole('heading', { name: '세션 길이 분포' });
  await waitFor(() => expect(requests).toHaveLength(4));
});

it.each([
  ['stories', '', ['전환 퍼널 영역', '콘텐츠 영역']],
  [
    'chats',
    '',
    [
      '채팅 턴 도달률 영역',
      '채팅 참여 영역',
      '채팅 소유자 영역',
      '전환 퍼널 영역',
    ],
  ],
  ['chats', 'tab=chat-options', ['채팅 옵션 비중 영역', '입력 방식 영역']],
  ['ops', 'tab=ai-quality', ['AI 품질 영역', '오류 표시 영역']],
] as const)(
  '%s %s 영역 순서와 분포 배치를 유지한다',
  async (domain, search, labels) => {
    nav.search = search;
    draw(domain);
    await waitFor(() => expect(requests.length).toBeGreaterThan(1));

    const regions = screen
      .getAllByRole('region')
      .map((node) => node.getAttribute('aria-label'))
      .filter((label) => labels.includes(label as never));

    expect(regions).toEqual(labels);

    if (domain === 'stories') {
      await screen.findByRole('heading', { name: '제작 방식별 스토리 수' });
      expect(
        screen.getByRole('heading', { name: '간편 제작별 입력 주변 인물 수' }),
      ).toBeTruthy();
      expect(
        screen.queryByRole('heading', { name: '스트림 오류율' }),
      ).toBeNull();
    }

    if (domain === 'ops') {
      await screen.findByRole('heading', { name: '기능별 AI 평균 호출 시간' });
      expect(
        screen.queryByRole('heading', { name: '간편 제작 실패율' }),
      ).toBeNull();
      expect(
        screen.queryByRole('heading', { name: '입력 방식별 채팅 메시지 전송' }),
      ).toBeNull();
    }
  },
);

it('결제는 같은 대시보드 응답 캐시를 쓰며 그래프 네 개와 신호 차트만 보인다', async () => {
  nav.search = 'range=last30d&platform=web&segment=guest';

  const range = { from: '2026-09-24', to: '2026-10-23' };

  client.setQueryData(
    ['/api/dashboard/charts?from=2026-09-24&to=2026-10-23'],
    getDashboardCharts(range),
  );

  const view = draw('payments');

  await screen.findByRole('heading', { name: '이프와 초대 신호 사용자' });
  expect(screen.queryAllByRole('tab')).toHaveLength(0);
  expect(
    screen.getByLabelText('일별 지표 추이').querySelectorAll('[data-rows]'),
  ).toHaveLength(4);
  await waitFor(() => {
    expect(requests).toEqual([
      '/api/quality/client?from=2026-09-24&to=2026-10-23&platform=web&segment=guest',
    ]);
  });
  expect(
    screen.queryByRole('heading', { name: '채팅 메시지 전송' }),
  ).toBeNull();
  expect(screen.queryByRole('heading', { name: '스트림 오류율' })).toBeNull();
  expect(view.container.textContent).toContain('플랫폼과 대상 전체 기준');

  const signal = screen.getByLabelText('이프와 초대 신호 사용자 추이');

  expect(signal.parentElement?.parentElement?.className).toContain(
    'last-child:nth-child(odd)',
  );
});

it('가입은 퍼널 여섯 개를 요청하며 플랫폼 변경은 선택 플랫폼 퍼널 셋만 다시 요청한다', async () => {
  nav.search = 'tab=signups';

  const view = draw('growth');

  await waitForLoadedRequests(8, [
    '웹 첫 접속',
    '앱 첫 접속',
    '게스트 한도 로그인',
    '가입 이벤트 기준 신규 가입자',
  ]);
  await waitFor(() =>
    expect(
      requests.filter((url) => url.includes('/conversion/funnels/')),
    ).toHaveLength(6),
  );
  expect(screen.queryByRole('combobox', { name: '대상' })).toBeNull();
  requests.length = 0;
  fireEvent.change(screen.getByRole('combobox', { name: '플랫폼' }), {
    target: { value: 'android' },
  });
  view.go();
  await waitFor(() => expect(requests).toHaveLength(3));
  expect(
    requests.map((url) => new URL(url, 'http://localhost').pathname).sort(),
  ).toEqual([
    '/api/conversion/funnels/first-visit-activation',
    '/api/conversion/funnels/guest-limit-login',
    '/api/conversion/funnels/login-signup',
  ]);
  expect(requests[0]).toContain('platform=android');
});

it.each([
  ['growth', '/members', '회원 목록'],
  ['stories', '/stories', '스토리 목록'],
  ['chats', '/chats', '채팅 목록'],
  ['payments', '/payments', '결제 목록'],
] as const)(
  '%s 제목 옆 상호 링크는 쿼리를 넘기지 않는다',
  (domain, href, label) => {
    nav.search = 'platform=web&segment=member&campaign=TEST&range=last7d';
    draw(domain);
    expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(
      href,
    );
  },
);

// ADMIN/WEB 7d2b745 2-1-1 이동 표의 18행을 구현 매핑과 독립적으로 고정한 기대값이다.
const legacyCases = [
  ['/dashboard/analytics', [''], '/analytics/chats', 'engagement'],
  ['/analytics/acquisition', ['', 'trend'], '/analytics/growth', 'trend'],
  ['/analytics/acquisition', ['creation'], '/analytics/stories', 'creation'],
  [
    '/analytics/acquisition',
    ['story-detail'],
    '/analytics/stories',
    'story-detail',
  ],
  ['/analytics/acquisition', ['sources'], '/analytics/growth', 'sources'],
  ['/analytics/acquisition', ['push'], '/analytics/growth', 'push'],
  ['/analytics/acquisition', ['installs'], '/analytics/growth', 'installs'],
  [
    '/analytics/users',
    ['', 'activity', 'sessions'],
    '/analytics/growth',
    'activity',
  ],
  ['/analytics/users', ['retention'], '/analytics/growth', 'retention'],
  ['/analytics/users', ['signups'], '/analytics/growth', 'signups'],
  ['/analytics/conversion', ['', 'funnels'], '/analytics/growth', 'signups'],
  ['/analytics/conversion', ['turn-reach'], '/analytics/chats', 'engagement'],
  ['/analytics/quality', ['', 'client'], '/analytics/ops', 'ai-quality'],
  ['/analytics/quality', ['chat-options'], '/analytics/chats', 'chat-options'],
  ['/analytics/quality', ['ai-cost'], '/analytics/ops', 'ai-cost'],
  ['/analytics/infra', ['', 'services'], '/analytics/ops', 'services'],
  ['/analytics/infra', ['storage'], '/analytics/ops', 'storage'],
  ['/analytics/infra', ['tables'], '/analytics/ops', 'tables'],
] as const;
const legacyFallbacks = [
  ['/dashboard/analytics', '/analytics/chats', 'engagement', '참여'],
  ['/analytics/acquisition', '/analytics/growth', 'trend', '유입'],
  ['/analytics/users', '/analytics/growth', 'activity', '활동'],
  ['/analytics/conversion', '/analytics/growth', 'signups', '가입'],
  ['/analytics/quality', '/analytics/ops', 'ai-quality', 'AI 품질'],
  ['/analytics/infra', '/analytics/ops', 'services', '서비스'],
] as const;

it.each(legacyCases)(
  '정본 이동 표 %s %j → %s %s는 쿼리를 보존한다',
  (path, inputs, destination, tab) => {
    for (const input of inputs) {
      const params = new URLSearchParams(
        'range=last14d&platform=android&segment=member&campaign=TEST&adSegment=ads&storyId=id&cohort=signup&tag=a&tag=b',
      );

      if (input) params.set('tab', input);

      const target = new URL(legacyHref(path, params), 'http://localhost');

      expect(target.pathname).toBe(destination);
      expect(target.searchParams.get('tab')).toBe(tab);

      for (const key of [
        'range',
        'platform',
        'segment',
        'campaign',
        'adSegment',
        'storyId',
        'cohort',
        'tag',
      ])
        expect(target.searchParams.getAll(key)).toEqual(params.getAll(key));
    }
  },
);
it.each(legacyFallbacks)(
  '%s는 replace 뒤 새 화면과 메뉴를 활성화한다',
  async (path, destination, tab, label) => {
    nav.path = path;
    nav.search = 'range=last7d&campaign=TEST';

    const old = render(createElement(LegacyRoute));

    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith(
        `${destination}?range=last7d&campaign=TEST&tab=${tab}`,
        { scroll: false },
      ),
    );
    expect(nav.push).not.toHaveBeenCalled();
    old.unmount();
    nav.path = destination;
    nav.search = `range=last7d&campaign=TEST&tab=${tab}`;
    render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          AdminShell,
          null,
          createElement(DomainScreen, {
            domain: destination.split('/').at(-1) as DomainName,
          }),
        ),
      ),
    );
    expect(
      screen.getByRole('tab', { name: label, selected: true }),
    ).toBeTruthy();

    const active = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');

    expect(active).toHaveLength(1);
    expect(
      new URL(active[0].getAttribute('href')!, 'http://localhost').pathname,
    ).toBe(destination);
  },
);
it.each(
  legacyFallbacks.flatMap(([path, destination, tab]) =>
    ['unknown', 'constructor', 'toString', '__proto__', 'play-installs'].map(
      (input) => ({ path, destination, tab, input }),
    ),
  ),
)(
  '$path의 미등록 tab=$input은 예외 없이 기본 행으로 이동한다',
  ({ path, destination, tab, input }) => {
    const result = new URL(
      legacyHref(path, new URLSearchParams({ tab: input, campaign: 'TEST' })),
      'http://localhost',
    );

    expect(result.pathname).toBe(destination);
    expect(result.searchParams.get('tab')).toBe(tab);
    expect(result.searchParams.get('campaign')).toBe('TEST');
  },
);

it('예전 분석의 days는 range로 바꾸고 LegacyRoute는 replace만 사용한다', async () => {
  nav.path = '/dashboard/analytics';
  nav.search = 'days=30&campaign=TEST';
  render(createElement(LegacyRoute));
  await waitFor(() => expect(nav.replace).toHaveBeenCalled());

  const target = new URL(nav.replace.mock.calls[0][0], 'http://localhost');

  expect(target.pathname).toBe('/analytics/chats');
  expect(target.searchParams.get('tab')).toBe('engagement');
  expect(target.searchParams.get('range')).toBe('last30d');
  expect(target.searchParams.has('days')).toBe(false);
  expect(nav.push).not.toHaveBeenCalled();
});

it('활동 탭의 준비 중 날짜는 네 응답을 합쳐 첫 영역 위 알림 하나로 보인다', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requests.push(url);

      const parsed = new URL(url, 'http://localhost');
      const data = metricFixture(
        parsed.pathname.replace('/api', ''),
        parsed.searchParams,
      ) as { pendingDates: string[] };

      data.pendingDates = parsed.pathname.endsWith('session-lengths')
        ? ['2026-10-21', '2026-10-22', '2026-10-23']
        : ['2026-10-22', '2026-10-23'];

      return Response.json(data);
    }),
  );
  draw('growth');
  await screen.findByText('준비 중 날짜 3개. 60초 뒤 다시 요청합니다.');
  expect(screen.getAllByText(/60초 뒤 다시 요청합니다/)).toHaveLength(1);

  const notice = screen.getByText(/준비 중 날짜 3개/);

  expect(
    notice.compareDocumentPosition(
      screen.getByRole('heading', { name: '사용자 활동' }),
    ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    within(notice).getByText('2026-10-21, 2026-10-22, 2026-10-23'),
  ).toBeTruthy();
  await waitFor(() => expect(requests).toHaveLength(4));
});

it('활동의 대상 변경은 세션 둘과 활동량을 재요청하고 사용자 활동에 대상 전체 기준을 표시한다', async () => {
  nav.search = 'platform=web';

  const view = draw('growth');

  await waitForLoadedRequests(4, ['평균 세션 길이', '세션 길이 분포']);
  requests.length = 0;
  fireEvent.change(screen.getByRole('combobox', { name: '대상' }), {
    target: { value: 'member' },
  });
  view.go();
  await waitForLoadedRequests(3, ['평균 세션 길이', '세션 길이 분포']);
  expect(requests.every((url) => url.includes('segment=member'))).toBe(true);
  expect(requests.some((url) => url.includes('/users/activity'))).toBe(false);

  const area = screen.getByRole('region', { name: '사용자 활동 영역' });

  expect(within(area).getAllByText('대상 전체 기준').length).toBeGreaterThan(0);
  expect(
    within(area).getAllByText('플랫폼과 대상 전체 기준').length,
  ).toBeGreaterThan(0);
  requests.length = 0;
  fireEvent.change(screen.getByRole('combobox', { name: '플랫폼' }), {
    target: { value: 'android' },
  });
  view.go();
  await act(async () => {
    await realDelay(20);
  });
  await waitFor(() => expect(requests).toHaveLength(1));
});

it('스토리 제작은 숨긴 대상을 all로 요청하고 콘텐츠에만 플랫폼 전체 기준을 붙인다', async () => {
  nav.search = 'platform=web&segment=guest';
  draw('stories');
  await waitForLoadedRequests(4, [
    '간편 제작 실패율',
    '제작 방식별 스토리 수',
    '간편 제작별 입력 주변 인물 수',
  ]);
  expect(requests.find((url) => url.includes('/quality/client'))).toContain(
    'platform=web&segment=all',
  );
  expect(
    requests.find((url) => url.includes('/dashboard/charts')),
  ).not.toContain('platform');
  expect(screen.queryByRole('combobox', { name: '대상' })).toBeNull();

  const content = screen.getByRole('region', { name: '콘텐츠 영역' });

  expect(
    within(content).getAllByText('플랫폼 전체 기준').length,
  ).toBeGreaterThanOrEqual(3);
  expect(
    within(screen.getByRole('region', { name: '전환 퍼널 영역' })).queryByText(
      '플랫폼 전체 기준',
    ),
  ).toBeNull();
});

it.each(['growth', 'stories', 'chats', 'payments', 'ops'] as const)(
  '%s는 모르는 탭에서 기본 탭으로 복원한다',
  (domain) => {
    nav.search = 'tab=unknown';
    draw(domain);

    if (domain === 'payments')
      expect(screen.queryAllByRole('tab')).toHaveLength(0);
    else
      expect(
        screen
          .getAllByRole('tab')
          .filter((tab) => tab.getAttribute('aria-selected') === 'true')
          .map((tab) => tab.textContent),
      ).toEqual(
        domain === 'ops'
          ? ['서비스', '서비스와 요청']
          : domain === 'growth'
            ? ['활동']
            : domain === 'stories'
              ? ['제작']
              : ['참여'],
      );
  },
);

it('옵션과 입력의 준비 중 알림은 두 응답의 날짜를 합쳐 하나만 표시한다', async () => {
  nav.search = 'tab=chat-options';
  draw('chats');
  await screen.findByRole('heading', { name: '입력 방식별 채팅 메시지 전송' });
  expect(screen.getAllByText(/60초 뒤 다시 요청합니다/)).toHaveLength(1);
  await waitFor(() => expect(requests).toHaveLength(2));
});

it('평균 세션 길이와 분포는 세션 영역에 있고 기간 상한 366일은 요청 전에 막는다', async () => {
  const view = draw('growth');

  await waitForLoadedRequests(4, ['평균 세션 길이', '세션 길이 분포']);

  const chart = screen.getByLabelText('평균 세션 길이 추이');

  expect(chart.parentElement?.parentElement?.className).toContain(
    'last-child:nth-child(odd)',
  );

  const distribution = screen
    .getByRole('heading', { name: '세션 길이 분포' })
    .closest('section');

  expect(distribution?.parentElement?.className).not.toContain('grid-cols-2');
  requests.length = 0;
  view.change('from=2025-01-01&to=2026-10-23');
  await screen.findByText('기간 확인 필요');
  await waitFor(() => expect(requests).toHaveLength(0));
});

it('운영 서비스 하위 구분은 캐시를 공유하고 DB 테이블은 현재 값만 요청한다', async () => {
  nav.search = 'range=last7d';

  const view = draw('ops');

  await screen.findByRole('heading', { name: '서버 태스크' });
  await waitFor(() => expect(requests).toHaveLength(1));
  fireEvent.click(screen.getByRole('tab', { name: '저장소' }));
  view.go();
  await screen.findByRole('heading', { name: 'RDS 여유 스토리지' });
  await waitFor(() => expect(requests).toHaveLength(1));
  fireEvent.click(screen.getByRole('tab', { name: 'DB 테이블' }));
  view.go();
  await screen.findByRole('heading', { name: '테이블별 전체 크기' });
  expect(requests.at(-1)).toBe('/api/infra/db-tables?limit=20');
  expect(
    screen.getByRole('button', { name: '기간: 현재' }).hasAttribute('disabled'),
  ).toBe(true);
  expect(nav.search).toContain('range=last7d');
});

it('운영 AI 품질은 플랫폼 변경 시 오류 표시만 다시 요청하고 분포는 전체 기준이다', async () => {
  nav.search = 'tab=ai-quality';

  const view = draw('ops');

  await screen.findByRole('heading', { name: '스트림 오류율' });
  await waitFor(() => {
    expect(requests).toHaveLength(2);
    expect(
      screen.getByRole('heading', { name: '기능별 AI 평균 호출 시간' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: '기능별 AI 성공률' }),
    ).toBeTruthy();
  });
  requests.length = 0;
  fireEvent.change(screen.getByRole('combobox', { name: '플랫폼' }), {
    target: { value: 'web' },
  });
  view.go();
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]).toContain('/quality/client?');
  expect(requests[0]).toContain('platform=web&segment=all');
  expect(
    within(screen.getByRole('region', { name: 'AI 품질 영역' })).getAllByText(
      '플랫폼 전체 기준',
    ),
  ).toHaveLength(2);
});

it('퍼널 첫 단계의 수치 표는 전환율 빈칸을 유지하고 두 번째 단계부터 계산한다', async () => {
  nav.search = 'tab=signups';
  draw('growth');
  await screen.findByRole('heading', { name: '웹 첫 접속' });

  const card = screen
    .getByRole('heading', { name: '웹 첫 접속' })
    .closest('section')!;

  await waitFor(() =>
    expect(card.querySelectorAll('tbody tr').length).toBeGreaterThan(1),
  );

  const rows = card.querySelectorAll('tbody tr');

  expect(rows[0].querySelectorAll('td')[2].textContent).toBe('');
  expect(rows[1].querySelectorAll('td')[2].textContent).toContain('%');
});

it('광고 퍼널 첫 단계는 세 광고 구분의 전환율을 모두 빈칸으로 둔다', async () => {
  nav.search = 'tab=creation&campaign=TEST&range=last7d';
  draw('stories');
  await screen.findByRole('heading', { name: '단계별 전환' });

  const row = screen.getByRole('table').querySelector('tbody tr')!;
  const cells = row.querySelectorAll('td');

  for (const index of [2, 4, 6]) expect(cells[index].textContent).toBe('');
});

it('채팅 상세 진입 카드는 대상 전체 기준이고 대상 변경으로 퍼널을 다시 요청하지 않는다', async () => {
  const view = draw('chats');

  await waitForLoadedRequests(3, [
    '상세 진입 채팅',
    '채팅 소유자 게스트와 회원',
  ]);
  requests.length = 0;
  fireEvent.change(screen.getByRole('combobox', { name: '대상' }), {
    target: { value: 'member' },
  });
  view.go();
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]).toContain('/conversion/turn-reach?');
  expect(
    within(
      screen
        .getByRole('heading', { name: '상세 진입 채팅' })
        .closest('section')!,
    ).getByText('대상 전체 기준'),
  ).toBeTruthy();
});

it.each(['sources', 'push', 'installs'])(
  '성장 %s는 캠페인 목록을 요청하지 않는다',
  async (tab) => {
    nav.search = `tab=${tab}`;
    noCampaigns = true;
    draw('growth');
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests).not.toContain('/api/campaigns');
    expect(screen.queryByRole('combobox', { name: '광고 캠페인' })).toBeNull();
  },
);

it('성장 유입의 광고 유입 비중은 서버의 0.7을 70.0%로 표시한다', async () => {
  nav.search = 'tab=trend';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const parsed = new URL(url, 'http://localhost');
      const data = metricFixture(
        parsed.pathname.replace('/api', ''),
        parsed.searchParams,
      );

      if (parsed.pathname.endsWith('/analytics'))
        (data as CampaignAnalyticsResponse).totals.adsShare = 0.7;

      return Response.json(data);
    }),
  );
  draw('growth');
  await screen.findByText('70.0%');
});

it('채팅 분포 다섯 카드는 고른 플랫폼과 대상을 적용하지 않고 전체 기준을 표시한다', async () => {
  nav.search = 'platform=web&segment=member';
  draw('chats');
  await screen.findByRole('heading', { name: '채팅 소유자 게스트와 회원' });

  const cards = ['채팅 참여 영역', '채팅 소유자 영역'].flatMap((label) =>
    within(screen.getByRole('region', { name: label })).getAllByText(
      '플랫폼과 대상 전체 기준',
    ),
  );

  expect(cards).toHaveLength(5);
  await waitFor(() => {
    expect(
      requests.filter((url) => url.includes('/dashboard/charts')),
    ).toHaveLength(1);
  });
  expect(
    requests.find((url) => url.includes('/dashboard/charts')),
  ).not.toContain('segment');
});

it('활동 탭의 네 요청은 준비 중 응답만 각각 60초 뒤 재요청하고 모두 준비되면 멈춘다', async () => {
  vi.useRealTimers();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));

  let ready = false;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requests.push(url);

      const parsed = new URL(url, 'http://localhost');
      const data = metricFixture(
        parsed.pathname.replace('/api', ''),
        parsed.searchParams,
      ) as { pendingDates: string[]; monthlyActiveUsers?: number };

      data.pendingDates = ready ? [] : ['2026-10-22'];

      if ('monthlyActiveUsers' in data) data.monthlyActiveUsers = 1200;

      return Response.json(data);
    }),
  );
  draw('growth');

  const settle = async () =>
    act(async () => {
      await vi.waitFor(() => expect(client.isFetching()).toBe(0));
      await vi.advanceTimersByTimeAsync(1);
      await realDelay(0);
    });

  await settle();
  await vi.waitFor(() => expect(requests).toHaveLength(4));
  ready = true;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60001);
  });
  await settle();
  await vi.waitFor(() => expect(requests).toHaveLength(8));
  expect(screen.queryByText(/60초 뒤 다시 요청합니다/)).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
  });
  await vi.waitFor(() => expect(requests).toHaveLength(8));
});

it.each([
  [
    'growth',
    '',
    '사용자 활동 영역',
    '전체는 같은 기간에 웹과 앱을 함께 쓴 사람을 한 번 세어 웹과 앱 값의 합보다 작을 수 있습니다.',
  ],
  [
    'growth',
    'tab=signups',
    '전환 퍼널 영역',
    '웹과 앱 모두 국가가 한국이거나 국가 정보가 없는 사용자만 집계합니다. 팀 계정은 제외하지 않습니다.',
  ],
  [
    'stories',
    'tab=creation&range=last7d&campaign=TEST',
    '',
    '팀 계정은 제외하지 않습니다.',
  ],
  [
    'ops',
    'tab=ai-quality',
    '오류 표시 영역',
    '전체의 사용자 수는 웹과 앱을 함께 쓴 사람을 한 번 셉니다.',
  ],
] as const)(
  '%s %s 출처 도움말은 확정 문구와 집계 조건을 유지한다',
  async (domain, search, area, expected) => {
    nav.search = search;
    draw(domain);

    if (domain === 'stories')
      await screen.findByRole('heading', { name: '단계별 전환' });

    const scope = area
      ? within(screen.getByRole('region', { name: area }))
      : screen;

    await waitFor(() =>
      expect(
        scope.getAllByRole('button', { name: 'Amplitude 출처와 집계 안내' })
          .length,
      ).toBeGreaterThan(0),
    );
    await act(async () =>
      scope
        .getAllByRole('button', { name: 'Amplitude 출처와 집계 안내' })[0]
        .focus(),
    );

    const tooltip = await screen.findByRole('tooltip');

    expect(tooltip.textContent).toContain(expected);
    expect(tooltip.textContent).not.toContain('유입 분석');
    expect(tooltip.textContent).not.toContain('국가와 무관');
  },
);

it('DomainScreen 운영 Langfuse 비용은 실제 0·기록 없음·준비 중을 구분하고 미연결 비용을 계열에 넣지 않는다', async () => {
  nav.search = 'tab=ai-cost&from=2026-10-21&to=2026-10-23';

  const data = metricFixture(
    '/quality/ai-cost',
    new URLSearchParams(nav.search),
  ) as AiCostResponse;

  data.pendingDates = ['2026-10-22'];
  data.daily.forEach((day, i) => {
    day.byFeature = [
      {
        feature: 'chat_response',
        model: null,
        calls: 2,
        inputTokens: 100,
        outputTokens: 10,
        callsWithoutTokens: i === 2 ? 1 : 0,
        costKrw: i === 2 ? 0 : null,
      },
    ];
  });
  data.totals = { costKrw: 2.8, costPerTurnKrw: 0, costPerStoryKrw: null };
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(data));
  draw('ops');
  await screen.findByText('총 AI 비용');
  expect(
    screen.getByRole('button', { name: 'Langfuse 출처와 집계 안내' }),
  ).toBeTruthy();
  expect(screen.queryByText(/KST 집계 기준/)).toBeNull();
  expect(screen.getByText(/준비 중 날짜 1개/)).toBeTruthy();
  expect(
    screen.getByText(
      '사용량은 있으나 비용이 0원인 모델: UNPRICED. Langfuse 모델 단가 설정을 확인해 주세요.',
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      '기능에 연결되지 않은 Langfuse 추적: 새 기능 2.8원. 이 비용은 총 AI 비용에만 들어갑니다.',
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      '토큰 수가 기록되지 않은 호출 1회가 있어 토큰 합이 실제보다 작을 수 있습니다.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText(/모델 정보가 없는 호출/)).toBeNull();

  const table = screen.getByText('비용 표').parentElement!;
  const rows = table.querySelectorAll('tbody tr');

  expect(rows[0].textContent).toContain('비용 기록 없음');
  expect(rows[1].textContent).toContain('준비 중');
  expect(rows[2].textContent).toContain('0원');

  const chart = screen
    .getByRole('heading', {
      name: '기능별 일별 비용',
    })
    .closest<HTMLElement>('[data-slot=card]')!;
  const points = JSON.parse(
    chart.querySelector('[data-rows]')!.getAttribute('data-rows')!,
  );

  expect(points[0].chat_response).toBeNull();
  expect(points[0].chat_image).toBeNull();
  expect(points[1].chat_response).toBeNull();
  expect(points[2].chat_response).toBe(0);
  expect(
    chart.querySelector('[data-config]')!.getAttribute('data-config'),
  ).not.toContain('새 기능');
});

it('DomainScreen 운영 AI 비용 요약은 서버 합계와 원가를 그대로 보이며 연결 누락 안내는 값이 있을 때만 보인다', async () => {
  nav.search = 'tab=ai-cost&from=2026-10-23&to=2026-10-23';

  const data = metricFixture(
    '/quality/ai-cost',
    new URLSearchParams(nav.search),
  ) as AiCostResponse;

  data.totals = { costKrw: 7, costPerTurnKrw: 3.5, costPerStoryKrw: null };
  data.unmapped = [];
  data.unpricedModels = [];
  data.daily[0].byFeature.forEach((item) => (item.callsWithoutTokens = 0));
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(data));
  draw('ops');
  await screen.findByText('총 AI 비용');
  expect(screen.getByText('7원')).toBeTruthy();
  expect(screen.getByText('3.5원')).toBeTruthy();
  expect(screen.queryByText(/기능에 연결되지 않은 Langfuse 추적/)).toBeNull();
  expect(screen.queryByText(/사용량은 있으나 비용이/)).toBeNull();
  expect(screen.queryByText(/토큰 수가 기록되지 않은 호출/)).toBeNull();
});

it('DomainScreen 운영 AI 비용 503은 전용 안내와 같은 요청의 다시 시도를 제공하고 다른 탭을 가리지 않는다', async () => {
  nav.search = 'tab=ai-cost';
  fail = 'ai-cost';

  const view = draw('ops');

  expect(
    await screen.findByRole('heading', { name: 'AI 비용을 불러올 수 없음' }),
  ).toBeTruthy();
  expect(
    screen.getByText(
      '잠시 후 다시 시도해 주세요. 문제가 계속되면 서버의 Langfuse 설정을 확인해 주세요.',
    ),
  ).toBeTruthy();

  const url = requests[0];

  fail = '';
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('총 AI 비용');
  await waitFor(() => expect(requests).toEqual([url, url]));
  view.change('tab=ai-quality');
  expect(await screen.findByText('오류 표시')).toBeTruthy();
  expect(screen.queryByText('AI 비용을 불러올 수 없음')).toBeNull();
});

it('DomainScreen 운영 AI 비용 pendingDates는 60초 뒤 같은 범위를 재요청하고 준비 완료 후 멈춘다', async () => {
  vi.useRealTimers();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));
  nav.search = 'tab=ai-cost&from=2026-10-21&to=2026-10-23';

  let calls = 0;

  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = String(input);

    requests.push(url);

    const data = metricFixture(
      '/quality/ai-cost',
      new URL(url, 'http://localhost').searchParams,
    ) as AiCostResponse;

    data.pendingDates = calls++ === 0 ? ['2026-10-22'] : [];
    data.expiredDates = ['2026-10-21'];

    return Response.json(data);
  });
  draw('ops');

  const settle = async () =>
    act(async () => {
      await vi.waitFor(() => expect(client.isFetching()).toBe(0));
      await vi.advanceTimersByTimeAsync(1);
      await realDelay(0);
    });

  await settle();
  expect(screen.getByText(/준비 중 날짜 1개/)).toBeTruthy();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60001);
  });
  await settle();
  await vi.waitFor(() => expect(requests).toHaveLength(2));
  expect(requests[0]).toBe(requests[1]);
  expect(screen.queryByText(/준비 중 날짜 1개/)).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
  });
  await vi.waitFor(() => expect(requests).toHaveLength(2));
});

it('DomainScreen 운영 AI 비용은 보관 만료·준비 중·조합 기록 없음과 이미지 비용을 따로 표시한다', async () => {
  nav.search = 'tab=ai-cost&from=2026-10-21&to=2026-10-23';

  const data = metricFixture(
    '/quality/ai-cost',
    new URLSearchParams(nav.search),
  ) as AiCostResponse;

  Object.assign(data, {
    asOf: null,
    expiredDates: ['2026-10-21', '2026-10-22'],
    retentionDays: 30,
    retentionStartDate: '2026-10-23',
    pendingDates: ['2026-10-22'],
  });
  data.daily.forEach((day) => {
    day.byFeature = [
      {
        feature: 'chat_response',
        model: null,
        calls: 4,
        callsWithoutTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        costKrw: null,
      },
      {
        feature: 'chat_image',
        model: null,
        calls: 2,
        callsWithoutTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        costKrw: 96,
      },
    ];
  });
  data.totals = { costKrw: 288, costPerTurnKrw: null, costPerStoryKrw: null };
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(data));
  draw('ops');
  await screen.findByText('총 AI 비용');
  expect(
    screen.getByText(
      'Langfuse 보관 기간(30일)이 지나 비용 기록이 없는 날짜가 2일 있습니다. 해당 날짜는 턴당 원가와 스토리당 원가 계산에서 제외했습니다. 실시간 이미지 비용은 해당 날짜도 총 AI 비용에 포함합니다.',
    ),
  ).toBeTruthy();
  expect(
    within(
      screen.getByRole('heading', { name: '턴당 원가' }).parentElement!,
    ).getByText('계산할 수 없음'),
  ).toBeTruthy();
  expect(
    within(
      screen.getByRole('heading', { name: '스토리당 원가' }).parentElement!,
    ).getByText('호출 없음'),
  ).toBeTruthy();

  const rows = screen
    .getByText('비용 표')
    .parentElement!.querySelectorAll('tbody tr');

  expect(rows[0].textContent).toContain('보관 기간 지남');
  expect(rows[2].textContent).toContain('준비 중');
  expect(rows[4].textContent).toContain('비용 기록 없음');

  const chart = screen
    .getByRole('heading', {
      name: '기능별 일별 비용',
    })
    .closest<HTMLElement>('[data-slot=card]')!;
  const points = JSON.parse(
    chart.querySelector('[data-rows]')!.getAttribute('data-rows')!,
  );

  expect(points.map((row: { chat_image: number }) => row.chat_image)).toEqual([
    96, 96, 96,
  ]);
  expect(
    points.map((row: { chat_response: null }) => row.chat_response),
  ).toEqual([null, null, null]);
  act(() =>
    screen.getByRole('button', { name: 'Langfuse 출처와 집계 안내' }).focus(),
  );

  const help = (await screen.findByRole('tooltip')).textContent!;

  expect(help.startsWith('Langfuse 출처 지표입니다.')).toBe(true);
  expect(help).not.toContain('받은');
  expect(help).not.toContain('{');
});

it('DomainScreen 운영 보관 시작일 전이라도 expiredDates에 없으면 조합별 비용 기록 없음이다', async () => {
  nav.search = 'tab=ai-cost&from=2026-10-21&to=2026-10-21';

  const data = metricFixture(
    '/quality/ai-cost',
    new URLSearchParams(nav.search),
  ) as AiCostResponse;

  data.retentionStartDate = '2026-10-23';
  data.expiredDates = [];
  data.pendingDates = [];
  data.daily[0].byFeature.forEach((item) => (item.costKrw = null));
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(data));
  draw('ops');
  await screen.findByText('총 AI 비용');
  expect(screen.queryByText('보관 기간 지남')).toBeNull();
  expect(screen.getAllByText('비용 기록 없음').length).toBeGreaterThan(0);
});

it('DomainScreen 성장 리텐션은 어제까지 최근 7일과 visitor로 요청하고 시작 집단과 플랫폼을 분리한다', async () => {
  nav.search = 'tab=retention&platform=web&segment=member';

  const view = draw('growth');

  await screen.findByRole('heading', { name: '코호트 표' });
  await waitFor(() => {
    expect(requests).toEqual([
      '/api/users/retention?from=2026-10-16&to=2026-10-22&cohort=visitor',
    ]);
  });
  expect(screen.queryByRole('combobox', { name: '대상' })).toBeNull();
  expect(
    screen.getByRole('combobox', { name: '시작 집단' }).getAttribute('value') ??
      (screen.getByRole('combobox', { name: '시작 집단' }) as HTMLSelectElement)
        .value,
  ).toBe('visitor');
  fireEvent.change(screen.getByRole('combobox', { name: '시작 집단' }), {
    target: { value: 'signup' },
  });
  view.go();
  await waitFor(() =>
    expect(requests.at(-1)).toBe(
      '/api/users/retention?from=2026-10-16&to=2026-10-22&cohort=signup',
    ),
  );

  await waitForLoadedRequests(2, ['코호트 표']);

  const count = requests.length;

  fireEvent.change(screen.getByRole('combobox', { name: '플랫폼' }), {
    target: { value: 'android' },
  });
  view.go();
  await act(async () => {
    await realDelay(20);
  });
  await waitFor(() => expect(requests).toHaveLength(count));
  expect(nav.search).toContain('segment=member');
});

it('DomainScreen 성장 리텐션은 오늘 포함 기간 요청을 막고 맞추기 후 어제까지 요청한다', async () => {
  nav.search = 'tab=retention&range=last7d';

  const view = draw('growth');

  expect(screen.getByRole('alert').textContent).toContain('리텐션은 어제까지');
  await waitFor(() => expect(requests).toHaveLength(0));
  fireEvent.click(screen.getByRole('button', { name: '어제까지로 맞추기' }));
  view.go();
  await screen.findByRole('heading', { name: '코호트 표' });
  await waitFor(() => {
    expect(requests).toEqual([
      '/api/users/retention?from=2026-10-17&to=2026-10-22&cohort=visitor',
    ]);
  });
});

it('DomainScreen 성장 유입 소스는 10일 상한을 적용하고 끝 날짜를 유지해 맞춘다', async () => {
  nav.search = 'tab=sources&range=last30d&campaign=THIRD_2026';

  const view = draw('growth');

  expect(screen.getByRole('alert').textContent).toContain('최대 10일');
  await waitFor(() => expect(requests).toHaveLength(0));
  expect(nav.search).toContain('range=last30d');
  fireEvent.click(screen.getByRole('button', { name: '최근 10일로 맞추기' }));
  view.go();
  await screen.findByRole('heading', { name: '첫 유입 소스별 신규 방문자' });
  await waitFor(() => {
    expect(requests).toEqual([
      '/api/campaigns/sources?from=2026-10-14&to=2026-10-23',
    ]);
  });
  expect(nav.search).toContain('campaign=THIRD_2026');
});

it('DomainScreen 스토리 상세 진입은 3차 기본 기간 35일을 보존하고 31일 상한에서 요청을 막는다', async () => {
  nav.search = 'tab=story-detail&campaign=THIRD_2026';

  const view = draw('stories');

  await screen.findByRole('alert');
  expect(screen.getByRole('alert').textContent).toContain('최대 31일');
  await waitFor(() => expect(requests).toEqual(['/api/campaigns']));
  expect(
    screen.getByRole('button', { name: '기간: 2026-08-25 ~ 2026-09-28' }),
  ).toBeTruthy();
  expect(nav.search).toBe('tab=story-detail&campaign=THIRD_2026');
  view.change(
    'tab=story-detail&campaign=THIRD_2026&from=2026-10-01&to=2026-10-21',
  );
  await screen.findByRole('heading', { name: '단계별 전환' });
  expect(requests.at(-1)).toBe(
    '/api/campaigns/funnels/story-detail?from=2026-10-01&to=2026-10-21&campaign=THIRD_2026',
  );
});

it('DomainScreen 결제 일별 추이의 이프 소모 점과 수치 표는 그날의 소모 내역으로 이동한다', async () => {
  nav.search = 'from=2026-10-21&to=2026-10-23';
  draw('payments');

  const plot = await screen.findByLabelText('이프 소모 일별 추이');

  fireEvent.click(plot.querySelector('[data-rows]')!);
  expect(nav.push).toHaveBeenLastCalledWith(
    '/credits/transactions?direction=spent&date=2026-10-21',
  );

  const details = screen.getByText('일별 수치와 목록 이동').closest('details')!;

  expect(
    Array.from(details.querySelectorAll('a')).some(
      (link) =>
        link.getAttribute('href') ===
        '/credits/transactions?direction=spent&date=2026-10-21',
    ),
  ).toBe(true);
});

it('DomainScreen 성장 가입의 LabelList formatter는 첫 단계에 사용자 수만 두고 둘째 단계부터 전환율을 표시한다', async () => {
  nav.search = 'tab=signups';

  const original = vi.mocked(fetch).getMockImplementation()!;

  vi.mocked(fetch).mockImplementation(async (input, init) => {
    if (String(input).includes('/funnels/web-first-visit?')) {
      const parsed = new URL(String(input), 'http://localhost');
      const data = metricFixture(
        '/conversion/funnels/web-first-visit',
        parsed.searchParams,
      ) as { steps: { users: number }[] };

      data.steps[0].users = 100;
      data.steps[1].users = 40;

      return Response.json(data);
    }

    return original(input, init);
  });
  draw('growth');
  await waitFor(() =>
    expect(
      within(
        screen.getByRole('heading', { name: '웹 첫 접속' }).closest('section')!,
      ).getByTestId('bar-labels'),
    ).toBeTruthy(),
  );

  const labels = within(
    screen.getByRole('heading', { name: '웹 첫 접속' }).closest('section')!,
  ).getByTestId('bar-labels').children;

  expect(labels[0].textContent).toBe('100명');
  expect(labels[1].textContent).toBe('40명, 40.0%');
});

it.each([
  ['Android 누적 기기 설치 수', '보고서 전체 기간의 일별 기기 설치 수 합'],
  [
    '활성 기기 수',
    '카드는 보고서 마지막 날짜, 차트는 그날의 활성 기기 설치 수',
  ],
  ['일별 기기 설치 수와 앱 삭제 수', '그날 기기 설치 수와 앱 삭제 수'],
] as const)(
  'DomainScreen 성장 앱 설치의 %s 정의는 provider를 거쳐 네 줄을 표시한다',
  async (title, calculation) => {
    nav.search = 'tab=installs';
    draw('growth');

    const buttons = await screen.findAllByRole('button', {
      name: `${title} 지표 정의`,
    });

    await act(async () => buttons[0].focus());

    const tooltip = await screen.findByRole('tooltip');
    const rows = Array.from(tooltip.querySelectorAll('p')).map(
      (p) => p.textContent,
    );

    expect(rows).toEqual([
      '출처 Google Play',
      '대상 Android 기기',
      `계산 ${calculation}`,
      '날짜 Play 기준 태평양 시간 날짜',
    ]);

    const headers = screen.getAllByRole('columnheader');

    for (const label of [
      '일별 기기 설치 수',
      '일별 앱 삭제 수',
      'Android 누적 기기 설치 수',
      '활성 기기 수',
    ])
      expect(
        headers
          .find((header) => header.textContent?.startsWith(label))
          ?.querySelector('button[aria-label$="지표 정의"]'),
      ).toBeTruthy();
  },
);

it('DomainScreen 채팅 참여는 장르만 전체 폭이고 턴 수와 첫 입력은 두 칸이다', async () => {
  draw('chats');
  await screen.findByRole('heading', { name: '첫 사용자 입력까지 걸린 시간' });

  const area = screen.getByRole('region', { name: '채팅 참여 영역' });
  const card = (title: string) =>
    within(area)
      .getByRole('heading', { name: title })
      .closest('[data-slot="card"]')!;

  expect(card('장르별 평균 턴 수').classList.contains('xl:col-span-2')).toBe(
    true,
  );
  expect(card('턴 수 분포').classList.contains('xl:col-span-2')).toBe(false);
  expect(
    card('첫 사용자 입력까지 걸린 시간').classList.contains('xl:col-span-2'),
  ).toBe(false);
});

it('DomainScreen 운영 AI 품질의 오류 표시 요약은 스트림 오류 하나이며 사용자 수 합계 카드는 없다', async () => {
  nav.search = 'tab=ai-quality';
  draw('ops');
  await screen.findByRole('heading', { name: '스트림 오류 표시' });

  const area = within(screen.getByRole('region', { name: '오류 표시 영역' }));

  expect(area.queryByRole('heading', { name: '채팅 메시지 전송' })).toBeNull();
  expect(
    area.queryByRole('heading', { name: '이프와 초대 신호 사용자' }),
  ).toBeNull();
  expect(
    area.getAllByRole('heading').map((heading) => heading.textContent),
  ).toEqual([
    '오류 표시',
    '스트림 오류 표시',
    '스트림 오류율',
    '오류 표시 사용자',
  ]);
});

it('DomainScreen 운영 AI 비용은 플랫폼과 대상을 숨기고 요청에서 제외한다', async () => {
  nav.search = 'tab=ai-cost&platform=android&segment=member';
  draw('ops');
  await screen.findByText('총 AI 비용');
  expect(screen.queryByRole('combobox', { name: '플랫폼' })).toBeNull();
  expect(screen.queryByRole('combobox', { name: '대상' })).toBeNull();
  await waitFor(() => {
    expect(requests).toEqual([
      '/api/quality/ai-cost?from=2026-09-24&to=2026-10-23',
    ]);
  });
  expect(nav.search).toContain('platform=android&segment=member');
});

it.each([
  [
    ['genre-depth', 'turns', 'first-message'],
    [true, false, false],
  ],
  [
    ['turns', 'first-message'],
    [false, false],
  ],
  [
    ['genre-depth', 'turns'],
    [true, true],
  ],
  [['turns'], [true]],
  [
    ['genre-depth', 'first-message'],
    [true, true],
  ],
] as const)(
  'DomainScreen 분포 %j는 앞선 전체 폭 행을 제외해 span %j를 정한다',
  async (ids, spans) => {
    const original = vi.mocked(fetch).getMockImplementation()!;

    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const response = await original(input, init);

      if (!String(input).includes('/dashboard/charts?')) return response;

      const data = await response.json();

      data.distributions = ids.map((id) =>
        data.distributions.find(
          (item: { chartId: string }) => item.chartId === id,
        ),
      );

      return Response.json(data);
    });
    draw('chats');

    const area = screen.getByRole('region', { name: '채팅 참여 영역' });

    await waitFor(() =>
      expect(within(area).getAllByRole('heading')).toHaveLength(ids.length + 1),
    );
    expect(
      Array.from(area.querySelectorAll('[data-slot="card"]')).map((card) =>
        card.classList.contains('xl:col-span-2'),
      ),
    ).toEqual(spans);
  },
);

it('DomainScreen 운영 AI 비용은 만료 날짜만 있으면 준비 중 재요청 없이 이미지 비용과 만료 안내를 유지한다', async () => {
  vi.useRealTimers();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));
  nav.search = 'tab=ai-cost&from=2026-10-21&to=2026-10-22';
  vi.mocked(fetch).mockImplementation(async (input) => {
    requests.push(String(input));

    const data = metricFixture(
      '/quality/ai-cost',
      new URL(String(input), 'http://localhost').searchParams,
    ) as AiCostResponse;

    data.asOf = null;
    data.pendingDates = [];
    data.expiredDates = ['2026-10-21', '2026-10-22'];

    for (const day of data.daily)
      for (const item of day.byFeature)
        item.costKrw = item.feature === 'chat_image' ? 96 : null;

    return Response.json(data);
  });
  draw('ops');

  const settle = async () =>
    act(async () => {
      await vi.waitFor(() => expect(client.isFetching()).toBe(0));
      await vi.advanceTimersByTimeAsync(1);
      await realDelay(0);
    });

  await settle();
  expect(screen.getByText(/Langfuse 보관 기간\(30일\)/)).toBeTruthy();
  expect(screen.queryByText(/60초 뒤 다시 요청합니다/)).toBeNull();
  expect(screen.queryByText('AI 비용을 불러올 수 없음')).toBeNull();
  expect(screen.getAllByText('보관 기간 지남').length).toBeGreaterThan(0);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
  });
  await settle();
  await vi.waitFor(() => expect(requests).toHaveLength(1));
});

it.each(['growth', 'stories', 'chats'] as const)(
  'DomainScreen %s 퍼널은 31일을 허용하고 32일에서 그 영역만 막는다',
  async (domain) => {
    nav.search = `${domain === 'growth' ? 'tab=signups&' : ''}from=2026-09-23&to=2026-10-23`;

    const view = draw(domain);

    await waitFor(() =>
      expect(requests.some((url) => url.includes('/conversion/funnels/'))).toBe(
        true,
      ),
    );
    await waitForLoadedRequests(
      domain === 'growth' ? 8 : domain === 'stories' ? 4 : 3,
      [
        domain === 'growth'
          ? '게스트 한도 로그인'
          : domain === 'stories'
            ? '제작 방식별 스토리 수'
            : '상세 진입 채팅',
      ],
    );
    expect(screen.queryByText('기간 확인 필요')).toBeNull();
    requests.length = 0;
    view.change(
      `${domain === 'growth' ? 'tab=signups&' : ''}from=2026-09-22&to=2026-10-23`,
    );
    expect(screen.getByText('기간 확인 필요')).toBeTruthy();
    await waitFor(() =>
      expect(
        requests.some((url) =>
          url.includes(
            domain === 'growth' ? '/users/signups' : '/dashboard/charts',
          ),
        ),
      ).toBe(true),
    );
    expect(requests.some((url) => url.includes('/conversion/funnels/'))).toBe(
      false,
    );
  },
);

it('5-1 성장 활동은 플랫폼 구성과 활동량, 사용자당 세션 수, 일별 세션 수를 표시한다', async () => {
  draw('growth');

  for (const title of [
    '활성 사용자 플랫폼 구성',
    '활동량',
    '핵심 활동 사용자',
    '핵심 활동 사용자 1인당 활동',
    '사용자당 세션 수',
    '일별 세션 수',
  ]) {
    expect(
      (await screen.findAllByRole('heading', { name: title })).length,
    ).toBeGreaterThan(0);
  }
});

it('5-1 성장 가입은 앱 신규 활성 사용자와 신규 퍼널 여섯 개를 표시한다', async () => {
  nav.search = 'tab=signups';
  draw('growth');
  expect(
    await screen.findByRole('heading', { name: '가입 전환율' }),
  ).toBeTruthy();
  expect(
    await screen.findByRole('region', { name: '앱 신규 활성 사용자 영역' }),
  ).toBeTruthy();

  for (const title of [
    '신규 사용자 활성화',
    '로그인 화면 가입',
    '앱 신규 활성화',
  ]) {
    expect(await screen.findByRole('heading', { name: title })).toBeTruthy();
  }
});

it.each([
  [
    'activation',
    '첫 방문 활성화 퍼널',
    '/campaigns/funnels/activation',
    '누적 도달',
  ],
  [
    'creatives',
    '소재별 웹 신규 가입자',
    '/campaigns/creatives',
    '소재별 5턴 이상 채팅 사용자',
  ],
  ['app', '앱 배너 사용자', '/campaigns/app-transfer', '웹 이용 후 앱 이용'],
])(
  '5-1 성장 유입 %s는 하위 구분과 영역 요청을 표시한다',
  async (tab, title, path, other) => {
    nav.search = `tab=${tab}&from=2026-10-21&to=2026-10-23&adSegment=ads`;
    draw('growth');
    expect(await screen.findByRole('heading', { name: title })).toBeTruthy();
    expect(await screen.findByRole('heading', { name: other })).toBeTruthy();
    expect(requests.some((url) => url.includes(path))).toBe(true);
    expect(requests.some((url) => url.includes('adSegment='))).toBe(false);
  },
);

it('5-1 첫 방문 활성화는 광고 구분만 바꾸면 받은 응답을 다시 그리고 요청하지 않는다', async () => {
  nav.search = 'tab=activation&from=2026-10-21&to=2026-10-23';

  const view = draw('growth');

  await waitForLoadedRequests(3, ['누적 도달', '첫 방문 활성화 퍼널']);
  expect(screen.getByText('610명')).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: '광고 구분' }), {
    target: { value: 'ads' },
  });
  view.go();
  expect(screen.getByText('488명')).toBeTruthy();
  expect(nav.search).toContain('adSegment=ads');
  expect(requests).toHaveLength(3);
});

it('5-1 첫 방문 활성화는 31일 초과면 두 데이터 요청을 모두 막는다', async () => {
  nav.search = 'tab=activation&from=2026-09-01&to=2026-10-23';
  draw('growth');
  expect(await screen.findAllByRole('alert')).toHaveLength(2);
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(requests).toEqual(['/api/campaigns']);
  expect(screen.getAllByText('기간 확인 필요')).toHaveLength(2);
});

it('5-1 앱 유입은 32일 범위에서 배너만 요청하고 웹 이용 후 앱 이용을 막는다', async () => {
  nav.search =
    'tab=app&from=2026-09-22&to=2026-10-23&campaign=IGNORED&platform=android&segment=member';
  draw('growth');
  await screen.findByRole('heading', { name: '앱 배너 사용자' });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(requests).toEqual([
    '/api/campaigns/app-transfer?from=2026-09-22&to=2026-10-23',
  ]);
  expect(screen.getByText('기간 확인 필요')).toBeTruthy();
  expect(
    screen.getByRole('button', { name: '최근 31일로 맞추기' }),
  ).toBeTruthy();
});

it('5-1 신규 필드가 없는 이전 응답은 활동량과 세션 지표만 준비 중으로 표시한다', async () => {
  nav.search = 'from=2026-10-21&to=2026-10-23';

  const original = vi.mocked(fetch).getMockImplementation()!;

  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const response = await original(input, init);
    const data = await response.json();

    if (String(input).includes('/quality/client?'))
      for (const day of data.daily) delete day.activity;

    if (String(input).includes('/users/sessions?'))
      for (const day of data.daily) delete day.sessionsPerUser;

    if (String(input).includes('/users/session-lengths?')) delete data.daily;

    return Response.json(data);
  });
  draw('growth');
  await waitForLoadedRequests(4, [
    '평균 세션 길이',
    '사용자당 세션 수',
    '일별 세션 수',
  ]);
  expect(
    within(screen.getByRole('region', { name: '활동량 영역' })).getByText(
      '준비 중',
    ),
  ).toBeTruthy();

  for (const title of ['사용자당 세션 수', '일별 세션 수']) {
    expect(
      within(
        screen
          .getByRole('heading', { name: title })
          .closest('[data-slot=card]') as HTMLElement,
      ).getByText('준비 중'),
    ).toBeTruthy();
  }
});

it('5-1 플랫폼 구성은 전체 DAU와 별개로 세 값과 구성비를 보인다', async () => {
  nav.search = 'from=2026-10-21&to=2026-10-21&platform=android';

  const original = vi.mocked(fetch).getMockImplementation()!;

  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const response = await original(input, init);

    if (!String(input).includes('/users/activity?')) return response;

    const data = await response.json();

    data.monthlyActiveUsers = 30;
    data.daily[0].activeUsers = { all: 10, web: 8, android: 4, unknown: 8 };

    return Response.json(data);
  });
  draw('growth');

  const heading = await screen.findByRole('heading', {
    name: '활성 사용자 플랫폼 구성',
  });
  const card = heading.closest('[data-slot=card]') as HTMLElement;
  const points = JSON.parse(
    card.querySelector('[data-rows]')!.getAttribute('data-rows')!,
  );

  expect(points[0]).toMatchObject({ web: 8, android: 4, unknown: 8 });
  expect(within(card).getAllByText('8명 (40.0%)')).toHaveLength(2);
  expect(within(card).getByText('4명 (20.0%)')).toBeTruthy();
});
