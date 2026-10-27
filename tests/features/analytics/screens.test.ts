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
import { analyticsRefetch } from '@/features/analytics/range';
import type {
  ActivityResponse,
  AiCostResponse,
  CampaignAnalyticsResponse,
  ChatOptionResponse,
  PlatformCounts,
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

const funnelUrl = (funnel: string, query = '') =>
  `/api/conversion/funnels/${funnel}?from=2026-10-17&to=2026-10-23${query}`;

it('전환 퍼널은 선택 없이 다섯 카드를 순서대로 동시에 요청하고 플랫폼 배지를 보인다', async () => {
  draw('conversion');

  await waitFor(() =>
    expect(screen.getAllByText('첫 단계 사용자 수')).toHaveLength(5),
  );
  expect(screen.queryByRole('combobox', { name: '퍼널' })).toBeNull();
  expect(
    screen
      .getAllByRole('heading', { level: 3 })
      .map((node) => node.textContent)
      .filter((text) =>
        [
          '웹 첫 접속',
          '앱 첫 접속',
          '간편 제작',
          '상세 진입 채팅',
          '게스트 한도 로그인',
        ].includes(text ?? ''),
      ),
  ).toEqual([
    '웹 첫 접속',
    '앱 첫 접속',
    '간편 제작',
    '상세 진입 채팅',
    '게스트 한도 로그인',
  ]);
  expect(requests.toSorted()).toEqual(
    [
      funnelUrl('web-first-visit'),
      funnelUrl('android-first-visit'),
      funnelUrl('story-creation', '&platform=web'),
      funnelUrl('story-detail-chat', '&platform=web'),
      funnelUrl('guest-limit-login', '&platform=web'),
    ].toSorted(),
  );

  const badge = (title: string) =>
    within(screen.getByRole('region', { name: title })).getAllByText(
      /^(웹|앱)$/,
    )[0].textContent;

  expect(badge('웹 첫 접속')).toBe('웹');
  expect(badge('앱 첫 접속')).toBe('앱');
  expect(badge('간편 제작')).toBe('웹');
  expect(badge('게스트 한도 로그인')).toBe('웹');
});
it('조건 줄의 앱은 세 퍼널만 다시 요청하고 첫 접속 두 카드는 다시 요청하지 않는다', async () => {
  const view = draw('conversion');

  await waitFor(() =>
    expect(screen.getAllByText('첫 단계 사용자 수')).toHaveLength(5),
  );
  fireEvent.change(screen.getByRole('combobox', { name: '플랫폼' }), {
    target: { value: 'android' },
  });
  requests.length = 0;
  view.go();
  await waitFor(() => expect(requests).toHaveLength(3));
  expect(requests.toSorted()).toEqual(
    [
      funnelUrl('story-creation', '&platform=android'),
      funnelUrl('story-detail-chat', '&platform=android'),
      funnelUrl('guest-limit-login', '&platform=android'),
    ].toSorted(),
  );
  await screen.findByText('로그인 성공 (구글과 카카오 합)');
  expect(screen.getByText('116.7%')).toBeTruthy();
  expect(screen.queryByText(/로그인 성공은 구글과 카카오/)).toBeNull();

  const help = within(
    screen.getByRole('region', { name: '게스트 한도 로그인' }),
  ).getByRole('button', { name: '전환 집계 안내' });

  act(() => help.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(help.getAttribute('aria-describedby')).toBe(tooltip.id);
  expect(tooltip.textContent).toContain('로그인 성공은 구글과 카카오');
});
it('간편 제작 요청만 503이면 그 카드에만 사용 불가를 보이고 다시 시도는 그 요청만 보낸다', async () => {
  fail = '/conversion/funnels/story-creation';
  draw('conversion');

  const card = screen.getByRole('region', { name: '간편 제작' });

  await within(card).findByText('Amplitude 지표를 불러올 수 없음');
  await waitFor(() =>
    expect(screen.getAllByText('첫 단계 사용자 수')).toHaveLength(4),
  );
  expect(screen.getAllByText('Amplitude 지표를 불러올 수 없음')).toHaveLength(
    1,
  );
  requests.length = 0;
  fail = '';
  fireEvent.click(within(card).getByRole('button', { name: '다시 시도' }));
  await within(card).findByText('첫 단계 사용자 수');
  expect(requests).toEqual([funnelUrl('story-creation', '&platform=web')]);
});
it('예전 퍼널 링크의 funnel은 읽지 않고 다섯 카드를 모두 보인다', async () => {
  nav.search = 'funnel=story-creation';
  draw('conversion');
  await waitFor(() =>
    expect(screen.getAllByText('첫 단계 사용자 수')).toHaveLength(5),
  );
  expect(screen.queryByRole('alert')).toBeNull();
});
it('도달률의 빈 분모는 채팅 없음과 대상 채팅 없음으로 구분한다', async () => {
  nav.search = 'tab=turn-reach';
  draw('conversion');
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
  expect(screen.getAllByText('비용 기록 없음').length).toBeGreaterThan(0);
  expect(screen.getAllByText('모델 정보 없음').length).toBeGreaterThan(0);
  expect(screen.getByText('계산할 수 없음')).toBeTruthy();
  expect(screen.getByText(/토큰 수가 기록되지 않은 호출/)).toBeTruthy();
  expect(
    screen.getByText(/사용량은 있으나 비용이 0원인 모델: UNPRICED/),
  ).toBeTruthy();
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
it('상세 진입 채팅 카드의 대상 스토리는 그 카드 요청만 다시 보내고 잘못된 값은 그 카드만 막는다', async () => {
  const view = draw('conversion');

  await waitFor(() =>
    expect(screen.getAllByText('첫 단계 사용자 수')).toHaveLength(5),
  );
  expect(requests).toContain(funnelUrl('story-detail-chat', '&platform=web'));

  const card = screen.getByRole('region', { name: '상세 진입 채팅' });
  const input = within(card).getByRole('textbox', {
    name: '대상 스토리 공개 식별자',
  });

  fireEvent.change(input, {
    target: { value: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' },
  });
  fireEvent.submit(input.closest('form')!);
  requests.length = 0;
  view.go();
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]).toBe(
    funnelUrl(
      'story-detail-chat',
      '&storyId=3f2504e0-4f89-41d3-9a0c-0305e82c3301&platform=web',
    ),
  );
  view.change('storyId=abc');
  expect(within(card).getByRole('alert').textContent).toContain(
    '스토리 공개 식별자 형식',
  );
  expect(screen.getAllByText('첫 단계 사용자 수')).toHaveLength(4);
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
    '서버 DB 출처 지표입니다. 팀 계정은 제외합니다. 가입 경로는 처음 연결한 소셜 계정 기준입니다. 누적 가입자는 서비스 시작부터 센 값이며 탈퇴한 회원을 포함합니다. 탈퇴 뒤 같은 소셜 계정으로 다시 가입한 회원은 새 계정만 셉니다.',
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
        calls: 2,
        callsWithoutTokens: 0,
        inputTokens: 1000,
        outputTokens: 500,
        costKrw: 7,
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
      costKrw: 7 + 3 * unitCost,
      costPerTurnKrw: 3.5,
      costPerStoryKrw: null,
    };
    data.unpricedModels = [];
    data.unmapped = [];
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(data));
    draw('quality');
    await screen.findByText('총 AI 비용');
    expect(screen.getByText(`${7 + 3 * unitCost}원`)).toBeTruthy();
    expect(
      within(
        screen.getByRole('heading', { name: '턴당 원가' }).parentElement!,
      ).getByText('3.5원'),
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
      name: 'Langfuse 출처와 집계 안내',
    });

    act(() => help.focus());
    expect((await screen.findByRole('tooltip')).textContent).toBe(
      `Langfuse 출처 지표이며 2026-10-23 12:00 KST에 받은 값입니다. 금액은 Langfuse가 모델 단가로 계산한 비용을 1달러 1400원으로 바꾼 값이고 호출 수와 토큰 수는 서버 DB 기록입니다. 팀 계정의 호출도 포함합니다. 금액은 실패한 호출 과정의 비용도 포함하고 호출 수와 토큰 수는 성공한 호출만 셉니다. 실시간 이미지는 장당 ${unitCost}원으로 계산하며 턴당 원가와 스토리당 원가에는 넣지 않습니다. 간편 제작에는 표지와 인물 이미지 비용이 포함됩니다.`,
    );
  },
);

it('Langfuse 비용은 실제 0·기록 없음·준비 중을 구분하고 미연결 비용을 계열에 넣지 않는다', async () => {
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
  draw('quality');
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

  const chart = screen.getByRole('heading', {
    name: '기능별 일별 비용',
  }).parentElement!;
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

it('AI 비용 요약은 서버 합계와 원가를 그대로 보이며 연결 누락 안내는 값이 있을 때만 보인다', async () => {
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
  draw('quality');
  await screen.findByText('총 AI 비용');
  expect(screen.getByText('7원')).toBeTruthy();
  expect(screen.getByText('3.5원')).toBeTruthy();
  expect(screen.queryByText(/기능에 연결되지 않은 Langfuse 추적/)).toBeNull();
  expect(screen.queryByText(/사용량은 있으나 비용이/)).toBeNull();
  expect(screen.queryByText(/토큰 수가 기록되지 않은 호출/)).toBeNull();
});

it('AI 비용 503은 전용 안내와 같은 요청의 다시 시도를 제공하고 다른 탭을 가리지 않는다', async () => {
  nav.search = 'tab=ai-cost';
  fail = 'ai-cost';

  const view = draw('quality');

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
  expect(requests).toEqual([url, url]);
  view.change('tab=chat-options');
  expect(await screen.findByText('모델별 비중')).toBeTruthy();
  expect(screen.queryByText('AI 비용을 불러올 수 없음')).toBeNull();
});

it('AI 비용 pendingDates는 60초 뒤 같은 범위를 재요청하고 준비 완료 후 멈춘다', async () => {
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
  draw('quality');

  const settle = async () =>
    act(async () => {
      for (let i = 0; i < 6; i++) {
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(1);
      }

      await realDelay(0);
    });

  await settle();
  expect(screen.getByText(/준비 중 날짜 1개/)).toBeTruthy();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60001);
  });
  await settle();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toBe(requests[1]);
  expect(screen.queryByText(/준비 중 날짜 1개/)).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
  });
  expect(requests).toHaveLength(2);
});

it('AI 비용은 보관 만료·준비 중·조합 기록 없음과 이미지 비용을 따로 표시한다', async () => {
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
  draw('quality');
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

  const chart = screen.getByRole('heading', {
    name: '기능별 일별 비용',
  }).parentElement!;
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

it.each([
  [
    'users',
    '',
    '리텐션과 평균 세션 길이의 전체는 국내 조건으로 별도 조회한 값입니다.',
  ],
  [
    'conversion',
    '',
    '웹과 앱 모두 국가가 한국이거나 국가 정보가 없는 사용자만 집계합니다. 팀 계정은 제외하지 않습니다.',
  ],
  [
    'quality',
    '',
    '여러 조건으로 활동한 사람은 사용자 수에 두 번 들 수 있습니다.',
  ],
] as const)(
  '%s 출처 도움말은 플랫폼 집계 조건을 표시한다',
  async (name, search, phrase) => {
    nav.search = search;
    draw(name);

    const button = await screen.findByRole('button', {
      name: 'Amplitude 출처와 집계 안내',
    });

    act(() => button.focus());
    expect((await screen.findByRole('tooltip')).textContent).toContain(phrase);
  },
);

it('보관 시작일 전이라도 expiredDates에 없으면 조합별 비용 기록 없음이다', async () => {
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
  draw('quality');
  await screen.findByText('총 AI 비용');
  expect(screen.queryByText('보관 기간 지남')).toBeNull();
  expect(screen.getAllByText('비용 기록 없음').length).toBeGreaterThan(0);
});

const precedes = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const chartRows = (label: string) =>
  JSON.parse(
    screen
      .getByLabelText(label)
      .querySelector('[data-rows]')!
      .getAttribute('data-rows')!,
  ) as Record<string, unknown>[];

it.each([false, true])(
  '가입 경로는 구글과 카카오만 보이고 other(%s)를 읽지 않는다',
  async (withOther) => {
    nav.search = 'tab=signups&from=2026-10-22&to=2026-10-23';
    modifyResponse('/api/users/signups', (value) => {
      const data = value as SignupResponse;

      data.daily = data.daily.map((day) => ({
        ...day,
        signups: {
          total: 3,
          google: 2,
          kakao: 1,
          ...(withOther ? { other: 9 } : {}),
        },
      }));

      return data;
    });
    draw('users');
    await screen.findByText('가입 경로');
    expect(screen.getByText('구글 4명, 카카오 2명')).toBeTruthy();
    expect(
      Object.keys(
        JSON.parse(
          screen
            .getByLabelText('신규 가입자 추이')
            .getAttribute('data-config')!,
        ),
      ),
    ).toEqual(['total', 'google', 'kakao']);
    expect(screen.queryByText(/그 외/)).toBeNull();
    expect(screen.queryByText(/9명/)).toBeNull();
  },
);
it('플랫폼별 신규 가입자는 준비된 날짜의 웹, 앱, 플랫폼 없음 합과 Amplitude 출처를 보인다', async () => {
  nav.search = 'tab=signups&from=2026-10-22&to=2026-10-23';
  modifyResponse('/api/users/signups', (value) => {
    const data = value as SignupResponse;

    data.daily[0].signupsByPlatform = {
      all: 12,
      web: 4,
      android: 7,
      unknown: 1,
    };
    data.daily[1].signupsByPlatform = {
      all: 5,
      web: 2,
      android: 3,
      unknown: 0,
    };

    return data;
  });
  draw('users');
  expect(
    await screen.findByText('웹 6명, 앱 10명, 플랫폼 없음 1명'),
  ).toBeTruthy();
  expect(
    Object.values(
      JSON.parse(
        screen
          .getByLabelText('플랫폼별 신규 가입자 추이')
          .getAttribute('data-config')!,
      ) as Record<string, { label: string }>,
    ).map((item) => item.label),
  ).toEqual(['전체', '웹', '앱', '플랫폼 없음']);

  const sources = screen.getAllByRole('button', {
    name: '플랫폼별 신규 가입자 출처와 집계 안내',
  });

  expect(sources).toHaveLength(2);
  expect(sources[0].textContent).toContain('Amplitude');
  act(() => sources[0].focus());
  expect((await screen.findByRole('tooltip')).textContent).toBe(
    'Amplitude의 가입 이벤트로 셉니다. 국가가 한국이거나 국가 정보가 없는 사용자만 셉니다. 구글과 카카오 경로별 수를 더하므로 같은 날 두 경로로 가입하면 두 번 셉니다. 팀 계정이 포함돼 서버 DB 신규 가입자와 다를 수 있습니다. 2026. 10. 23. 오전 11:55 KST 집계 기준',
  );
});
it('플랫폼별 가입 준비 중 날짜는 플랫폼별 차트만 끊고 서버 DB 차트는 모든 날짜를 그린다', async () => {
  nav.search = 'tab=signups&from=2026-10-17&to=2026-10-23';
  modifyResponse('/api/users/signups', (value) => {
    const data = value as SignupResponse;

    data.pendingDates = ['2026-10-23'];
    data.daily = data.daily.map((day) => ({
      ...day,
      signupsByPlatform:
        day.date === '2026-10-23'
          ? null
          : { all: 3, web: 1, android: 2, unknown: 0 },
    }));

    return data;
  });
  draw('users');
  await screen.findByText(/준비 중 날짜 1개/);

  for (const label of [
    '신규 가입자 추이',
    '누적 가입자 추이',
    '게스트 이관 회원 추이',
  ]) {
    const rows = chartRows(label);

    expect(rows).toHaveLength(7);
    expect(rows.every((row) => !('pending' in row))).toBe(true);
  }

  // 준비 중 알림은 서버 DB 차트 뒤, 플랫폼별 차트 바로 앞에 온다.
  const notice = screen.getByText(/준비 중 날짜 1개/);

  expect(precedes(screen.getByLabelText('게스트 이관 회원 추이'), notice)).toBe(
    true,
  );
  expect(
    precedes(notice, screen.getByLabelText('플랫폼별 신규 가입자 추이')),
  ).toBe(true);

  const platformRows = chartRows('플랫폼별 신규 가입자 추이');

  expect(platformRows.at(-1)).toEqual({ date: '2026-10-23', pending: 1 });
  expect(platformRows[0].web).toBe(1);
  expect(screen.getAllByText('준비 중').length).toBeGreaterThan(0);
});
it('플랫폼 필드가 없는 서버 응답은 플랫폼별 자리를 준비 중으로 두고 재요청하지 않는다', async () => {
  nav.search = 'tab=signups&from=2026-10-17&to=2026-10-23';

  let legacy: Record<string, unknown> = {};

  modifyResponse('/api/users/signups', (value) => {
    const data = value as SignupResponse;

    legacy = {
      ...data,
      platformAsOf: undefined,
      pendingDates: undefined,
      daily: data.daily.map((day) => ({
        ...day,
        signupsByPlatform: undefined,
      })),
    };

    return legacy;
  });
  draw('users');
  await screen.findByRole('heading', { name: '누적 가입자' });
  expect(screen.queryByLabelText('플랫폼별 신규 가입자 추이')).toBeNull();
  expect(
    screen.getAllByRole('heading', { name: '플랫폼별 신규 가입자' }),
  ).toHaveLength(2);
  expect(screen.getAllByText('준비 중')).toHaveLength(2);
  expect(screen.queryByText(/준비 중 날짜/)).toBeNull();
  expect(
    analyticsRefetch({ state: { data: JSON.parse(JSON.stringify(legacy)) } }),
  ).toBe(false);
});
it('캠페인 추이는 웹 신규 가입자와 앱 신규 가입자를 나눠 보인다', async () => {
  modifyResponse('/api/campaigns/analytics', (value) => {
    const data = value as CampaignAnalyticsResponse;

    data.totals.signups = { all: 39, ads: 33, nonAds: 6 };
    data.totals.androidSignups = 52;

    return data;
  });
  draw('acquisition');

  const web = (
    await screen.findAllByRole('heading', {
      name: '웹 신규 가입자',
    })
  )[0].parentElement!;

  expect(within(web).getByText('39명')).toBeTruthy();
  expect(
    within(
      screen.getAllByRole('heading', { name: '앱 신규 가입자' })[0]
        .parentElement!,
    ).getByText('52명'),
  ).toBeTruthy();
  expect(
    chartRows('웹 신규 가입자 추이').every(
      (row) => !('androidSignups' in row) && !('value' in row),
    ),
  ).toBe(true);
  expect(chartRows('앱 신규 가입자 추이')[0].value).toBe(6);

  const help = screen.getByRole('button', {
    name: 'Amplitude 출처와 집계 안내',
  });

  act(() => help.focus());
  expect((await screen.findByRole('tooltip')).textContent).toContain(
    '앱 신규 가입자는 광고 구분 없이 따로 세고, 나머지 지표는 웹 사용자만 셉니다.',
  );
});
it('턴 도달률의 플랫폼별 지표 대상은 기본 all을 보내고 회원 선택은 URL과 요청에 member를 싣는다', async () => {
  nav.search = 'tab=turn-reach';

  const view = draw('conversion');

  await screen.findByText('게스트에서 회원으로');
  expect(requests.at(-1)).toBe(
    '/api/conversion/turn-reach?from=2026-09-24&to=2026-10-23&segment=all',
  );
  fireEvent.change(
    screen.getByRole('combobox', { name: '플랫폼별 지표 대상' }),
    { target: { value: 'member' } },
  );
  expect(nav.push.mock.calls.at(-1)![0]).toContain('segment=member');
  view.go();
  await waitFor(() =>
    expect(requests.at(-1)).toBe(
      '/api/conversion/turn-reach?from=2026-09-24&to=2026-10-23&segment=member',
    ),
  );

  // 대상 표시는 서버 DB 영역 뒤, 플랫폼별 영역 바로 앞에 온다.
  const audience = await screen.findByText('플랫폼별 지표 대상 회원');

  expect(precedes(screen.getByText('게스트에서 회원으로'), audience)).toBe(
    true,
  );
  expect(
    precedes(
      audience,
      screen.getByRole('heading', { name: '플랫폼별 1턴 대비 도달률' }),
    ),
  ).toBe(true);
  expect(
    Object.keys(
      JSON.parse(
        screen.getByLabelText('N턴 이상 도달률').getAttribute('data-config')!,
      ),
    ),
  ).toEqual(['all', 'guest', 'member']);
});
it('플랫폼별 도달률 platforms null은 그 자리만 준비 중이고 60초 재요청 대상이다', async () => {
  nav.search = 'tab=turn-reach&from=2026-10-17&to=2026-10-23';

  let payload: Record<string, unknown> = {};

  modifyResponse('/api/conversion/turn-reach', (value) => {
    payload = {
      ...(value as object),
      platforms: null,
      platformAsOf: null,
      pendingDates: [
        '2026-10-17',
        '2026-10-18',
        '2026-10-19',
        '2026-10-20',
        '2026-10-21',
        '2026-10-22',
        '2026-10-23',
      ],
    };

    return payload;
  });
  draw('conversion');
  await screen.findByText('게스트에서 회원으로');
  expect(screen.getByText('전체 채팅 수')).toBeTruthy();
  expect(screen.getByText(/준비 중 날짜 7개/)).toBeTruthy();
  expect(
    screen.getByRole('heading', { name: '플랫폼별 1턴 대비 도달률' }),
  ).toBeTruthy();
  expect(screen.getAllByText('준비 중').length).toBeGreaterThan(0);
  expect(analyticsRefetch({ state: { data: payload } })).toBe(60000);
  expect(
    analyticsRefetch({
      state: { data: { ...payload, pendingDates: [], platforms: undefined } },
    }),
  ).toBe(false);
});
it('채팅 옵션 대상 게스트는 segment=guest만 바꾸고 서버 DB 값은 그대로다', async () => {
  nav.search = 'tab=chat-options';

  const view = draw('quality');

  await screen.findByText('모델별 비중');
  expect(requests.at(-1)).toContain('segment=all');

  const chats = () =>
    screen.getAllByRole('heading', { name: '채팅 수' })[0].parentElement!
      .textContent;
  const before = chats();

  fireEvent.change(
    screen.getByRole('combobox', { name: '플랫폼별 지표 대상' }),
    { target: { value: 'guest' } },
  );
  view.go();
  await waitFor(() => expect(requests.at(-1)).toContain('segment=guest'));

  const audience = await screen.findByText('플랫폼별 지표 대상 게스트');

  expect(precedes(screen.getByText('모델별 비중'), audience)).toBe(true);
  expect(
    precedes(
      audience,
      screen.getByRole('heading', { name: '페르소나 시작 클릭 비중' }),
    ),
  ).toBe(true);
  expect(chats()).toBe(before);
});
it('페르소나 시작 클릭 비중과 플랫폼별 모델 턴 수는 준비된 날짜 합으로 계산한다', async () => {
  nav.search = 'tab=chat-options&from=2026-10-22&to=2026-10-23';
  modifyResponse('/api/quality/chat-options', (value) => {
    const data = value as ChatOptionResponse;
    const zero = { all: 0, web: 0, android: 0, unknown: 0 };

    data.daily = data.daily.map((day, i) => ({
      ...day,
      chatStarts: i ? zero : { all: 15, web: 10, android: 5, unknown: 0 },
      personaChatStarts: i ? zero : { all: 2, web: 2, android: 0, unknown: 0 },
      platformTurnsByModel: i
        ? ({} as Record<string, PlatformCounts>)
        : {
            LITE: { all: 7, web: 4, android: 3, unknown: 0 },
            AURORA: { all: 1, web: 1, android: 0, unknown: 0 },
          },
    }));

    return data;
  });
  draw('quality');

  const persona = (
    await screen.findByRole('heading', { name: '페르소나 시작 클릭 비중' })
  ).parentElement!.parentElement!;

  expect(
    within(persona)
      .getAllByRole('definition')
      .map((node) => node.textContent),
  ).toEqual(['13.3%', '20.0%', '0.0%', '집계 대상 클릭 없음']);
  expect(
    within(persona).getByRole('button', {
      name: '페르소나 시작 클릭 비중 출처와 집계 안내',
    }).textContent,
  ).toContain('Amplitude');

  const table = screen.getByRole('heading', { name: '플랫폼별 모델 턴 수' })
    .parentElement!.parentElement!;

  expect(
    within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      ),
  ).toEqual([
    ['오로라', '1턴', '1턴', '0턴', '0턴'],
    ['라이트', '7턴', '4턴', '3턴', '0턴'],
  ]);
  expect(
    within(table).getByRole('button', {
      name: '플랫폼별 모델 턴 수 출처와 집계 안내',
    }).textContent,
  ).toContain('Amplitude');
});
