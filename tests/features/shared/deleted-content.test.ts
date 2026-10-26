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
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { GET as chatDetail } from '@/app/api/chats/[id]/route';
import { GET as chatList } from '@/app/api/chats/route';
import { GET as storyDetail } from '@/app/api/stories/[id]/route';
import { GET as storySettings } from '@/app/api/stories/[id]/settings/route';
import { GET as storyList } from '@/app/api/stories/route';
import {
  getDailyMetricHref,
  getDistributionHref,
} from '@/features/dashboard/links';
import { DetailScreen } from '@/features/shared/detail-screen';
import {
  ChatRows,
  ListScreen,
  RelatedList,
  StoryRows,
} from '@/features/shared/list-screen';
import {
  chats,
  deletedChats,
  deletedStories,
  members,
  stories,
} from '@/fixtures/entities';

const nav = vi.hoisted(() => ({
  pathname: '/stories',
  search: '',
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ push: nav.push }),
}));

let client: QueryClient;
let requested: URL[];

beforeEach(() => {
  nav.search = '';
  nav.push.mockReset();
  requested = [];
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = new URL(input, 'http://localhost');

      requested.push(url);

      const [, , domain, id, section] = url.pathname.split('/');
      const request = new Request(url);
      const context = { params: Promise.resolve({ id }) };

      if (section === 'settings') {
        const response = await storySettings(request, context);

        // 설정 응답의 삭제 시각을 머리에 사용하지 않는지 검증한다.
        return Response.json({
          ...(await response.json()),
          deletedAt: '2026-01-01T00:00:00Z',
        });
      }

      if (id)
        return domain === 'stories'
          ? storyDetail(request, context)
          : chatDetail(request, context);

      return domain === 'stories' ? storyList(request) : chatList(request);
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function wrap(child: ReturnType<typeof createElement>) {
  return createElement(QueryClientProvider, { client }, child);
}

function list(domain: 'stories' | 'chats') {
  return wrap(createElement(ListScreen, { domain }));
}

function pushed() {
  return new URL(nav.push.mock.calls.at(-1)![0], 'http://localhost');
}

it.each(['stories', 'chats'] as const)(
  '%s 삭제 필터는 제외·포함·삭제만 순서이고 선택값을 URL과 요청에 반영한다',
  async (domain) => {
    nav.pathname = `/${domain}`;

    const label = domain === 'stories' ? '삭제된 스토리' : '삭제된 채팅';
    const view = render(list(domain));
    const select = screen.getByRole('combobox', { name: label });

    expect(
      within(select)
        .getAllByRole('option')
        .map((x) => x.textContent),
    ).toEqual(['제외', '포함', `${label}만`]);
    expect((select as HTMLSelectElement).value).toBe('');
    await waitFor(() => expect(requested.length).toBeGreaterThan(0));
    expect(requested.at(-1)!.searchParams.has('deleted')).toBe(false);

    for (const value of ['include', 'only', '']) {
      fireEvent.change(screen.getByRole('combobox', { name: label }), {
        target: { value },
      });
      fireEvent.submit(
        screen.getByRole('form', {
          name: `${domain === 'stories' ? '스토리' : '채팅'} 검색 및 필터`,
        }),
      );
      expect(pushed().searchParams.get('deleted')).toBe(value || null);
      nav.search = pushed().search.slice(1);
      view.rerender(list(domain));
      await waitFor(() =>
        expect(requested.at(-1)!.searchParams.get('deleted')).toBe(
          value || null,
        ),
      );
    }
  },
);

it.each(['stories', 'chats'] as const)(
  '%s의 알 수 없는 삭제 필터는 제외로 그리고 요청에서 뺀다',
  async (domain) => {
    nav.pathname = `/${domain}`;
    nav.search = 'deleted=all';
    render(list(domain));
    expect(
      (
        screen.getByRole('combobox', {
          name: domain === 'stories' ? '삭제된 스토리' : '삭제된 채팅',
        }) as HTMLSelectElement
      ).value,
    ).toBe('');
    await waitFor(() => expect(requested.length).toBeGreaterThan(0));
    expect(requested.at(-1)!.searchParams.has('deleted')).toBe(false);
  },
);

it.each([
  ['stories', 'memberId', members[1].memberId],
  ['chats', 'memberId', members[1].memberId],
  ['chats', 'storyId', stories[1].storyId],
] as const)(
  '%s 범위 목록은 %s를 유지하고 삭제 필터를 목록별 URL에 저장한다',
  async (kind, scopeKey, id) => {
    nav.pathname = scopeKey === 'storyId' ? `/stories/${id}` : `/members/${id}`;
    nav.search =
      'storiesDeleted=only&chatsDeleted=include&storiesPage=3&chatsPage=2';

    const node = () =>
      wrap(createElement(RelatedList, { kind, scope: { [scopeKey]: id } }));
    const view = render(node());
    const select = screen.getByRole('combobox', {
      name: kind === 'stories' ? '삭제된 스토리' : '삭제된 채팅',
    });
    const value = kind === 'stories' ? 'only' : 'include';

    expect((select as HTMLSelectElement).value).toBe(value);
    await waitFor(() => expect(requested.length).toBeGreaterThan(0));
    expect(requested.at(-1)!.searchParams.get(scopeKey)).toBe(id);
    expect(requested.at(-1)!.searchParams.get('deleted')).toBe(value);
    expect(
      requested
        .at(-1)!
        .searchParams.has(
          kind === 'stories' ? 'chatsDeleted' : 'storiesDeleted',
        ),
    ).toBe(false);
    fireEvent.change(select, { target: { value: '' } });
    expect(pushed().searchParams.has(`${kind}Deleted`)).toBe(false);
    expect(pushed().searchParams.get(`${kind}Page`)).toBe('1');
    expect(
      pushed().searchParams.get(
        kind === 'stories' ? 'chatsDeleted' : 'storiesDeleted',
      ),
    ).toBe(kind === 'stories' ? 'include' : 'only');
    nav.search = pushed().search.slice(1);
    view.rerender(node());
    await waitFor(() =>
      expect(requested.at(-1)!.searchParams.has('deleted')).toBe(false),
    );
  },
);

it.each([
  ['stories', 'memberId', members[1].memberId, 'include'],
  ['chats', 'storyId', stories[1].storyId, 'only'],
] as const)(
  '%s 범위 목록: %s=%s를 유지하며 제외에서 %s로 바꿔도 함께 열린 다른 목록 요청은 그대로다',
  async (kind, scopeKey, id, value) => {
    nav.pathname =
      scopeKey === 'memberId' ? `/members/${id}` : `/stories/${id}`;
    nav.search = 'storiesPage=3&chatsPage=2';

    const otherKind = kind === 'stories' ? 'chats' : 'stories';
    const label = kind === 'stories' ? '삭제된 스토리' : '삭제된 채팅';
    const otherLabel = kind === 'stories' ? '삭제된 채팅' : '삭제된 스토리';
    const requestsFor = (domain: string) =>
      requested.filter((url) => url.pathname === `/api/${domain}`);
    const node = () =>
      wrap(
        createElement(
          'div',
          null,
          createElement(RelatedList, { kind, scope: { [scopeKey]: id } }),
          createElement(RelatedList, {
            kind: otherKind,
            scope: { memberId: members[1].memberId },
          }),
        ),
      );
    const view = render(node());

    for (const name of [label, otherLabel])
      expect(
        (screen.getByRole('combobox', { name }) as HTMLSelectElement).value,
      ).toBe('');

    await waitFor(() => {
      expect(requestsFor(kind)).toHaveLength(1);
      expect(requestsFor(otherKind)).toHaveLength(1);
    });
    expect(requestsFor(kind)[0].searchParams.has('deleted')).toBe(false);
    expect(requestsFor(otherKind)[0].searchParams.has('deleted')).toBe(false);

    const otherRequests = requestsFor(otherKind).map((url) => url.href);

    fireEvent.change(screen.getByRole('combobox', { name: label }), {
      target: { value },
    });
    expect(pushed().searchParams.get(`${kind}Deleted`)).toBe(value);
    expect(pushed().searchParams.get(`${kind}Page`)).toBe('1');
    expect(pushed().searchParams.get(`${otherKind}Page`)).toBe(
      otherKind === 'stories' ? '3' : '2',
    );
    expect(pushed().searchParams.has(`${otherKind}Deleted`)).toBe(false);
    nav.search = pushed().search.slice(1);
    view.rerender(node());

    await waitFor(() => {
      expect(requestsFor(kind)).toHaveLength(2);
      expect(requestsFor(kind).at(-1)!.searchParams.get('deleted')).toBe(value);
    });

    const params = requestsFor(kind).at(-1)!.searchParams;

    expect(Object.fromEntries(params)).toEqual({
      [scopeKey]: id,
      page: '1',
      deleted: value,
    });
    expect(
      (screen.getByRole('combobox', { name: label }) as HTMLSelectElement)
        .value,
    ).toBe(value);
    expect(
      (screen.getByRole('combobox', { name: otherLabel }) as HTMLSelectElement)
        .value,
    ).toBe('');
    expect(requestsFor(otherKind).map((url) => url.href)).toEqual(
      otherRequests,
    );
  },
);

it.each(['stories', 'chats'] as const)(
  '%s 목록은 삭제된 행의 상세 링크 옆에만 배지를 둔다',
  async (domain) => {
    const id =
      domain === 'stories' ? deletedStories[0].storyId : deletedChats[1].chatId;

    render(
      createElement(
        'table',
        null,
        createElement(
          'tbody',
          null,
          domain === 'stories'
            ? createElement(StoryRows, {
                items: [stories[0], deletedStories[0]],
              })
            : createElement(ChatRows, { items: [chats[0], deletedChats[1]] }),
        ),
      ),
    );

    const name = domain === 'stories' ? deletedStories[0].title : id.slice(-8);
    const link = await screen.findByRole('link', { name });

    expect(link.getAttribute('href')).toBe(`/${domain}/${id}`);
    expect(within(link.closest('td')!).getByText('삭제됨')).toBeTruthy();

    const liveId =
      domain === 'stories' ? stories[0].title : chats[0].chatId.slice(-8);

    expect(
      within(
        screen.getByRole('link', { name: liveId }).closest('td')!,
      ).queryByText('삭제됨'),
    ).toBeNull();

    if (domain === 'chats') {
      const storyLink = screen.getAllByRole('link', {
        name: deletedStories[0].title,
      })[0];

      expect(within(storyLink.closest('td')!).queryByText('삭제됨')).toBeNull();
    }
  },
);

it.each(['stories', 'chats'] as const)(
  '%s 삭제 상세는 머리에 KST 시각을 한 번만 표시한다',
  async (domain) => {
    const id =
      domain === 'stories' ? deletedStories[0].storyId : deletedChats[1].chatId;

    nav.pathname = `/${domain}/${id}`;
    render(wrap(createElement(DetailScreen, { domain, id })));

    const label = await screen.findByText('삭제 시각 (KST)');

    expect(label.parentElement!.textContent).toContain('2026-10-25 12:10');
    expect(within(label.parentElement!).getByText('삭제됨')).toBeTruthy();
    expect(screen.getAllByText('삭제 시각 (KST)')).toHaveLength(1);

    if (domain === 'stories') {
      const section = (
        await screen.findByRole('heading', { name: '스토리 설정' })
      ).closest('section')!;

      await within(section).findByText('세계관 설정');
      expect(within(section).queryByText('삭제 시각 (KST)')).toBeNull();
      expect(screen.queryByText('2026-01-01 09:00')).toBeNull();
    } else {
      const storyLink = screen.getByRole('link', {
        name: deletedStories[0].title,
      });

      expect(storyLink.parentElement!.textContent).not.toContain('삭제됨');
    }
  },
);

it.each(['stories', 'chats'] as const)(
  '%s 미삭제 상세에는 삭제 배지와 시각이 없다',
  async (domain) => {
    const id = domain === 'stories' ? stories[1].storyId : chats[1].chatId;

    render(wrap(createElement(DetailScreen, { domain, id })));
    await screen.findByRole('heading', {
      name: domain === 'stories' ? stories[1].title : '채팅 상세',
    });
    expect(screen.queryByText('삭제 시각 (KST)')).toBeNull();
    expect(screen.queryByText('삭제됨')).toBeNull();
  },
);

it('차트 막대와 개요 일별 추이에서 연 목록은 삭제 제외로 요청한다', async () => {
  for (const href of [
    getDistributionHref({ list: 'chats', params: { turnBucket: '3' } }),
    getDailyMetricHref('stories', '2026-10-21'),
  ]) {
    const url = new URL(href, 'http://localhost');

    expect(url.searchParams.has('deleted')).toBe(false);
    nav.pathname = url.pathname;
    nav.search = url.search.slice(1);
    render(list(url.pathname === '/stories' ? 'stories' : 'chats'));
    expect(
      (
        screen.getByRole('combobox', {
          name: url.pathname === '/stories' ? '삭제된 스토리' : '삭제된 채팅',
        }) as HTMLSelectElement
      ).value,
    ).toBe('');
    await waitFor(() =>
      expect(requested.at(-1)!.pathname).toBe(`/api${url.pathname}`),
    );
    expect(requested.at(-1)!.searchParams.has('deleted')).toBe(false);
    cleanup();
  }
});
