// @vitest-environment jsdom

import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as chats } from '@/app/api/chats/route';
import { GET as members } from '@/app/api/members/route';
import { GET as payments } from '@/app/api/payments/route';
import { GET as stories } from '@/app/api/stories/route';
import { PageNavigation } from '@/components/admin/page-navigation';
import type { ListDomain } from '@/features/shared/list-config';
import { ListScreen, RelatedList } from '@/features/shared/list-screen';
import {
  members as fixtureMembers,
  stories as fixtureStories,
} from '@/fixtures/entities';

const navigation = vi.hoisted(() => ({
  pathname: '/stories',
  search: '',
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => ({ push: navigation.push }),
}));

let client: QueryClient;
const requested: string[] = [];
const handlers = { stories, members, payments, chats };

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  });
  navigation.search = 'page=2&size=2';
  navigation.push.mockReset();
  requested.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requested.push(url);

      const domain = new URL(url, 'http://localhost').pathname.split(
        '/',
      )[2] as ListDomain;

      return handlers[domain](new Request(`http://localhost${url}`));
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

const list = (domain: ListDomain) =>
  createElement(
    QueryClientProvider,
    { client },
    createElement(ListScreen, { domain }),
  );
const pushed = () =>
  new URL(navigation.push.mock.calls.at(-1)![0], 'http://localhost');
const columns = {
  stories: [
    ['채팅 수', 'chatCount'],
    ['총 턴 수', 'totalTurns'],
    ['생성일', 'createdAt'],
  ],
  members: [
    ['가입일', 'createdAt'],
    ['최근 활동', 'lastActiveAt'],
    ['채팅 수', 'chatCount'],
    ['이프 소모', 'creditsSpent'],
    ['결제액', 'paidKrw'],
  ],
  payments: [
    ['결제 금액', 'priceKrw'],
    ['적립 이프', 'creditAmount'],
    ['완료 시각', 'completedAt'],
    ['환불 시각', 'refundedAt'],
  ],
  chats: [
    ['턴 수', 'turnCount'],
    ['시작 시각', 'startedAt'],
    ['마지막 활동', 'lastActiveAt'],
    ['이프 소모', 'creditsSpent'],
  ],
} as const;

for (const domain of Object.keys(columns) as ListDomain[]) {
  describe(`${domain} 목록 UI`, () => {
    it('모든 정렬 머리글은 첫 클릭 내림·재클릭 오름이며 페이지를 1로 되돌린다', async () => {
      navigation.pathname = `/${domain}`;

      const view = render(list(domain));

      await screen.findByRole('navigation', { name: '목록 페이지' });
      expect(screen.queryByRole('combobox', { name: '정렬' })).toBeNull();
      expect(
        screen
          .getByRole('link', { name: '2페이지' })
          .getAttribute('aria-current'),
      ).toBe('page');
      expect(
        new URL(
          screen.getByRole('link', { name: '다음 ›' }).getAttribute('href')!,
          'http://localhost',
        ).searchParams.get('page'),
      ).toBe('3');

      for (const [label, key] of columns[domain]) {
        fireEvent.click(screen.getByRole('button', { name: label }));
        expect(pushed().searchParams.get('sort')).toBe(key);
        expect(pushed().searchParams.get('order')).toBe('desc');
        expect(pushed().searchParams.get('page')).toBe('1');
        expect(pushed().searchParams.get('size')).toBe('2');
        navigation.search = pushed().search.slice(1);
        view.rerender(list(domain));
        await waitFor(() =>
          expect(
            screen
              .getByRole('button', { name: label })
              .closest('th')!
              .getAttribute('aria-sort'),
          ).toBe('descending'),
        );
        await screen.findByRole('navigation', { name: '목록 페이지' });
        expect(
          screen
            .getByRole('button', { name: '‹ 이전' })
            .hasAttribute('disabled'),
        ).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: label }));
        expect(pushed().searchParams.get('order')).toBe('asc');
        navigation.search = pushed().search.slice(1);
        view.rerender(list(domain));
        await waitFor(() =>
          expect(
            screen
              .getByRole('button', { name: label })
              .closest('th')!
              .getAttribute('aria-sort'),
          ).toBe('ascending'),
        );
        expect(
          screen.getByRole('button', { name: label }).textContent,
        ).toContain('↑');
      }
    });

    it('필터 적용은 페이지 1로 복귀하고 정렬·크기·추가 조건을 보존한다', async () => {
      navigation.pathname = `/${domain}`;

      const key = columns[domain][0][1];

      navigation.search = `page=4&size=2&sort=${key}&order=asc&excludeDeleted=true`;
      render(list(domain));
      await screen.findByRole('navigation', { name: '목록 페이지' });

      const filterLabel =
        domain === 'stories'
          ? '범위'
          : domain === 'chats'
            ? '스토리 ID'
            : '상태';
      const input = screen.getByLabelText(filterLabel);
      const value =
        domain === 'stories'
          ? 'original'
          : domain === 'chats'
            ? fixtureStories[0].storyId
            : domain === 'members'
              ? 'ACTIVE'
              : 'REFUNDED';

      fireEvent.change(input, { target: { value } });
      fireEvent.submit(
        screen.getByRole('button', { name: '적용' }).closest('form')!,
      );
      await waitFor(() => expect(navigation.push).toHaveBeenCalled());
      expect(pushed().searchParams.get('page')).toBe('1');
      expect(pushed().searchParams.get('sort')).toBe(key);
      expect(pushed().searchParams.get('order')).toBe('asc');
      expect(pushed().searchParams.get('size')).toBe('2');
      expect(pushed().searchParams.get('excludeDeleted')).toBe('true');
      expect(
        pushed().searchParams.get(
          domain === 'stories'
            ? 'scope'
            : domain === 'chats'
              ? 'storyId'
              : 'status',
        ),
      ).toBe(value);
    });
  });
}

describe('숫자 페이지 이동', () => {
  it.each([1, 5, 10])(
    '%i페이지에서 처음·끝과 주변 번호만 표시하고 경계를 비활성화한다',
    (page) => {
      render(
        createElement(PageNavigation, {
          data: { page, totalPages: 10, totalElements: 200 },
          href: (number) => `/members?page=${number}`,
        }),
      );
      expect(screen.getByRole('link', { name: '1페이지' })).toBeTruthy();
      expect(screen.getByRole('link', { name: '10페이지' })).toBeTruthy();
      expect(
        screen
          .getByRole('link', { name: `${page}페이지` })
          .getAttribute('aria-current'),
      ).toBe('page');
      expect(screen.getAllByText('…').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('link').length).toBeLessThan(10);

      if (page === 1)
        expect(screen.getByRole('link', { name: '3페이지' })).toBeTruthy();

      if (page === 10)
        expect(screen.getByRole('link', { name: '8페이지' })).toBeTruthy();

      if (page === 1)
        expect(
          screen
            .getByRole('button', { name: '‹ 이전' })
            .hasAttribute('disabled'),
        ).toBe(true);

      if (page === 10)
        expect(
          screen
            .getByRole('button', { name: '다음 ›' })
            .hasAttribute('disabled'),
        ).toBe(true);
    },
  );

  it('빈 결과는 이동 가능한 번호를 만들지 않는다', () => {
    render(
      createElement(PageNavigation, {
        data: { page: 1, totalPages: 0, totalElements: 0 },
        href: (page) => `/members?page=${page}`,
      }),
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('전체 0건')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '‹ 이전' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: '다음 ›' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('범위 밖 페이지에서 마지막 유효 페이지로 돌아갈 수 있다', () => {
    render(
      createElement(PageNavigation, {
        data: { page: 99, totalPages: 10, totalElements: 200 },
        href: (page) => `/members?page=${page}`,
      }),
    );
    expect(
      screen.getByRole('link', { name: '‹ 이전' }).getAttribute('href'),
    ).toBe('/members?page=10');
    expect(
      screen.getByRole('button', { name: '다음 ›' }).hasAttribute('disabled'),
    ).toBe(true);
  });
});

describe('상세 하위 목록', () => {
  it.each(['stories', 'payments', 'chats'] as const)(
    '%s도 별도 URL 상태로 전체 BFF를 정렬·페이지 조회한다',
    async (kind) => {
      navigation.pathname = `/members/${fixtureMembers[1].memberId}`;
      navigation.search = `${kind}Page=2&${kind}Size=1&paymentsPage=2&chatsOrder=asc`;

      const scope = { memberId: fixtureMembers[1].memberId };

      render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(RelatedList, { kind, scope }),
        ),
      );

      const nav = await screen.findByRole('navigation', {
        name: /하위 목록 페이지/,
      });
      const url = new URL(requested[0], 'http://localhost');

      expect(url.searchParams.get('page')).toBe('2');
      expect(url.searchParams.get('size')).toBe('1');
      expect(url.searchParams.get('memberId')).toBe(scope.memberId);
      expect(url.searchParams.has('paymentsPage')).toBe(false);
      expect(within(nav).getByRole('link', { name: '‹ 이전' })).toBeTruthy();

      const [label, key] = columns[kind][0];

      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(pushed().searchParams.get(`${kind}Sort`)).toBe(key);
      expect(pushed().searchParams.get(`${kind}Order`)).toBe('desc');
      expect(pushed().searchParams.get(`${kind}Page`)).toBe('1');

      if (kind !== 'payments')
        expect(pushed().searchParams.get('paymentsPage')).toBe('2');
    },
  );
});
