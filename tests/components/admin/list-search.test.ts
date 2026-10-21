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

import { GET as chats } from '@/app/api/chats/route';
import { GET as members } from '@/app/api/members/route';
import { GET as originals } from '@/app/api/originals/route';
import { GET as payments } from '@/app/api/payments/route';
import { GET as stories } from '@/app/api/stories/route';
import { ListSearch } from '@/components/admin/list-search';
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
const handlers = { members, stories, originals, chats, payments };

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
      const domain = new URL(url, 'http://localhost').pathname.split(
        '/',
      )[2] as keyof typeof handlers;

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
it('입력 중에는 이동하지 않고 마지막 입력 후 300ms에 한 번만 검색한다', async () => {
  vi.useFakeTimers();
  nav.pathname = '/members';
  render(createElement(ListSearch, { label: '회원 검색' }));

  const input = screen.getByRole('searchbox');

  fireEvent.change(input, { target: { value: '  HELLO  ' } });
  await act(() => vi.advanceTimersByTimeAsync(299));
  expect(nav.replace).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '  HELLO   WORLD  ' } });
  await act(() => vi.advanceTimersByTimeAsync(299));
  expect(nav.replace).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(nav.replace).toHaveBeenCalledTimes(1);

  const url = new URL(nav.replace.mock.calls[0][0], 'http://localhost');

  expect(url.searchParams.get('q')).toBe('hello world');
  expect(url.searchParams.get('page')).toBe('1');
  expect(url.searchParams.get('sort')).toBe('createdAt');
});
it('뒤로 이동한 URL을 입력에 반영하고 입력 취소·지우기는 남은 타이머를 취소한다', async () => {
  vi.useFakeTimers();
  nav.pathname = '/members';
  nav.search = 'q=old&page=4';

  const view = render(createElement(ListSearch, { label: '회원 검색' }));

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'new' } });
  fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
  await act(() => vi.advanceTimersByTimeAsync(400));
  expect(nav.replace).toHaveBeenCalledTimes(1);
  expect(
    new URL(nav.replace.mock.calls[0][0], 'http://localhost').searchParams.has(
      'q',
    ),
  ).toBe(false);
  nav.search = 'q=restored&page=2';
  view.rerender(createElement(ListSearch, { label: '회원 검색' }));
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe(
    'restored',
  );
  await act(() => vi.advanceTimersByTimeAsync(400));
  expect(nav.replace).toHaveBeenCalledTimes(1);
});
describe.each(Object.keys(handlers) as (keyof typeof handlers)[])(
  '%s 검색 화면',
  (domain) => {
    it('검색 URL·빈 상태와 지우기·필터 및 정렬의 검색어 보존을 연결한다', async () => {
      nav.pathname = `/${domain}`;

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
            : createElement(ListScreen, { domain }),
        ),
      );
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
      fireEvent.click(
        screen.getAllByRole('button', { name: '검색어 지우기' })[1],
      );

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
