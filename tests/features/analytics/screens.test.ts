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
import { setTimeout as realDelay } from 'node:timers/promises';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { AnalyticsScreen } from '@/features/analytics/analytics-screen';
import type { AnalyticsScreenName } from '@/features/analytics/config';
import type {
  ActivityResponse,
  AiCostResponse,
  CampaignAnalyticsResponse,
  ChatOptionResponse,
  SignupResponse,
} from '@/features/analytics/types';
import { metricFixture } from '@/fixtures/metrics';
import { playInstalls } from '@/fixtures/play-installs';

const nav = vi.hoisted(() => ({ search: '', push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/analytics/users',
  useRouter: () => ({ push: nav.push }),
}));
vi.mock('recharts', () => {
  const Box = ({ children }: PropsWithChildren) =>
    createElement('div', null, children);
  const Plot = ({ children, data }: PropsWithChildren<{ data: unknown }>) =>
    createElement('div', { 'data-rows': JSON.stringify(data) }, children);

  return {
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
    LabelList: () => null,
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
  requests.length = 0;
  fail = '';
  noCampaigns = false;
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

function draw(name: AnalyticsScreenName) {
  const element = () =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(AnalyticsScreen, { screen: name }),
    );
  const view = render(element());

  return {
    ...view,
    go: () => {
      nav.search = new URL(
        nav.push.mock.calls.at(-1)![0],
        'http://localhost',
      ).search.slice(1);
      view.rerender(element());
    },
    change: (search: string) => {
      nav.search = search;
      view.rerender(element());
    },
  };
}

it('사용자 기본 탭만 요청하며 MAU null, 0, 준비 중 날짜 행과 고정 계열을 보인다', async () => {
  const view = draw('users');

  await screen.findByText('MAU');
  expect(requests).toEqual([
    '/api/users/activity?from=2026-09-24&to=2026-10-23',
  ]);
  expect(screen.getAllByText('준비 중').length).toBeGreaterThan(1);

  const rows = JSON.parse(
    view.container.querySelector('[data-rows]')!.getAttribute('data-rows')!,
  );

  expect(rows[0].all).toBe(0);
  expect(
    rows.find((row: { date: string }) => row.date === '2026-10-22').pending,
  ).toBe(1);
  expect(screen.getByText(/준비 중 날짜 1개/)).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: '세션' }));
  view.go();
  await screen.findByRole('heading', { name: '평균 세션 길이' });
  expect(requests.at(-1)).toBe(
    '/api/users/sessions?from=2026-10-10&to=2026-10-23',
  );
  expect(screen.queryByText('MAU')).toBeNull();
});
it('리텐션 탭은 선택 기간을 유지해 요청을 막고 어제까지 맞춘다', async () => {
  nav.search = 'range=last7d';

  const view = draw('users');

  await screen.findByText('MAU');
  fireEvent.click(screen.getByRole('tab', { name: '리텐션' }));
  view.go();
  expect(screen.getByRole('alert').textContent).toContain('리텐션은 어제까지');
  expect(requests.some((x) => x.includes('/retention'))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '어제까지로 맞추기' }));
  view.go();
  await screen.findByText('D1 가중 평균');
  expect(requests.at(-1)).toBe(
    '/api/users/retention?from=2026-10-17&to=2026-10-22',
  );
  expect(screen.getAllByText('관찰 전').length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole('button', { name: /기간:/ }));
  expect(
    screen.getByRole('button', { name: '오늘' }).hasAttribute('disabled'),
  ).toBe(true);
  expect(
    screen.getByRole('button', { name: '어제' }).hasAttribute('disabled'),
  ).toBe(false);
  expect(screen.getByLabelText('끝 날짜').getAttribute('max')).toBe(
    '2026-10-22',
  );
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

  const count = requests.length;

  fireEvent.change(screen.getByRole('combobox', { name: '플랫폼' }), {
    target: { value: 'web' },
  });
  view.go();
  expect(requests.length).toBe(count);
});
it('Amplitude 503은 현재 탭에 격리하며 DB 가입 탭은 새로 조회하고 날짜 링크를 제공한다', async () => {
  fail = '/activity';

  const view = draw('users');

  await screen.findByText('Amplitude 지표를 불러올 수 없음');
  fireEvent.click(screen.getByRole('tab', { name: '신규 가입자' }));
  view.go();
  await screen.findByText('가입 경로');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(
    screen.getByRole('button', { name: '서버 DB 출처와 집계 안내' }),
  ).toBeTruthy();
  expect(
    screen
      .getAllByRole('link', { name: '회원 목록 →' })[0]
      .getAttribute('href'),
  ).toBe('/members?from=2026-09-24&to=2026-09-24');
});
it('캠페인 기본값과 변경, 기간 초과 차단과 맞추기, 생성 광고 구분은 URL에만 저장한다', async () => {
  const view = draw('acquisition');

  await screen.findByText('웹 DAU 평균');
  expect(requests.at(-1)).toContain('campaign=FOURTH_2026');
  fireEvent.change(screen.getByRole('combobox', { name: '광고 캠페인' }), {
    target: { value: 'THIRD_2026' },
  });
  view.go();
  await waitFor(() => expect(requests.at(-1)).toContain('campaign=THIRD_2026'));
  fireEvent.click(screen.getByRole('tab', { name: '간편 제작 퍼널' }));
  view.go();
  expect(screen.getByRole('alert').textContent).toContain('최대 20일');
  expect(requests.some((x) => x.includes('/creation'))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '최근 20일로 맞추기' }));
  view.go();
  await screen.findByText('첫 단계 사용자 수');
  expect(requests.at(-1)).toContain('from=2026-09-09&to=2026-09-28');

  const count = requests.length;

  fireEvent.change(screen.getByRole('combobox', { name: '광고 구분' }), {
    target: { value: 'ads' },
  });
  view.go();
  expect(requests.length).toBe(count);
  expect(requests.every((url) => !url.includes('segment='))).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /기간:/ }));
  expect(
    screen.getByRole('button', { name: '최근 30일' }).hasAttribute('disabled'),
  ).toBe(true);
});
it('캠페인이 없어도 유입 소스는 목록을 기다리지 않고 기간만 요청하고 차트 20개와 전체 표를 유지한다', async () => {
  noCampaigns = true;
  nav.search = 'tab=sources';

  const view = draw('acquisition');

  await screen.findByRole('heading', { name: '첫 유입 소스별 신규 방문자' });
  expect(screen.queryByRole('combobox', { name: '광고 캠페인' })).toBeNull();
  expect(requests).toContain(
    '/api/campaigns/sources?from=2026-10-17&to=2026-10-23',
  );
  expect(screen.getByText('소스 정보 없음')).toBeTruthy();

  const plots = view.container.querySelectorAll('[data-rows]');

  expect(JSON.parse(plots[0].getAttribute('data-rows')!)).toHaveLength(20);
  expect(view.container.querySelectorAll('tbody')[0].children).toHaveLength(30);
});
it('진행 중 캠페인 없음과 대상 스토리 누락·잘못된 식별자는 요청을 막는다', async () => {
  noCampaigns = true;

  const view = draw('acquisition');

  await screen.findByText(
    '진행 중인 광고 캠페인이 없습니다. 광고 캠페인을 선택해 주세요.',
  );
  expect(requests).toEqual(['/api/campaigns']);
  noCampaigns = false;
  client.clear();
  view.change('tab=story-detail&campaign=SECOND_2026&range=last7d');
  await screen.findByText(
    '이 광고 캠페인에는 대상 스토리가 없습니다. 스토리 공개 식별자를 입력해 주세요.',
  );
  expect(requests.some((url) => url.includes('story-detail'))).toBe(false);
  fireEvent.click(
    screen.getByRole('button', { name: '스토리 공개 식별자 입력' }),
  );
  expect(document.activeElement).toBe(
    screen.getByRole('textbox', { name: '대상 스토리 공개 식별자' }),
  );
  view.change('tab=story-detail&campaign=THIRD_2026&range=last7d&storyId=abc');
  expect(screen.getByRole('alert').textContent).toContain(
    '스토리 공개 식별자 형식',
  );
});
it('전환 퍼널의 플랫폼·스토리 전달과 100% 초과, 도달률의 빈 분모를 구분한다', async () => {
  const view = draw('conversion');

  await screen.findByText('첫 단계 사용자 수');
  expect(requests.at(-1)).toBe(
    '/api/conversion/funnels/web-first-visit?from=2026-10-17&to=2026-10-23',
  );
  expect(screen.queryByRole('combobox', { name: '플랫폼' })).toBeNull();
  view.change('funnel=guest-limit-login&platform=android');
  await screen.findByText('로그인 성공 (구글과 카카오 합)');
  expect(requests.at(-1)).toContain('platform=android');
  expect(screen.getByText('116.7%')).toBeTruthy();
  expect(screen.queryByText(/로그인 성공은 구글과 카카오/)).toBeNull();

  const help = screen.getByRole('button', { name: '전환 집계 안내' });

  act(() => help.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(help.getAttribute('aria-describedby')).toBe(tooltip.id);
  expect(tooltip.textContent).toContain('로그인 성공은 구글과 카카오');
  view.change('tab=turn-reach');
  await screen.findByText('게스트에서 회원으로');
  expect(screen.getAllByText('채팅 없음').length).toBeGreaterThan(0);
  expect(screen.getByText('대상 채팅 없음')).toBeTruthy();
});
it('품질은 입력 순서·오류율 150%·전송 없음, 모델·비용 누락을 보여 준다', async () => {
  const view = draw('quality');

  await screen.findByRole('heading', { name: '입력 방식별 채팅 메시지 전송' });
  expect(screen.getAllByText('150.0%')[0]).toBeTruthy();
  expect(screen.getAllByText('전송 없음')[0]).toBeTruthy();
  view.change('tab=chat-options');
  await screen.findByText('모델별 비중');
  expect(screen.getAllByText('오로라').length).toBeGreaterThan(0);
  expect(screen.getByText('25.0%')).toBeTruthy();
  expect(screen.getByText('75.0%')).toBeTruthy();
  expect(screen.getAllByText('NOVA').length).toBeGreaterThan(0);
  view.change('tab=ai-cost');
  await screen.findByText('총 AI 비용');
  expect(screen.getAllByText('단가 없음').length).toBeGreaterThan(0);
  expect(screen.getAllByText('모델 정보 없음').length).toBeGreaterThan(0);
  expect(screen.getByText('호출 없음')).toBeTruthy();
  expect(screen.getByText(/토큰 수가 기록되지 않은 호출/)).toBeTruthy();
  expect(screen.getByText(/단가가 없는 모델: UNPRICED/)).toBeTruthy();
  expect(screen.getAllByText('간편 제작').length).toBeGreaterThan(0);
});
it('준비 중 값은 60초 후 같은 요청으로 교체하고 준비 완료 후 재요청을 멈춘다', async () => {
  vi.useRealTimers();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));

  let calls = 0;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requests.push(url);
      calls++;

      const d = metricFixture(
        '/users/activity',
        new URL(url, 'http://localhost').searchParams,
      ) as { pendingDates: string[]; monthlyActiveUsers: number | null };

      if (calls > 1) {
        d.pendingDates = [];
        d.monthlyActiveUsers = 1200;
      }

      return Response.json(d);
    }),
  );
  draw('users');

  const settle = async () =>
    act(async () => {
      for (let i = 0; i < 6; i++) {
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(1);
      }

      await realDelay(0);
    });

  await settle();
  expect(screen.getByText('MAU')).toBeTruthy();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60001);
  });
  await settle();
  expect(requests).toHaveLength(2);
  await settle();
  expect(
    client.getQueryData<{ monthlyActiveUsers: number }>([requests[0]]),
  ).toHaveProperty('monthlyActiveUsers', 1200);
  await act(async () => {
    await realDelay(0);
  });
  expect(screen.getByText('1,200명')).toBeTruthy();
  expect(requests[0]).toBe(requests[1]);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
  });
  expect(requests).toHaveLength(2);
});

it('직접 입력한 캠페인은 최근 30일을 쓰고 캠페인 변경은 기간과 스토리를 지운다', async () => {
  const view = draw('acquisition');

  await screen.findByText('웹 DAU 평균');
  fireEvent.change(screen.getByRole('combobox', { name: '광고 캠페인' }), {
    target: { value: '__custom__' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'UTM 캠페인 값' }), {
    target: { value: 'TEST_2026' },
  });
  fireEvent.submit(
    screen.getByRole('textbox', { name: 'UTM 캠페인 값' }).closest('form')!,
  );
  view.go();
  await waitFor(() =>
    expect(requests.at(-1)).toBe(
      '/api/campaigns/analytics?from=2026-09-24&to=2026-10-23&campaign=TEST_2026',
    ),
  );
  view.change(
    'tab=trend&campaign=TEST_2026&range=last7d&storyId=3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  );
  fireEvent.change(screen.getByRole('combobox', { name: '광고 캠페인' }), {
    target: { value: 'THIRD_2026' },
  });

  const next = new URL(nav.push.mock.calls.at(-1)![0], 'http://localhost');

  expect(next.searchParams.has('range')).toBe(false);
  expect(next.searchParams.has('from')).toBe(false);
  expect(next.searchParams.has('storyId')).toBe(false);
});
it('상세 진입 채팅은 스토리가 비어 있으면 생략하고 입력 시 공개 식별자를 전달한다', async () => {
  nav.search = 'funnel=story-detail-chat';

  const view = draw('conversion');

  await screen.findByText('첫 단계 사용자 수');
  expect(requests.at(-1)).toBe(
    '/api/conversion/funnels/story-detail-chat?from=2026-10-17&to=2026-10-23&platform=web',
  );
  view.change(
    'funnel=story-detail-chat&platform=android&storyId=3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  );
  await waitFor(() =>
    expect(requests.at(-1)).toContain(
      'storyId=3f2504e0-4f89-41d3-9a0c-0305e82c3301&platform=android',
    ),
  );
});

function modifyResponse(path: string, change: (data: unknown) => unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requests.push(url);

      const parsed = new URL(url, 'http://localhost');
      const value = metricFixture(
        parsed.pathname.replace('/api', ''),
        parsed.searchParams,
      );

      return Response.json(parsed.pathname === path ? change(value) : value);
    }),
  );
}

it('신규 방문자가 없는 광고 비중 null은 0%로 바꾸지 않는다', async () => {
  modifyResponse('/api/campaigns/analytics', (value) => {
    const data = value as CampaignAnalyticsResponse;

    data.totals.adsShare = null;

    return data;
  });
  draw('acquisition');
  expect(await screen.findByText('신규 방문자 없음')).toBeTruthy();
});
it('채팅 수 0의 모델·페르소나 비중은 채팅 없음으로 표시한다', async () => {
  nav.search = 'tab=chat-options';
  modifyResponse('/api/quality/chat-options', (value) => {
    const data = value as ChatOptionResponse;

    data.daily = data.daily.map((day) => ({
      ...day,
      chats: 0,
      withPersona: 0,
      byModel: { AURORA: 0, LITE: 0 },
    }));

    return data;
  });
  draw('quality');
  await screen.findByText('모델별 비중');
  expect(screen.getAllByText('채팅 없음')).toHaveLength(3);
});
it('MAU와 전체 13명은 플랫폼 값 10, 3, 2의 합으로 다시 계산하지 않는다', async () => {
  modifyResponse('/api/users/activity', (value) => {
    const data = value as ActivityResponse;

    data.monthlyActiveUsers = 1200;
    data.daily.at(-1)!.activeUsers = {
      all: 13,
      web: 10,
      android: 3,
      unknown: 2,
    };

    return data;
  });

  const view = draw('users');

  await screen.findByText('1,200명');

  const card = screen.getByText('마지막 날 DAU').parentElement!;

  expect(card.textContent).toContain('13명');

  const rows = JSON.parse(
    view.container.querySelector('[data-rows]')!.getAttribute('data-rows')!,
  );

  expect(rows.at(-1)).toMatchObject({
    all: 13,
    web: 10,
    android: 3,
    unknown: 2,
  });
});
it('광고 캠페인의 대상 스토리는 기본값이면 query에서 생략한다', async () => {
  nav.search =
    'tab=story-detail&campaign=THIRD_2026&from=2026-10-01&to=2026-10-21';
  draw('acquisition');
  await screen.findByText('첫 단계 사용자 수');
  expect(requests.at(-1)).toBe(
    '/api/campaigns/funnels/story-detail?from=2026-10-01&to=2026-10-21&campaign=THIRD_2026',
  );
});

it.each(['installs', 'play-installs'])(
  '유입 앱 설치 %s는 캠페인·기간과 독립적으로 Play만 요청하고 상세 차트를 표시한다',
  async (tab) => {
    nav.search = `tab=${tab}&campaign=FIXTURE_UNAVAILABLE&from=2020-01-01&to=2026-10-23`;
    draw('acquisition');
    await screen.findByText(
      `집계 기준 날짜 ${playInstalls.asOf} (Play 기준 태평양 시간)`,
    );
    expect(requests).toEqual(['/api/dashboard/play-installs']);
    expect(
      screen
        .getByRole('tab', { name: '앱 설치' })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: '기간: 전체 기간' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.queryByRole('combobox', { name: '광고 캠페인' })).toBeNull();
    expect(screen.queryByText('기간 확인 필요')).toBeNull();
    expect(
      screen.getByLabelText('누적 기기 설치 수와 활성 기기 수 추이'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('일별 기기 설치 수와 앱 삭제 수'),
    ).toBeTruthy();
    expect(screen.getByText('Google Play')).toBeTruthy();
    expect(screen.getByText('전체 수치 표')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: '캠페인 추이' }));
    expect(nav.push).toHaveBeenCalledWith(
      '/analytics/users?tab=trend&campaign=FIXTURE_UNAVAILABLE&from=2020-01-01&to=2026-10-23',
      { scroll: false },
    );
  },
);

it('유입 앱 설치의 503은 Play 안내와 재시도로 표시한다', async () => {
  nav.search = 'tab=play-installs';
  fail = '/dashboard/play-installs';
  draw('acquisition');
  await screen.findByText('설치 지표 사용 불가');
  expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
  expect(screen.queryByText('Amplitude 지표를 불러올 수 없음')).toBeNull();
  expect(requests).toEqual(['/api/dashboard/play-installs']);
});

it('누적 가입자는 서비스 시작부터 받은 1293~1300을 표시하고 신규 가입 요약은 기간 합계다', async () => {
  nav.search = 'tab=signups&from=2026-10-17&to=2026-10-23';

  const data = metricFixture(
    '/users/signups',
    new URLSearchParams(nav.search),
  ) as SignupResponse;

  data.daily = data.daily.map((day, i) => ({
    ...day,
    signups: {
      total: i === 6 ? 2 : 1,
      google: i === 6 ? 2 : 1,
      kakao: 0,
      other: 0,
    },
    cumulativeSignups: i === 6 ? 1300 : 1293 + i,
  }));
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(data));
  draw('users');

  await screen.findByRole('heading', { name: '누적 가입자' });
  expect(
    screen.queryByRole('heading', { name: '누적 신규 가입자' }),
  ).toBeNull();

  const chart = screen.getByRole('heading', {
    name: '누적 가입자',
  }).parentElement!;
  const rows = JSON.parse(
    chart.querySelector('[data-rows]')!.getAttribute('data-rows')!,
  );

  expect(rows[0].value).toBe(1293);
  expect(rows.at(-1).value).toBe(1300);

  const summary = screen.getAllByRole('heading', {
    name: '신규 가입자',
    level: 3,
  })[0].parentElement!;

  expect(within(summary).getByText('8명')).toBeTruthy();
  expect(
    within(chart)
      .getAllByRole('link', { name: '회원 목록 →' })[0]
      .getAttribute('href'),
  ).toBe('/members?from=2026-10-17&to=2026-10-17');

  const help = screen.getByRole('button', { name: '서버 DB 출처와 집계 안내' });

  act(() => help.focus());
  expect((await screen.findByRole('tooltip')).textContent).toBe(
    '서버 DB 출처 지표입니다. 팀 계정은 제외합니다. 가입 경로는 처음 연결한 소셜 계정 기준입니다. 누적 가입자는 서비스 시작부터 센 값이며 탈퇴한 회원을 포함합니다.',
  );
  expect(vi.mocked(fetch).mock.calls.at(-1)?.[0]).toBe(
    '/api/users/signups?from=2026-10-17&to=2026-10-23',
  );
});

it.each([48, 72])(
  '실시간 이미지 장당 %s원은 비용에 포함되고 토큰 세 칸은 해당 없음이다',
  async (unitCost) => {
    nav.search = 'tab=ai-cost&from=2026-10-23&to=2026-10-23';

    const data = metricFixture(
      '/quality/ai-cost',
      new URLSearchParams(nav.search),
    ) as AiCostResponse;

    data.chatImageUnitCostKrw = unitCost;
    data.daily[0].byFeature = [
      {
        feature: 'chat_response',
        model: 'AURORA',
        calls: 1,
        callsWithoutTokens: 0,
        inputTokens: 1000,
        outputTokens: 500,
        costKrw: 3,
      },
      {
        feature: 'chat_image',
        model: null,
        calls: 3,
        callsWithoutTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        costKrw: 3 * unitCost,
      },
    ];
    data.totals = {
      costKrw: 3 + 3 * unitCost,
      costPerTurnKrw: 3,
      costPerStoryKrw: null,
    };
    data.unpricedModels = [];
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(data));
    draw('quality');
    await screen.findByText('총 AI 비용');
    expect(screen.getByText(`${3 + 3 * unitCost}원`)).toBeTruthy();
    expect(
      within(
        screen.getByRole('heading', { name: '턴당 원가' }).parentElement!,
      ).getByText('3원'),
    ).toBeTruthy();
    expect(screen.queryByText(/모델 정보가 없는 호출/)).toBeNull();
    expect(screen.queryByText(/토큰 수가 기록되지 않은 호출/)).toBeNull();

    const table = screen.getByText('비용 표').parentElement!;
    const row = Array.from(table.querySelectorAll('tbody tr')).find((row) =>
      row.textContent?.includes('실시간 이미지 생성'),
    )!;

    expect(within(row as HTMLElement).getAllByText('해당 없음')).toHaveLength(
      3,
    );
    expect(
      within(row as HTMLElement).getByText(`${3 * unitCost}원`),
    ).toBeTruthy();

    const chart = screen.getByRole('heading', {
      name: '기능별 일별 비용',
    }).parentElement!;
    const rows = JSON.parse(
      chart.querySelector('[data-rows]')!.getAttribute('data-rows')!,
    );
    const config = JSON.parse(
      chart.querySelector('[data-config]')!.getAttribute('data-config')!,
    );

    expect(rows[0].chat_image).toBe(3 * unitCost);
    expect(
      Object.values(config).map((s: unknown) => (s as { label: string }).label),
    ).toEqual([
      'AI 응답 생성',
      '선택지 생성',
      '실시간 이미지 생성',
      '스토리라인 생성',
      '간편 제작',
    ]);
    expect(
      Object.values(config).map((s: unknown) => (s as { color: string }).color),
    ).toEqual([1, 2, 3, 4, 5].map((i) => `var(--chart-${i})`));

    const help = screen.getByRole('button', {
      name: '서버 DB 출처와 집계 안내',
    });

    act(() => help.focus());
    expect((await screen.findByRole('tooltip')).textContent).toBe(
      `서버 DB 출처 지표입니다. 팀 계정의 호출도 포함합니다. 성공한 호출만 집계합니다. 실시간 이미지는 장당 ${unitCost}원으로 계산하며 턴당 원가와 스토리당 원가에는 넣지 않습니다. 표지와 인물 이미지 생성 비용은 포함하지 않습니다.`,
    );
  },
);
