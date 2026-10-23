// @vitest-environment jsdom
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { GET as attendance } from '@/app/api/members/[id]/attendance/route';
import { GET as transactions } from '@/app/api/members/[id]/transactions/route';
import { MemberHistoryList } from '@/features/members/member-history-list';
import { members } from '@/fixtures/entities';

const nav = vi.hoisted(() => ({ search: '' }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/members/detail',
  useSearchParams: () => new URLSearchParams(nav.search),
}));

let client: QueryClient;
const requested: string[] = [];

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  requested.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requested.push(url);

      return (url.includes('/transactions?') ? transactions : attendance)(
        new Request(`http://localhost${url}`),
        { params: Promise.resolve({ id: members[0].memberId }) },
      );
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});
it.each(['transactions', 'attendance'] as const)(
  '%s는 독립적인 페이지 URL로 원천을 조회하고 ID 열을 표시하지 않는다',
  async (kind) => {
    nav.search = `${kind}Page=2&${kind}Size=1&paymentsPage=3`;
    render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(MemberHistoryList, {
          memberId: members[0].memberId,
          kind,
        }),
      ),
    );

    const pagination = await screen.findByRole('navigation', {
      name: `${kind === 'transactions' ? '이프 내역' : '출석 기록'} 페이지`,
    });
    const request = new URL(requested[0], 'http://localhost');

    expect(request.searchParams.toString()).toBe('page=2&size=1');
    expect(screen.queryByRole('columnheader', { name: '거래 ID' })).toBeNull();

    const previous = within(pagination).getByRole('link', { name: '‹ 이전' });
    const url = new URL(previous.getAttribute('href')!, 'http://localhost');

    expect(url.searchParams.get(`${kind}Page`)).toBe('1');
    expect(url.searchParams.get('paymentsPage')).toBe('3');

    if (kind === 'attendance')
      expect(
        within(pagination)
          .getByRole('button', { name: '다음 ›' })
          .hasAttribute('disabled'),
      ).toBe(true);
    else
      expect(
        within(pagination)
          .getByRole('link', { name: '다음 ›' })
          .getAttribute('href'),
      ).toContain('transactionsPage=3');
  },
);
