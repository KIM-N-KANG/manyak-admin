// @vitest-environment jsdom
import { createElement, type PropsWithChildren } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { AdminShell } from '@/components/admin/admin-shell';
import { AnalyticsSection } from '@/features/dashboard/analytics-section';
import { DetailScreen } from '@/features/shared/detail-screen';
import { ListScreen } from '@/features/shared/list-screen';
import { externalLinks } from '@/lib/external-links';

const state = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/payments',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/features/shared/use-api', () => ({
  useApi: () => ({
    data: state.data,
    error: null,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('recharts', () => ({
  AreaChart: ({ children }: PropsWithChildren) =>
    createElement('div', null, children),
  LineChart: ({ children }: PropsWithChildren) =>
    createElement('div', null, children),
  Line: ({ children }: PropsWithChildren) =>
    createElement('div', null, children),
  LabelList: () => null,
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: PropsWithChildren) =>
    createElement('div', null, children),
  ChartLegend: () => null,
  ChartLegendContent: () => null,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));
afterEach(() => {
  cleanup();
  state.data = undefined;
});

function assertExternal(label: string, href: string) {
  const link = screen.getByRole('link', { name: label });

  expect(link.getAttribute('href')).toBe(href);
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(link.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
}

it('외부 도구 버튼은 닉네임 위에 있으며 팝오버로 링크를 연다', () => {
  render(createElement(AdminShell, { nickname: '운영자' }, '본문'));

  const trigger = screen.getByRole('button', { name: '외부 도구' });

  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('link', { name: 'Amplitude' })).toBeNull();
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');

  for (const [key, name] of [
    ['amplitude', 'Amplitude'],
    ['openSearchDashboards', 'OpenSearch Dashboards'],
    ['openSearchUi', 'OpenSearch UI'],
    ['sentry', 'Sentry'],
    ['langfuse', 'Langfuse'],
    ['playConsole', 'Google Play Console'],
    ['groble', '그로블'],
  ] as const)
    assertExternal(name, externalLinks[key]);

  assertExternal(
    'OpenSearch Dashboards',
    'https://search-manyak-logs-p4mhzbcpwj2y35xdrqusddxgum.ap-northeast-2.es.amazonaws.com/_dashboards/',
  );
  assertExternal(
    'OpenSearch UI',
    'https://application-manyak-prod-observability-oe5e3cgxf4ka7duyc8b7.ap-northeast-2.opensearch.amazonaws.com/',
  );
  expect(screen.queryByRole('link', { name: 'OpenSearch 로그' })).toBeNull();
  expect(
    screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('target') === '_blank')
      .map((link) => link.textContent),
  ).toEqual([
    'Amplitude',
    'OpenSearch Dashboards',
    'OpenSearch UI',
    'Sentry',
    'Langfuse',
    'Google Play Console',
    '그로블',
  ]);

  expect(
    trigger.compareDocumentPosition(screen.getByText('운영자')) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  fireEvent.click(trigger);
  expect(screen.queryByRole('link', { name: 'Amplitude' })).toBeNull();
});
it('결제 목록 머리에 원본 확인 링크를 표시한다', () => {
  render(createElement(ListScreen, { domain: 'payments' }));
  assertExternal(
    '그로블에서 보기',
    'https://www.groble.im/manage/store/operation',
  );
});
it('결제 상세 머리에 원본 확인 링크를 표시한다', () => {
  render(createElement(DetailScreen, { domain: 'payments', id: 'payment-id' }));
  assertExternal(
    '그로블에서 보기',
    'https://www.groble.im/manage/store/operation',
  );
});
it('오늘 활성 사용자 카드는 사용자 활동 탭으로 연결한다', () => {
  state.data = {
    asOf: '2026-10-21T00:00:00Z',
    from: '2026-10-21',
    to: '2026-10-21',
    todayActiveUsers: { total: 1, web: 1, android: 0 },
    pendingDates: [],
    daily: [
      {
        date: '2026-10-21',
        activeUsers: { total: 1, web: 1, android: 0 },
        newUsers: { total: 1, web: 1, android: 0 },
      },
    ],
  };
  render(createElement(AnalyticsSection));
  expect(
    screen.getByRole('link', { name: '오늘 활성 사용자' }).getAttribute('href'),
  ).toBe('/analytics/growth?tab=activity');
});
