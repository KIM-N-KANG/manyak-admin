// @vitest-environment jsdom
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as auditLogs } from '@/app/api/audit-logs/route';
import { GET as chats } from '@/app/api/chats/route';
import { GET as members } from '@/app/api/members/route';
import { GET as notices } from '@/app/api/notices/route';
import { GET as campaigns } from '@/app/api/notifications/campaigns/route';
import { GET as originals } from '@/app/api/originals/route';
import { GET as payments } from '@/app/api/payments/route';
import { GET as stories } from '@/app/api/stories/route';
import { ListFilterForm } from '@/components/admin/list-search';
import { AuditLogListScreen } from '@/features/audit-logs/audit-log-screen';
import { NoticeListScreen } from '@/features/notices/notice-list-screen';
import { CampaignListScreen } from '@/features/notifications/campaign-list-screen';
import { OriginalListScreen } from '@/features/originals/original-list-screen';
import { ListScreen } from '@/features/shared/list-screen';

const nav = vi.hoisted(() => ({
  pathname: '/members',
  search: '',
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
}));

let client: QueryClient;
const handlers = {
  members,
  stories,
  originals,
  chats,
  payments,
  notices,
  'audit-logs': auditLogs,
  campaigns,
};

beforeEach(() => {
  nav.replace.mockReset();
  nav.push.mockReset();
  nav.search = 'page=8&size=2&sort=createdAt&order=asc';
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = new URL(url, 'http://localhost').pathname;
      const domain = (
        path.startsWith('/api/notifications/')
          ? 'campaigns'
          : path.split('/')[2]
      ) as keyof typeof handlers;

      return handlers[domain](new Request(`http://localhost${url}`));
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function filterForm() {
  return createElement(
    ListFilterForm,
    { label: '회원 검색' },
    createElement(
      'label',
      null,
      '상태',
      createElement(
        'select',
        { name: 'status', defaultValue: 'ACTIVE' },
        createElement('option', { value: '' }, '전체'),
        createElement('option', { value: 'ACTIVE' }, '정상'),
        createElement('option', { value: 'SUSPENDED' }, '정지'),
      ),
    ),
  );
}

it('입력은 제출 전까지 이동하지 않고 검색어와 필터를 한 번에 적용한다', async () => {
  vi.useFakeTimers();
  nav.pathname = '/members';
  render(filterForm());

  const input = screen.getByRole('searchbox') as HTMLInputElement;
  const apply = screen.getByRole('button', {
    name: '적용',
  }) as HTMLButtonElement;

  expect(input.form).toBe(apply.form);
  expect(apply.form!.querySelector('input,select')).toBe(input);
  fireEvent.change(input, { target: { value: '  HELLO   WORLD  ' } });
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'SUSPENDED' },
  });
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(nav.push).not.toHaveBeenCalled();
  expect(nav.replace).not.toHaveBeenCalled();
  fireEvent.click(apply);

  const clicked = nav.push.mock.calls.at(-1)![0];
  const url = new URL(clicked, 'http://localhost');

  expect(url.searchParams.get('q')).toBe('hello world');
  expect(url.searchParams.get('status')).toBe('SUSPENDED');
  expect(url.searchParams.get('page')).toBe('1');
  expect(url.searchParams.get('sort')).toBe('createdAt');
  fireEvent.submit(input.form!);
  expect(nav.push.mock.calls.at(-1)![0]).toBe(clicked);
  expect(
    screen.getByRole('link', { name: '초기화' }).getAttribute('href'),
  ).toBe('/members');
});
it('뒤로 이동한 URL을 폼에 반영하고 빈 검색어는 쿼리에서 제거한다', () => {
  nav.pathname = '/members';
  nav.search = 'q=old&page=4';

  const view = render(filterForm());

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'new' } });
  nav.search = 'q=restored&page=2';
  view.rerender(filterForm());

  const input = screen.getByRole('searchbox') as HTMLInputElement;

  expect(input.value).toBe('restored');
  fireEvent.change(input, { target: { value: '   ' } });
  fireEvent.submit(input.form!);

  const url = new URL(nav.push.mock.calls.at(-1)![0], 'http://localhost');

  expect(url.searchParams.has('q')).toBe(false);
  expect(url.searchParams.get('status')).toBe('ACTIVE');
  expect(url.searchParams.get('page')).toBe('1');
});
describe.each(Object.keys(handlers) as (keyof typeof handlers)[])(
  '%s 검색 화면',
  (domain) => {
    it('검색 URL·빈 상태와 지우기·필터 및 정렬의 검색어 보존을 연결한다', async () => {
      nav.pathname =
        domain === 'campaigns' ? '/notifications/campaigns' : `/${domain}`;

      const sort =
        domain === 'originals'
          ? 'updatedAt'
          : domain === 'chats'
            ? 'turnCount'
            : domain === 'payments'
              ? 'priceKrw'
              : 'createdAt';

      nav.search = `q=없는검색어&page=1&size=2&sort=${sort}&order=asc`;
      render(
        createElement(
          QueryClientProvider,
          { client },
          domain === 'originals'
            ? createElement(OriginalListScreen)
            : domain === 'notices'
              ? createElement(NoticeListScreen)
              : domain === 'audit-logs'
                ? createElement(AuditLogListScreen)
                : domain === 'campaigns'
                  ? createElement(CampaignListScreen)
                  : createElement(ListScreen, { domain }),
        ),
      );

      const search = screen.getByRole('searchbox') as HTMLInputElement;

      expect(search.form).toBe(
        screen.getByRole('button', { name: '적용' }).closest('form'),
      );
      expect(
        screen.getByRole('link', { name: '초기화' }).getAttribute('href'),
      ).toBe(nav.pathname);
      expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe(
        '없는검색어',
      );
      await screen.findByText('“없는검색어” 검색 결과가 없습니다.');
      fireEvent.submit(
        screen.getByRole('button', { name: '적용' }).closest('form')!,
      );
      await waitFor(() => expect(nav.push).toHaveBeenCalled());
      expect(
        new URL(
          nav.push.mock.calls.at(-1)![0],
          'http://localhost',
        ).searchParams.get('q'),
      ).toBe('없는검색어');

      const sortButton = screen
        .getAllByRole('button')
        .find((button) => button.closest('th'))!;

      fireEvent.click(sortButton);
      expect(
        new URL(
          nav.push.mock.calls.at(-1)![0],
          'http://localhost',
        ).searchParams.get('q'),
      ).toBe('없는검색어');
      fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));

      const url = new URL(
        nav.replace.mock.calls.at(-1)![0],
        'http://localhost',
      );

      expect(url.searchParams.has('q')).toBe(false);
      expect(url.searchParams.get('page')).toBe('1');
      expect(url.searchParams.get('size')).toBe('2');
    });
  },
);
