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

import { InfraScreen } from '@/features/analytics/infra/infra-screen';
import { infraMetricsFixture, infraTablesFixture } from '@/fixtures/infra';

const nav = vi.hoisted(() => ({ search: '', push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/analytics/infra',
  useRouter: () => ({ push: nav.push }),
}));
vi.mock('recharts', () => {
  const Box = ({ children }: PropsWithChildren) =>
    createElement('div', null, children);

  return {
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
        tickFormatter?.('2026-10-22T15:05:00Z'),
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
let complete = false;
let empty = false;
const requests: string[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));
  nav.search = '';
  nav.push.mockReset();
  requests.length = 0;
  unavailable = false;
  complete = false;
  empty = false;
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
        complete,
      );

      if (empty) {
        data.opensearch!.freeStorageBytes = [];
        data.opensearch!.jvmMemoryPressure = [];
        data.rds!.connections = data.rds!.connections.map((point) => ({
          ...point,
          value: 0,
        }));
        data.alb!.requests = [];
        data.alb!.target5xx = [];
        data.alb!.elb5xx = [];
      }

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
    createElement(QueryClientProvider, { client }, createElement(InfraScreen));
  const view = render(element());

  return {
    ...view,
    change: (query: string) => {
      nav.search = query;
      view.rerender(element());
    },
  };
}

it('기본 오늘 범위의 서비스·요청과 태스크·합계를 표시하고 저장소와 응답을 공유한다', async () => {
  const view = draw();

  await screen.findByText('서버 태스크');
  expect(requests).toEqual([
    '/api/infra/metrics?from=2026-10-23&to=2026-10-23',
  ]);
  expect(screen.getByText('목표 2개, 시작 중 1개')).toBeTruthy();
  expect(screen.getByText('352회')).toBeTruthy();
  expect(screen.getByText('1회', { selector: 'p' })).toBeTruthy();
  expect(
    screen
      .getByRole('tab', { name: '서비스와 요청' })
      .getAttribute('aria-selected'),
  ).toBe('true');

  const chart = screen.getByLabelText('CPU 사용률');

  expect(JSON.parse(chart.getAttribute('data-config')!)).toEqual({
    service_0: { label: '서버', color: 'var(--primary)' },
    service_1: { label: 'AI', color: 'var(--primary-text)' },
    service_2: { label: '알림', color: 'var(--muted-foreground)' },
  });
  expect(
    chart.querySelector('[data-y-domain]')!.getAttribute('data-y-domain'),
  ).toBe('[0,100]');
  expect(chart.querySelectorAll('[data-connect="false"]')).toHaveLength(3);
  expect(chart.querySelector('[data-x-axis]')!.textContent).toBe('00:05');
  expect(
    chart.querySelector('[data-line="service_1"]')!.getAttribute('data-dash'),
  ).toBe('6 3');
  expect(
    chart.querySelector('[data-line="service_2"]')!.getAttribute('data-dash'),
  ).toBe('2 3');

  const rows = JSON.parse(
    chart.querySelector('[data-points]')!.getAttribute('data-points')!,
  );

  expect(rows[3].service_0).toBeNull();
  view.change('tab=storage');
  await screen.findByText('RDS 여유 스토리지');
  expect(requests).toHaveLength(1);
  expect(screen.getByText('18.3GB', { selector: 'p' })).toBeTruthy();
  expect(
    screen.getByText('이 환경에는 Redis 지표 설정이 없습니다.'),
  ).toBeTruthy();
  expect(screen.getByRole('region', { name: 'OpenSearch' })).toBeTruthy();
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

  expect(
    screen.getByRole('button', { name: '적용' }).hasAttribute('disabled'),
  ).toBe(true);
  expect(
    screen.getByText('시작 날짜와 끝 날짜를 포함해 31일 이내로 선택해 주세요.'),
  ).toBeTruthy();
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: '최근 31일로 맞추기' }));

  const q = new URL(nav.push.mock.calls.at(-1)![0], 'http://localhost')
    .searchParams;

  expect(q.get('from')).toBe('2026-09-23');
  expect(q.get('to')).toBe('2026-10-23');
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

  const ranking = JSON.parse(
    screen
      .getByLabelText('테이블별 전체 크기 순위')
      .querySelector('[data-ranking]')!
      .getAttribute('data-ranking')!,
  );

  expect(ranking.map((row: { label: string }) => row.label)).toEqual([
    'chat_messages',
    'ai_call_logs',
    'audit.events',
  ]);
  expect(ranking[0].value).toBeCloseTo(402.653184);
  view.change('tab=services&range=last7d');
  await screen.findByText('서버 태스크');
  expect(requests.at(-1)).toBe(
    '/api/infra/metrics?from=2026-10-17&to=2026-10-23',
  );
  expect(
    screen.getByLabelText('CPU 사용률').querySelector('[data-x-axis]')!
      .textContent,
  ).toBe('10-23 00:05');
});
it('CloudWatch 503은 두 탭에 격리하고 DB 테이블로 전환하면 정상 조회한다', async () => {
  unavailable = true;

  const view = draw();

  await screen.findByText('인프라 지표를 불러올 수 없음');
  expect(
    screen.getByText(
      '잠시 후 다시 시도해 주세요. 문제가 계속되면 서버의 CloudWatch 권한과 인프라 지표 설정을 확인해 주세요.',
    ),
  ).toBeTruthy();
  view.change('tab=storage');
  await screen.findByText('인프라 지표를 불러올 수 없음');
  view.change('tab=tables');
  await screen.findByText('데이터베이스 크기');
  expect(screen.queryByText('인프라 지표를 불러올 수 없음')).toBeNull();
});
it('추정 행 수와 출처는 포커스 툴팁으로만 표시하고 설명 ID와 연결한다', async () => {
  nav.search = 'tab=tables';
  draw();
  await screen.findByText('데이터베이스 크기');
  expect(
    screen.queryByText('통계가 추정한 행 수라 실제 행 수와 다를 수 있습니다.'),
  ).toBeNull();

  const help = screen.getByRole('button', { name: '추정 행 수 도움말' });

  act(() => help.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(help.getAttribute('aria-describedby')).toBe(tooltip.id);
  expect(tooltip.textContent).toBe(
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
it('Redis 노드는 응답 순서의 노드 이름으로 표시한다', async () => {
  complete = true;
  nav.search = 'tab=storage';
  draw();
  await screen.findByText('RDS 여유 스토리지');

  const redis = screen.getByRole('region', { name: 'Redis' });
  const config = JSON.parse(
    within(redis).getByLabelText('CPU 사용률').getAttribute('data-config')!,
  );

  expect(
    Object.values(config).map((x: unknown) => (x as { label: string }).label),
  ).toEqual(['노드 001', '노드 002']);
});

it('출처에는 응답에서 받은 시각만 표시하고 본문에 집계 설명을 두지 않는다', async () => {
  vi.setSystemTime(new Date('2026-10-23T01:12:40Z'));
  draw();
  await screen.findByText('서버 태스크');
  expect(screen.queryByText(/KST 집계 기준/)).toBeNull();
  expect(screen.queryByText(/KST에 받은 값/)).toBeNull();

  const source = screen.getByRole('button', { name: 'CloudWatch 출처 안내' });

  act(() => source.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(source.getAttribute('aria-describedby')).toBe(tooltip.id);
  expect(tooltip.textContent).toBe(
    'CloudWatch 출처 지표이며 2026-10-23 10:12 KST에 받은 값입니다. 5분 단위로 집계하며 1~2분 늦게 반영될 수 있습니다. 태스크 수는 조회 시각 기준 값입니다.',
  );
});

it('빈 점 목록의 요약은 수집된 값 없음이며 실제 연결 수 0은 0으로 그린다', async () => {
  empty = true;
  nav.search = 'tab=storage';

  const view = draw();

  await screen.findByText('RDS 여유 스토리지');
  expect(screen.getAllByText('수집된 값 없음')).toHaveLength(2);

  const chart = within(
    screen.getByRole('region', { name: 'RDS' }),
  ).getByLabelText('연결 수');
  const points = JSON.parse(
    chart.querySelector('[data-points]')!.getAttribute('data-points')!,
  );

  expect(
    points.every((point: { connections: number }) => point.connections === 0),
  ).toBe(true);
  view.change('tab=services');
  await screen.findByText('서버 태스크');
  expect(screen.getAllByText('수집된 값 없음')).toHaveLength(2);
});
