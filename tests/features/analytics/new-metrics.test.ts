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
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  type DomainName,
  DomainScreen,
} from '@/features/analytics/domain-screen';
import { getDashboardCharts } from '@/fixtures/dashboard';
import { metricFixture } from '@/fixtures/metrics';

import { newMetricSamples } from '../../helpers/new-metrics';

const nav = vi.hoisted(() => ({ search: '', path: '', push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => nav.path,
  useRouter: () => ({ push: nav.push }),
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
let payloads: typeof newMetricSamples;
let fail: string;
let pending = false;
let expired = false;
let zeroRevenue = false;
const requests: string[] = [];
const endpoints = {
  payments: '/payments/metrics',
  credits: '/credits/metrics',
  consumption: '/stories/consumption',
  depth: '/chats/engagement',
  moderation: '/moderation/metrics',
};

beforeEach(() => {
  nav.search = 'from=2026-10-26&to=2026-10-27';
  nav.push.mockReset();
  requests.length = 0;
  payloads = structuredClone(newMetricSamples);
  fail = '';
  pending = false;
  expired = false;
  zeroRevenue = false;
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 60000, gcTime: Infinity },
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requests.push(url);

      const parsed = new URL(url, 'http://localhost');

      if (fail && parsed.pathname.includes(fail))
        return Response.json({ message: '실패' }, { status: 500 });

      for (const [key, endpoint] of Object.entries(endpoints))
        if (parsed.pathname === `/api${endpoint}`)
          return Response.json({
            ...payloads[key as keyof typeof payloads],
            from: '2026-10-26',
            to: '2026-10-27',
          });

      if (parsed.pathname === '/api/dashboard/charts')
        return Response.json({
          ...getDashboardCharts({ from: '2026-10-26', to: '2026-10-27' }),
          totals: { revenue: zeroRevenue ? 0 : 190000 },
        });

      const data = metricFixture(
        parsed.pathname.replace('/api', ''),
        parsed.searchParams,
      );

      if (parsed.pathname === '/api/quality/ai-cost')
        return Response.json({
          ...data,
          totals: { costKrw: 61200 },
          pendingDates: pending ? ['2026-10-26'] : [],
          expiredDates: expired ? ['2026-10-26'] : [],
        });

      return Response.json(data);
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function draw(domain: DomainName, tab: string) {
  nav.path = `/analytics/${domain}`;
  nav.search += `&tab=${tab}`;

  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(DomainScreen, { domain }),
    ),
  );
}

const area = (name: string) =>
  within(screen.getByRole('region', { name: `${name} 영역` }));

it('수익 매출은 일별 추이·결제 지표·마진 순서로 세 요청만 보낸다', async () => {
  draw('revenue', 'sales');
  await screen.findByRole('heading', { name: '상품별 매출' });
  expect(
    requests.map((url) => new URL(url, 'http://localhost').pathname).sort(),
  ).toEqual([
    '/api/dashboard/charts',
    '/api/payments/metrics',
    '/api/quality/ai-cost',
  ]);
  expect(screen.queryByRole('combobox', { name: '플랫폼' })).toBeNull();
  expect(area('결제 지표').getByText('5.6%')).toBeTruthy();
  expect(area('결제 지표').getByText('결제 23명 / 활성 412명')).toBeTruthy();
  expect(area('결제 지표').getByText('8,261원')).toBeTruthy();
  expect(area('결제 지표').getByText('재결제 13건 104,000원')).toBeTruthy();
  expect(area('결제 지표').getByText('환불 1건')).toBeTruthy();
  expect(area('마진').getByText('128,800원')).toBeTruthy();
  expect(area('마진').getByText('67.8%')).toBeTruthy();
  expect(
    screen.getByRole('button', { name: '서버 DB와 Langfuse 출처와 집계 안내' }),
  ).toBeTruthy();
  expect(screen.getAllByText('당일').length).toBeGreaterThan(0);
});
it('결제의 null 비율은 각 분모에 맞는 문구를 쓰고 실제 0은 유지한다', async () => {
  Object.assign(payloads.payments, {
    activeMembers: 0,
    payingMembers: 0,
    conversionRate: null,
    arppu: null,
    refundRate: null,
  });
  draw('revenue', 'sales');
  await screen.findByText('활성 회원 없음');
  expect(screen.getByText('결제 없음')).toBeTruthy();
  expect(screen.getByText('완료 주문 없음')).toBeTruthy();
});
it('마진 준비 중은 비용·마진·비율만 가리고 결제 금액과 부분 집계 안내는 보인다', async () => {
  pending = true;
  draw('revenue', 'sales');
  await screen.findByText('AI 비용은 준비된 날짜만 더했습니다.');
  expect(area('마진').getAllByText('준비 중')).toHaveLength(3);
  expect(area('마진').getByText('190,000원')).toBeTruthy();
});
it.each([
  ['content', 'consumption', '소비', '창작자', '/api/stories/consumption'],
  [
    'content',
    'moderation',
    '검수 판정',
    '거절 사유',
    '/api/moderation/metrics',
  ],
  ['chats', 'depth', '몰입', '몰입', '/api/chats/engagement'],
] as const)(
  '%s %s는 새 영역만 조회하고 플랫폼·대상을 숨긴다',
  async (domain, tab, first, last, path) => {
    nav.search += '&platform=web&segment=guest';
    draw(domain, tab);
    await screen.findByRole('region', { name: `${first} 영역` });
    expect(
      await screen.findByRole('region', { name: `${last} 영역` }),
    ).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: '플랫폼' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: '대상' })).toBeNull();
    expect(requests).toEqual([
      `${path}?from=2026-10-26&to=2026-10-27${tab === 'consumption' ? '&limit=20' : ''}`,
    ]);
  },
);
it('소비와 창작자는 서버 값과 순위 순서를 그대로 표시한다', async () => {
  payloads.consumption.ranking[2].deleted = true;
  draw('content', 'consumption');
  await screen.findByText('오리지널 8편');
  expect(area('소비').getByText('플레이 순위').closest('details')).toBeNull();
  expect(area('소비').getByText('20.0%')).toBeTruthy();
  expect(area('소비').getByText('62.1%')).toBeTruthy();
  expect(area('창작자').getByText('14.1%')).toBeTruthy();
  expect(area('창작자').getByText('37.3%')).toBeTruthy();
  expect(
    area('창작자').getByText('직전 기간 창작자 51명 중 19명'),
  ).toBeTruthy();

  const links = area('소비').getAllByRole('link');

  expect(links.map((link) => link.textContent)).toEqual(
    payloads.consumption.ranking.map((row) => row.title),
  );
  expect(links[0].getAttribute('href')).toBe(
    `/stories/${payloads.consumption.ranking[0].storyId}`,
  );
  expect(area('소비').getAllByText('오리지널')).toHaveLength(2);
  expect(area('소비').getByText('삭제됨')).toBeTruthy();
});
it('이프 경제는 사유 순서와 현재 배지·잔액 구성·전체 기준을 표시한다', async () => {
  nav.search += '&platform=web&segment=guest';
  draw('revenue', 'credits');
  await screen.findByText('회원 1,240명');
  expect(area('이프 경제').getByText('65.1%')).toBeTruthy();
  expect(area('이프 경제').getAllByText('현재')).toHaveLength(3);
  expect(area('이프 경제').getByText('30일 안 만료 182,300이프')).toBeTruthy();
  expect(
    area('이프 경제').getAllByText('플랫폼과 대상 전체 기준').length,
  ).toBeGreaterThan(0);
  expect(requests).toContain(
    '/api/credits/metrics?from=2026-10-26&to=2026-10-27',
  );
  expect(requests).toContain(
    '/api/quality/client?from=2026-10-26&to=2026-10-27&platform=web&segment=guest',
  );
});
it('검수는 현재 보류 링크와 글·이미지 사유를 표시한다', async () => {
  draw('content', 'moderation');
  await screen.findByText('15.2%');
  expect(area('검수 판정').getAllByText('현재')).toHaveLength(2);
  expect(area('검수 판정').getByRole('link').getAttribute('href')).toBe(
    '/moderation/submissions?status=HELD',
  );
  expect(
    area('거절 사유').getByRole('heading', { name: '거절 사유', level: 3 }),
  ).toBeTruthy();
  expect(area('거절 사유').getAllByText('글')).toHaveLength(2);
  expect(area('거절 사유').getByText('이미지')).toBeTruthy();
});
it('몰입은 카드 셋과 차트 다섯, null 문구를 표시한다', async () => {
  Object.assign(payloads.depth.daily[1], {
    turnsPerActiveMember: null,
    continuationRate: null,
    regenerationRate: null,
    stickiness: null,
  });
  draw('chats', 'depth');
  await screen.findByText('26.4턴');

  const region = area('몰입');

  expect(region.getAllByLabelText(/추이$/)).toHaveLength(5);

  for (const text of [
    '활성 회원 없음',
    '전날 활성 회원 없음',
    '턴 없음',
    '30일 활성 회원 없음',
  ])
    expect(region.getAllByText(text).length).toBeGreaterThan(0);

  expect(region.getAllByText('41.4%').length).toBeGreaterThan(0);
  expect(region.getAllByText('4.4%').length).toBeGreaterThan(0);
  expect(region.getAllByText('14.8%').length).toBeGreaterThan(0);
});
it('소비·검수·이프의 null 문구는 값별로 다르다', async () => {
  Object.assign(payloads.consumption, {
    playedRate: null,
    topConcentration: null,
  });
  Object.assign(payloads.consumption.creators, {
    rate: null,
    retentionRate: null,
  });
  draw('content', 'consumption');
  await screen.findByText('공개 스토리 없음');
  expect(screen.getByText('채팅 없음')).toBeTruthy();
  expect(screen.getByText('활성 회원 없음')).toBeTruthy();
  expect(screen.getByText('직전 기간 창작자 없음')).toBeTruthy();
});
it('신규 카드와 차트 제목은 정본의 네 줄 정의 도움말을 제공한다', async () => {
  draw('content', 'consumption');
  await screen.findByText('오리지널 8편');
  act(() =>
    screen.getByRole('button', { name: '공개 스토리 지표 정의' }).focus(),
  );

  const tip = await screen.findByRole('tooltip');

  for (const label of ['출처', '대상', '계산', '날짜'])
    expect(within(tip).getByText(label)).toBeTruthy();
});

it('마진 준비 중은 60초 뒤 AI 비용만 다시 요청하고 준비 완료 뒤 멈춘다', async () => {
  vi.useFakeTimers();
  pending = true;
  draw('revenue', 'sales');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600);
  });
  expect(
    requests.filter((url) => url.includes('/quality/ai-cost')),
  ).toHaveLength(1);
  pending = false;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(
    requests.filter((url) => url.includes('/quality/ai-cost')),
  ).toHaveLength(2);
  expect(
    requests.filter((url) => url.includes('/payments/metrics')),
  ).toHaveLength(1);
  expect(
    requests.filter((url) => url.includes('/dashboard/charts')),
  ).toHaveLength(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
  });
  expect(
    requests.filter((url) => url.includes('/quality/ai-cost')),
  ).toHaveLength(2);
});
it('마진은 결제 0일 때 결제 없음이고 만료 날짜만으로 준비 중이 되지 않는다', async () => {
  zeroRevenue = true;
  expired = true;
  draw('revenue', 'sales');
  await screen.findByText('결제 없음');
  expect(area('마진').getByText(/Langfuse 보관 기간/)).toBeTruthy();
  expect(area('마진').queryByText('준비 중')).toBeNull();
});
it('결제 지표 실패는 일별 추이와 마진을 가리지 않으며 그 요청만 다시 시도한다', async () => {
  fail = '/payments/metrics';
  draw('revenue', 'sales');
  await screen.findByText('데이터 불러오기 실패');
  expect(screen.getByLabelText('일별 지표 추이')).toBeTruthy();
  await waitFor(() => expect(area('마진').getByText('128,800원')).toBeTruthy());
  fail = '';
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByRole('heading', { name: '상품별 매출' });
  expect(
    requests.filter((url) => url.includes('/payments/metrics')),
  ).toHaveLength(2);
  expect(
    requests.filter((url) => url.includes('/dashboard/charts')),
  ).toHaveLength(1);
});
it.each([
  ['revenue', 'credits', '소모 비율', '적립 없음'],
  ['content', 'moderation', '거절률', '판정 없음'],
] as const)(
  '%s %s의 null은 %s 값을 %s으로 표시한다',
  async (domain, tab, _label, text) => {
    payloads.credits.sinkRate = null;
    payloads.moderation.rejectionRate = null;
    draw(domain, tab);
    expect(await screen.findByText(text)).toBeTruthy();
  },
);

it('마진의 단일 출처 카드에는 제목 옆 출처를 따로 표시한다', async () => {
  draw('revenue', 'sales');
  await screen.findByText('128,800원');

  const region = area('마진');

  for (const [label, source] of [
    ['결제 금액', '서버 DB'],
    ['AI 비용', 'Langfuse'],
  ] as const) {
    const heading = region.getByRole('heading', { name: label, level: 3 });
    const card = heading.closest('[data-slot="card"]') as HTMLElement;
    const button = within(card).getByRole('button', {
      name: `${source} 출처와 집계 안내`,
    });

    expect(heading.parentElement).toBe(button.parentElement);
    expect(button.textContent).toContain(source);
    act(() => button.focus());

    const tip = await screen.findByRole('tooltip');

    expect(tip.textContent).toContain(`${source} 출처 지표`);
    fireEvent.keyDown(button, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  }

  for (const label of ['마진', '마진율']) {
    const card = region
      .getByRole('heading', { name: label, level: 3 })
      .closest('[data-slot="card"]') as HTMLElement;

    expect(
      within(card).queryByRole('button', { name: /출처와 집계 안내/ }),
    ).toBeNull();
  }
});

it('일별 판정 차트와 수치 표는 승인·거절 및 실행 실패 정의를 모두 설명한다', async () => {
  draw('content', 'moderation');
  await screen.findByText('15.2%');

  const region = area('검수 판정');
  const chart = region
    .getByLabelText('일별 판정 추이')
    .closest('[data-slot="card"]') as HTMLElement;

  for (const details of region.getAllByText('전체 수치 표')) {
    details.closest('details')!.open = true;
  }

  const buttons = [
    within(chart).getByRole('button', { name: '일별 판정 지표 정의' }),
    within(chart).getByRole('button', { name: '전체 수치 표 지표 정의' }),
    ...['승인 (건)', '거절 (건)', '실행 실패 (건)'].map((name) =>
      within(chart).getByRole('button', { name: `${name} 지표 정의` }),
    ),
    region.getByRole('button', { name: '지표 지표 정의' }),
    region.getByRole('button', { name: '값 지표 정의' }),
    ...region
      .getAllByRole('button', { name: '일별 판정 지표 정의' })
      .filter((button) => !chart.contains(button)),
  ];

  for (const button of buttons) {
    act(() => button.focus());

    const tip = await screen.findByRole('tooltip');

    expect(tip.textContent).toContain('제출본의 승인 수와 거절 수');
    expect(tip.textContent).toContain('실행 실패로 끝난 제출본 수');
    fireEvent.keyDown(button, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  }
});
