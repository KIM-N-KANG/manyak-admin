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
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: PropsWithChildren) =>
    createElement('div', null, children),
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

it('외부 도구는 아코디언으로 접고 펼치며 닉네임 위에 배치한다', () => {
  render(createElement(AdminShell, { nickname: '운영자' }, '본문'));

  const trigger = screen.getByRole('button', { name: '외부 도구' });

  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('link', { name: 'Amplitude' })).toBeNull();
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');

  for (const [key, name] of [
    ['amplitude', 'Amplitude'],
    ['openSearch', 'OpenSearch 로그'],
    ['sentry', 'Sentry'],
    ['langfuse', 'Langfuse'],
    ['groble', '그로블'],
  ] as const)
    assertExternal(name, externalLinks[key]);

  assertExternal(
    'OpenSearch 로그',
    'https://search-manyak-logs-p4mhzbcpwj2y35xdrqusddxgum.ap-northeast-2.es.amazonaws.com/_dashboards/',
  );
  expect(
    screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('target') === '_blank')
      .map((link) => link.textContent),
  ).toEqual(['Amplitude', 'OpenSearch 로그', 'Sentry', 'Langfuse', '그로블']);

  expect(
    screen
      .getByRole('link', { name: '그로블' })
      .compareDocumentPosition(screen.getByText('운영자')) &
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
it('Amplitude 카드에서 계약에 없는 URL 필드를 추가하지 않고 프로젝트 링크를 사용한다', () => {
  state.data = {
    asOf: '2026-10-21T00:00:00Z',
    from: '2026-10-21',
    to: '2026-10-21',
    todayActiveUsers: 1,
    daily: [{ date: '2026-10-21', activeUsers: 1, newUsers: 1 }],
  };
  render(createElement(AnalyticsSection, { days: '7' }));
  assertExternal('Amplitude에서 보기', externalLinks.amplitude);
});
