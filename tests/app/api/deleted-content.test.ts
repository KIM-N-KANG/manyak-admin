import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { GET as chatDetail } from '@/app/api/chats/[id]/route';
import { GET as chatList } from '@/app/api/chats/route';
import { GET as storyDetail } from '@/app/api/stories/[id]/route';
import { GET as storySettings } from '@/app/api/stories/[id]/settings/route';
import { GET as storyList } from '@/app/api/stories/route';
import {
  chats,
  deletedChats,
  deletedStories,
  stories,
} from '@/fixtures/entities';

beforeEach(() => {
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  vi.stubEnv('VERCEL_ENV', 'preview');
});
afterEach(() => vi.unstubAllEnvs());

const request = (path: string) => new Request(`http://localhost/api/${path}`);

it.each([
  ['stories', storyList, stories.length, deletedStories.length],
  ['chats', chatList, chats.length, deletedChats.length],
] as const)(
  '%s fixture는 삭제 제외·포함·only와 잘못된 값을 계약대로 처리한다',
  async (domain, route, live, deleted) => {
    for (const [query, count] of [
      ['', live],
      ['deleted=include', live + deleted],
      ['deleted=only', deleted],
    ] as const) {
      const response = route(request(`${domain}?${query}&size=100`));

      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.totalElements).toBe(count);

      for (const item of data.items) {
        expect(item).toHaveProperty('deletedAt');

        if (!query) expect(item.deletedAt).toBeNull();

        if (query === 'deleted=only')
          expect(item.deletedAt).toBe('2026-10-25T03:10:00Z');
      }
    }

    for (const value of ['all', 'exclude', 'INCLUDE'])
      expect(route(request(`${domain}?deleted=${value}`)).status).toBe(400);
  },
);
it('fixture의 회원·스토리 범위 목록도 삭제 필터와 AND로 조회한다', async () => {
  for (const [path, route, key, id] of [
    [
      `stories?memberId=${deletedStories[0].owner!.memberId}`,
      storyList,
      'storyId',
      deletedStories[0].storyId,
    ],
    [
      `chats?memberId=${deletedChats[0].member!.memberId}`,
      chatList,
      'chatId',
      deletedChats[0].chatId,
    ],
    [
      `chats?storyId=${deletedStories[0].storyId}`,
      chatList,
      'chatId',
      deletedChats[1].chatId,
    ],
  ] as const) {
    const data = await route(request(`${path}&deleted=only`)).json();

    expect(data.items.map((x: Record<string, string>) => x[key])).toContain(id);
    expect(
      data.items.every(
        (x: { deletedAt: string | null }) => x.deletedAt !== null,
      ),
    ).toBe(true);
  }
});
it('삭제된 fixture 상세와 설정은 삭제 시각을 포함해 200을 반환한다', async () => {
  for (const [domain, route, id] of [
    ['stories', storyDetail, deletedStories[0].storyId],
    ['stories', storySettings, deletedStories[0].storyId],
    ['chats', chatDetail, deletedChats[0].chatId],
  ] as const) {
    const response = await route(request(`${domain}/${id}`), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(200);
    expect((await response.json()).deletedAt).toBe('2026-10-25T03:10:00Z');
  }
});
