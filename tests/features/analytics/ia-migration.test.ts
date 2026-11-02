// @vitest-environment jsdom
import { createElement } from 'react';

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { legacyHref, LegacyRoute } from '@/features/analytics/legacy-route';
import {
  closedSidebar,
  expandedSidebar,
  navigation,
  parseSidebarState,
} from '@/features/navigation/sidebar-state';

const nav = vi.hoisted(() => ({
  path: '',
  search: '',
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.path,
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const cases: [string, string[], string, string | null][] = [
  ['/dashboard/analytics', [''], '/analytics/chats', 'engagement'],
  ['/analytics/growth', ['', 'trend'], '/analytics/inflow', 'trend'],
  [
    '/analytics/growth',
    ['activation', 'creatives', 'sources', 'app', 'push', 'installs'],
    '/analytics/inflow',
    '=',
  ],
  [
    '/analytics/growth',
    ['activity', 'signups', 'retention'],
    '/analytics/audience',
    '=',
  ],
  ['/analytics/stories', ['', 'making'], '/analytics/content', 'making'],
  [
    '/analytics/stories',
    ['creation', 'story-detail'],
    '/analytics/inflow',
    '=',
  ],
  ['/analytics/payments', [''], '/analytics/revenue', null],
  ['/analytics/acquisition', ['', 'trend'], '/analytics/inflow', 'trend'],
  [
    '/analytics/acquisition',
    ['creation', 'story-detail', 'sources', 'push', 'installs'],
    '/analytics/inflow',
    '=',
  ],
  [
    '/analytics/users',
    ['', 'activity', 'sessions'],
    '/analytics/audience',
    'activity',
  ],
  ['/analytics/users', ['retention'], '/analytics/audience', 'retention'],
  ['/analytics/users', ['signups'], '/analytics/audience', 'signups'],
  ['/analytics/conversion', ['', 'funnels'], '/analytics/audience', 'signups'],
  ['/analytics/conversion', ['turn-reach'], '/analytics/chats', 'engagement'],
  ['/analytics/quality', ['', 'client'], '/analytics/ops', 'ai-quality'],
  ['/analytics/quality', ['chat-options'], '/analytics/chats', 'chat-options'],
  ['/analytics/quality', ['ai-cost'], '/analytics/ops', 'ai-cost'],
  ['/analytics/infra', ['', 'services'], '/analytics/ops', 'services'],
  ['/analytics/infra', ['storage'], '/analytics/ops', 'storage'],
  ['/analytics/infra', ['tables'], '/analytics/ops', 'tables'],
];

it.each(cases)(
  '%s의 표에 있는 모든 tab은 쿼리를 보존하고 replace로 이동한다',
  (path, tabs, destination, target) => {
    for (const tab of tabs) {
      nav.path = path;

      const params = new URLSearchParams(
        'range=last14d&platform=android&segment=member&campaign=TEST&adSegment=ads&storyId=id&cohort=signup&tag=a&tag=b',
      );

      if (tab) params.set('tab', tab);

      nav.search = params.toString();

      const url = new URL(legacyHref(path, params), 'http://localhost');

      expect(url.pathname).toBe(destination);
      expect(url.searchParams.get('tab')).toBe(target === '=' ? tab : target);

      for (const key of [
        'range',
        'platform',
        'segment',
        'campaign',
        'adSegment',
        'storyId',
        'cohort',
        'tag',
      ])
        expect(url.searchParams.getAll(key)).toEqual(params.getAll(key));

      const view = render(createElement(LegacyRoute));

      expect(nav.replace).toHaveBeenLastCalledWith(
        `${url.pathname}${url.search}`,
        { scroll: false },
      );
      expect(nav.push).not.toHaveBeenCalled();
      view.unmount();
    }
  },
);
it.each(cases.filter(([, tabs]) => tabs.includes('')))(
  '%s의 모르는 tab은 tab 없음과 같은 경로로 이동한다',
  (path) => {
    expect(legacyHref(path, new URLSearchParams('tab=unknown'))).toBe(
      legacyHref(path, new URLSearchParams()),
    );
  },
);
it.each(['7', '30', '90'])(
  '이전 days=%s를 range로 바꾸고 metric은 유지한다',
  (days) => {
    expect(
      legacyHref(
        '/dashboard/analytics',
        new URLSearchParams({ days, metric: 'spent' }),
      ),
    ).toBe(`/analytics/chats?metric=spent&tab=engagement&range=last${days}d`);
  },
);
it('사이드바 네 구역과 새 메뉴 순서 및 운영 저장 형식을 사용한다', () => {
  expect(navigation[0].items).toEqual([
    ['/dashboard', '개요'],
    ['/analytics/inflow', '유입'],
    ['/analytics/audience', '사용자'],
    ['/analytics/content', '콘텐츠'],
    ['/analytics/chats', '채팅'],
    ['/analytics/revenue', '수익'],
  ]);
  expect(navigation.at(-1)).toMatchObject({
    id: 'ops',
    title: '운영',
    items: [['/analytics/ops', '지표']],
  });
  expect(expandedSidebar('/analytics/ops', closedSidebar)).toMatchObject({
    ops: true,
  });
  expect(parseSidebarState('{"manage":true}')).toEqual({
    dashboard: false,
    manage: true,
    notifications: false,
    ops: false,
  });
});
