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
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { DomainScreen } from '@/features/analytics/domain-screen';
import type { InfraMetrics } from '@/features/analytics/infra/types';
import {
  type InfraFixtureScenario,
  infraMetricsFixture,
  infraTablesFixture,
} from '@/fixtures/infra';

const nav = vi.hoisted(() => ({ search: '', push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/analytics/ops',
  useRouter: () => ({ push: nav.push }),
}));
vi.mock('recharts', () => {
  const Box = ({ children }: PropsWithChildren) =>
    createElement('div', null, children);

  return {
    usePlotArea: () => undefined,
    useXAxisScale: () => undefined,
    useYAxisScale: () => undefined,
    LineChart: ({ children, data }: PropsWithChildren<{ data: unknown }>) =>
      createElement('div', { 'data-points': JSON.stringify(data) }, children),
    BarChart: ({ children, data }: PropsWithChildren<{ data: unknown }>) =>
      createElement('div', { 'data-ranking': JSON.stringify(data) }, children),
    Line: ({
      dataKey,
      connectNulls,
      strokeDasharray,
    }: {
      dataKey: string;
      connectNulls: boolean;
      strokeDasharray?: string;
    }) =>
      createElement('span', {
        'data-line': dataKey,
        'data-connect': String(connectNulls),
        'data-dash': strokeDasharray,
      }),
    Bar: Box,
    LabelList: () => null,
    CartesianGrid: () => null,
    XAxis: ({ tickFormatter }: { tickFormatter?: (x: string) => string }) =>
      createElement(
        'span',
        { 'data-x-axis': true },
        tickFormatter?.('2026-11-19T15:05:00Z'),
      ),
    YAxis: ({ domain }: { domain?: unknown }) =>
      createElement('span', { 'data-y-domain': JSON.stringify(domain) }),
  };
});
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({
    children,
    config,
    ...props
  }: PropsWithChildren<{ config: unknown }>) =>
    createElement(
      'div',
      { 'data-config': JSON.stringify(config), ...props },
      children,
    ),
  ChartLegend: () => null,
  ChartLegendContent: () => null,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

let client: QueryClient;
let unavailable = false;
let scenario: InfraFixtureScenario = 'complete';
let edit: (data: InfraMetrics) => void = () => {};
const requests: string[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-20T03:00:00Z'));
  nav.search = '';
  nav.push.mockReset();
  requests.length = 0;
  unavailable = false;
  scenario = 'complete';
  edit = () => {};
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

      const q = new URL(url, 'http://localhost');

      if (q.pathname.endsWith('db-tables'))
        return Response.json(infraTablesFixture(3));

      if (unavailable)
        return Response.json({ message: '권한 거부' }, { status: 503 });

      const data = infraMetricsFixture(
        q.searchParams.get('from') ?? undefined,
        q.searchParams.get('to') ?? undefined,
        scenario,
      );

      edit(data);

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

function draw() {
  const element = () =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(DomainScreen, { domain: 'ops' }),
    );
  const view = render(element());

  return {
    ...view,
    change: (query: string) => {
      nav.search = query;
      view.rerender(element());
    },
  };
}

const card = (label: string) =>
  within(screen.getByRole('group', { name: '요약 지표' }))
    .getByRole('heading', { level: 3, name: label })
    .closest('section')!;
const services = () => screen.findByRole('region', { name: '앱 호스트' });
const rowsOf = (chart: HTMLElement) =>
  JSON.parse(
    chart.querySelector('[data-points]')!.getAttribute('data-points')!,
  ) as Record<string, number | string | null>[];

it('기본 오늘 범위의 요약 카드와 앱 호스트, 요청 구역을 그리고 저장소와 응답을 공유한다', async () => {
  const view = draw();

  await services();
  expect(requests).toEqual([
    '/api/infra/metrics?from=2026-11-20&to=2026-11-20',
  ]);
  expect(
    screen
      .getByRole('tab', { name: '서비스와 요청' })
      .getAttribute('aria-selected'),
  ).toBe('true');
  expect(within(card('사용 가능 메모리')).getByText('1.9GB')).toBeTruthy();
  expect(within(card('사용 가능 메모리')).getByText('전체 4.0GB')).toBeTruthy();
  expect(within(card('CPU 크레딧 잔액')).getByText('331.4크레딧')).toBeTruthy();
  expect(within(card('상태 검사')).getByText('정상')).toBeTruthy();
  expect(within(card('요청 수')).getByText('352회')).toBeTruthy();
  expect(within(card('5xx 응답')).getByText('3회')).toBeTruthy();

  const host = screen.getByRole('region', { name: '앱 호스트' });
  const requestRegion = screen.getByRole('region', { name: '요청' });

  for (const title of [
    'CPU 사용률',
    'CPU 크레딧 잔액',
    '사용 가능 메모리',
    '디스크 여유',
  ])
    expect(within(host).getByLabelText(title)).toBeTruthy();

  for (const title of ['요청 수', '5xx 응답', '응답 시간 p95'])
    expect(within(requestRegion).getByLabelText(title)).toBeTruthy();

  expect(
    within(
      within(requestRegion).getByLabelText('응답 시간 p95').closest('section')!,
    ).getAllByText('182.0ms').length,
  ).toBeGreaterThan(0);
  expect(screen.queryByText(/태스크/)).toBeNull();
  expect(screen.queryByText(/ALB/)).toBeNull();
  view.change('tab=storage');
  await screen.findByText('RDS 여유 스토리지');
  expect(requests).toHaveLength(1);
  expect(within(card('RDS 여유 스토리지')).getByText('18.3GB')).toBeTruthy();
});

it('상태 검사는 실패 구간 수를 세고 5xx와 p95 도움말에 기준을 적는다', async () => {
  edit = (data) => {
    data.host!.statusCheckFailed[10].value = 1;
    data.host!.statusCheckFailed[20].value = 1;
  };
  draw();
  await services();
  expect(within(card('상태 검사')).getByText('실패 2구간')).toBeTruthy();

  const help = screen.getByRole('button', { name: '5xx 응답 도움말' });

  act(() => help.focus());
  expect((await screen.findByRole('tooltip')).textContent).toBe(
    '서버가 돌려준 5xx만 셉니다. 서버가 응답하지 못해 프록시가 돌려준 502와 504는 들어가지 않습니다.',
  );
  fireEvent.keyDown(help, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

  const p95 = screen.getByRole('button', { name: '응답 시간 p95 도움말' });

  act(() => p95.focus());
  expect((await screen.findByRole('tooltip')).textContent).toBe(
    '채팅 스트림처럼 오래 열려 있는 SSE 요청은 빼고 계산합니다.',
  );
});

it('CPU는 0~100% 축에 평균 선이고 수치 표에 평균과 최대를 함께 보인다', async () => {
  draw();
  await services();

  const chart = screen.getByLabelText('CPU 사용률');
  const section = chart.closest('section')!;

  expect(
    chart.querySelector('[data-y-domain]')!.getAttribute('data-y-domain'),
  ).toBe('[0,100]');
  expect(chart.querySelector('[data-x-axis]')!.textContent).toBe('00:05');
  expect(within(section).getByText('CPU (평균 / 최대)')).toBeTruthy();
  expect(within(section).getAllByText('4.1% / 12.3%').length).toBeGreaterThan(
    0,
  );
  expect(rowsOf(chart)[3].cpu).toBeNull();
});

it('디스크 여유는 응답 순서의 마운트 경로 계열이고 여유와 크기를 함께 보이며 메모리 축은 전체 메모리까지다', async () => {
  const view = draw();

  await services();

  const disk = screen.getByLabelText('디스크 여유');

  expect(
    Object.values(JSON.parse(disk.getAttribute('data-config')!)).map(
      (item) => (item as { label: string }).label,
    ),
  ).toEqual(['/', '/data']);

  const section = disk.closest('section')!;

  expect(within(section).getByText('/data (여유 / 크기)')).toBeTruthy();
  expect(within(section).getAllByText('9.9GB / 10.0GB').length).toBeGreaterThan(
    0,
  );

  const memory = screen.getByLabelText('사용 가능 메모리');

  expect(
    JSON.parse(
      memory.querySelector('[data-y-domain]')!.getAttribute('data-y-domain')!,
    ),
  ).toEqual([0, 4.015]);
  view.unmount();
  client.clear();
  edit = (data) => {
    data.hostSystem!.memoryTotalBytes = null;
  };
  draw();
  await services();
  // 축 범위를 주지 않으면 값에 맞춘다(대역은 domain이 없으면 속성을 만들지 않는다).
  expect(
    screen.getByLabelText('사용 가능 메모리').querySelector('[data-y-domain]'),
  ).toBeNull();
  expect(within(card('사용 가능 메모리')).queryByText(/전체/)).toBeNull();
});

it('빈 구간은 선을 끊고 요청 수도 0으로 채우지 않는다', async () => {
  draw();
  await services();

  const rows = rowsOf(screen.getByLabelText('요청 수'));

  expect(rows.slice(0, 3).map((row) => row.requests)).toEqual([312, 0, 40]);
  expect(rows[3].requests).toBeNull();
  expect(
    screen
      .getByLabelText('요청 수')
      .querySelector('[data-connect]')!
      .getAttribute('data-connect'),
  ).toBe('false');
});

it('저장소는 Redis 현재 값 카드와 AOF 상태, OpenSearch 상태를 보이고 Redis에는 차트가 없다', async () => {
  nav.search = 'tab=storage';

  const view = draw();

  await screen.findByText('RDS 여유 스토리지');
  expect(within(card('Redis 메모리')).getByText('2.5MB')).toBeTruthy();
  expect(
    within(card('Redis 메모리')).getByText('한도 268.4MB, 0.9%'),
  ).toBeTruthy();

  const redis = screen.getByRole('region', { name: 'Redis' });

  expect(within(redis).getByText('6개')).toBeTruthy();
  expect(within(redis).getByText('7,450개')).toBeTruthy();
  expect(within(redis).getByText('정상')).toBeTruthy();
  expect(redis.querySelector('[data-points]')).toBeNull();

  const search = screen.getByRole('region', { name: 'OpenSearch' });

  expect(within(search).getByText('green')).toBeTruthy();
  expect(
    within(card('OpenSearch 디스크 여유')).getByText('114.9GB'),
  ).toBeTruthy();
  expect(
    within(card('OpenSearch 디스크 여유')).getByText('전체 137.2GB'),
  ).toBeTruthy();
  expect(
    within(card('OpenSearch JVM 메모리 압박')).getByText('9.0%'),
  ).toBeTruthy();
  view.change('tab=storage&range=last7d');
  await waitFor(() => expect(requests).toHaveLength(2));
  await screen.findByText('RDS 여유 스토리지');
  expect(
    screen
      .getByRole('region', { name: 'Redis' })
      .querySelector('[data-points]'),
  ).toBeNull();
});

it('Redis 한도 0은 한도 없음이고 AOF 실패와 사용 안 함, OpenSearch yellow와 상태 없음을 구분한다', async () => {
  edit = (data) => {
    data.redis!.maxMemoryBytes = 0;
    data.redis!.aofLastWriteOk = false;
    data.opensearch!.status = 'yellow';
  };
  nav.search = 'tab=storage';

  const view = draw();

  await screen.findByText('RDS 여유 스토리지');
  expect(within(card('Redis 메모리')).getByText('한도 없음')).toBeTruthy();
  expect(
    within(screen.getByRole('region', { name: 'Redis' })).getByText('실패'),
  ).toBeTruthy();
  expect(
    within(screen.getByRole('region', { name: 'OpenSearch' })).getByText(
      'yellow',
    ),
  ).toBeTruthy();
  view.unmount();
  client.clear();
  edit = (data) => {
    data.redis!.aofLastWriteOk = null;
    data.opensearch!.status = null;
  };
  draw();
  await screen.findByText('RDS 여유 스토리지');
  expect(
    within(screen.getByRole('region', { name: 'Redis' })).getByText(
      '사용 안 함',
    ),
  ).toBeTruthy();
  expect(
    within(screen.getByRole('region', { name: 'OpenSearch' })).getAllByText(
      '수집된 값 없음',
    ).length,
  ).toBeGreaterThan(0);
});

it('빈 점 목록의 요약은 수집된 값 없음이고 실제 연결 수 0은 0으로 그린다', async () => {
  scenario = 'empty';
  nav.search = 'tab=storage';

  const view = draw();

  await screen.findByText('RDS 여유 스토리지');
  expect(
    within(card('OpenSearch 디스크 여유')).getByText('수집된 값 없음'),
  ).toBeTruthy();

  const chart = within(
    screen.getByRole('region', { name: 'RDS' }),
  ).getByLabelText('연결 수');

  expect(rowsOf(chart).every((row) => row.connections === 0)).toBe(true);
  view.change('tab=services');
  await services();
  expect(within(card('요청 수')).getByText('수집된 값 없음')).toBeTruthy();
  expect(within(card('상태 검사')).getByText('수집된 값 없음')).toBeTruthy();
});

it('설정 없음 묶음은 그 자리에만 설정 없음 문구를 두고 나머지는 그대로 그린다', async () => {
  scenario = 'not-configured';
  draw();
  await services();

  const host = screen.getByRole('region', { name: '앱 호스트' });

  expect(
    within(host).getByText('이 환경에는 앱 호스트 CPU 지표 설정이 없습니다.'),
  ).toBeTruthy();
  expect(within(host).queryByLabelText('CPU 사용률')).toBeNull();
  expect(within(host).getByLabelText('사용 가능 메모리')).toBeTruthy();
  expect(within(host).getByLabelText('디스크 여유')).toBeTruthy();
  expect(screen.queryByText('CPU 크레딧 잔액')).toBeNull();
});

it('일시 조회 실패 묶음은 그 구역에 실패 문구를 두고 CPU, RDS, Redis는 그대로 그린다', async () => {
  scenario = 'partial';

  const view = draw();

  await services();
  expect(
    within(screen.getByRole('region', { name: '요청' })).getByText(
      '지금 요청 지표를 가져올 수 없습니다. 잠시 후 다시 시도해 주세요.',
    ),
  ).toBeTruthy();

  const host = screen.getByRole('region', { name: '앱 호스트' });

  expect(
    within(host).getByText(
      '지금 앱 호스트 메모리와 디스크 지표를 가져올 수 없습니다. 잠시 후 다시 시도해 주세요.',
    ),
  ).toBeTruthy();
  expect(within(host).getByLabelText('CPU 사용률')).toBeTruthy();
  view.change('tab=storage');
  await screen.findByText('RDS 여유 스토리지');
  expect(
    within(screen.getByRole('region', { name: 'OpenSearch' })).getByText(
      '지금 OpenSearch 지표를 가져올 수 없습니다. 잠시 후 다시 시도해 주세요.',
    ),
  ).toBeTruthy();
  expect(
    within(screen.getByRole('region', { name: 'RDS' })).getByLabelText(
      'CPU 사용률',
    ),
  ).toBeTruthy();
  expect(within(card('Redis 메모리')).getByText('2.5MB')).toBeTruthy();
});

it('출처는 영역 제목 옆 CloudWatch와 Prometheus와 Redis 구역의 Redis이고 받은 시각을 툴팁에 보인다', async () => {
  vi.setSystemTime(new Date('2026-11-20T01:12:40Z'));
  nav.search = 'tab=storage';
  draw();
  await screen.findByText('RDS 여유 스토리지');
  expect(screen.queryByText(/KST에 받은 값/)).toBeNull();

  const source = screen.getByRole('button', {
    name: 'CloudWatch와 Prometheus 출처 안내',
  });

  expect(source.textContent).toContain('CloudWatch와 Prometheus');
  act(() => source.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(source.getAttribute('aria-describedby')).toBe(tooltip.id);
  expect(tooltip.textContent).toBe(
    'CloudWatch 출처 지표이며 2026-11-20 10:12 KST에 받은 값입니다. 5분 단위로 집계하며 1~2분 늦게 반영될 수 있습니다. 관측 서버 Prometheus 출처 지표이며 2026-11-20 10:12 KST에 받은 값입니다. 5분 단위로 집계하며 1~2분 늦게 반영될 수 있습니다.',
  );
  fireEvent.keyDown(source, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

  const redis = within(screen.getByRole('region', { name: 'Redis' })).getByRole(
    'button',
    { name: 'Redis 출처 안내' },
  );

  expect(redis.textContent).toContain('Redis');
  act(() => redis.focus());
  expect((await screen.findByRole('tooltip')).textContent).toBe(
    '서버가 Redis에 직접 물은 값이며 2026-11-20 10:12 KST 기준입니다. 기간과 무관한 현재 값입니다.',
  );
});

it('31일을 넘는 기간은 요청하지 않고 맞추기를 제공하며 긴 빠른 범위를 막는다', async () => {
  nav.search = 'range=last90d';
  draw();
  expect(screen.getByText('기간 확인 필요')).toBeTruthy();
  expect(requests).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: '기간: 최근 90일' }));

  for (const name of ['최근 90일', '최근 6개월', '최근 1년'])
    expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(
      true,
    );

  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: '최근 31일로 맞추기' }));

  const q = new URL(nav.push.mock.calls.at(-1)![0], 'http://localhost')
    .searchParams;

  expect(q.get('from')).toBe('2026-10-21');
  expect(q.get('to')).toBe('2026-11-20');
});

it('DB 테이블은 현재 값만 요청하고 기간을 보존하며 응답 순서·MB·스키마를 표시한다', async () => {
  nav.search = 'tab=tables&range=last7d';

  const view = draw();

  await screen.findByText('데이터베이스 크기');
  expect(requests).toEqual(['/api/infra/db-tables?limit=20']);
  expect(
    screen.getByRole('button', { name: '기간: 현재' }).hasAttribute('disabled'),
  ).toBe(true);

  const table = screen.getByRole('table', { name: 'DB 테이블 크기' });

  expect(
    within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.children[0].textContent),
  ).toEqual(['chat_messages', 'ai_call_logs', 'audit.events']);
  expect(within(table).getByText('402.7MB')).toBeTruthy();
  view.change('tab=services&range=last7d');
  await services();
  expect(requests.at(-1)).toBe(
    '/api/infra/metrics?from=2026-11-14&to=2026-11-20',
  );
  expect(
    screen.getByLabelText('CPU 사용률').querySelector('[data-x-axis]')!
      .textContent,
  ).toBe('11-20 00:05');
});

it('인프라 지표 사용 불가는 두 하위 구분에 격리하고 DB 테이블로 전환하면 정상 조회한다', async () => {
  unavailable = true;

  const view = draw();

  await screen.findByText('인프라 지표를 불러올 수 없음');
  expect(
    screen.getByText(
      '잠시 후 다시 시도해 주세요. 문제가 계속되면 서버의 CloudWatch 권한, 관측 서버 Prometheus 연결, Redis 상태를 확인해 주세요.',
    ),
  ).toBeTruthy();
  view.change('tab=storage');
  await screen.findByText('인프라 지표를 불러올 수 없음');
  view.change('tab=tables');
  await screen.findByText('데이터베이스 크기');
  expect(screen.queryByText('인프라 지표를 불러올 수 없음')).toBeNull();
});

it('추정 행 수와 서버 DB 출처는 포커스 툴팁으로만 표시한다', async () => {
  nav.search = 'tab=tables';
  draw();
  await screen.findByText('데이터베이스 크기');

  const help = screen.getByRole('button', { name: '추정 행 수 도움말' });

  act(() => help.focus());
  expect((await screen.findByRole('tooltip')).textContent).toBe(
    '통계가 추정한 행 수라 실제 행 수와 다를 수 있습니다.',
  );
  fireEvent.keyDown(help, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

  const source = screen.getByRole('button', { name: '서버 DB 출처 안내' });

  act(() => source.focus());
  expect((await screen.findByRole('tooltip')).textContent).toContain(
    '조회 결과는 5분간 캐시합니다.',
  );
});
