import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { GET as detail } from '@/app/api/members/[id]/route';
import { GET as list } from '@/app/api/members/route';
import { chats, deletedChats, members } from '@/fixtures/entities';
import { kstDate } from '@/fixtures/query';

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
});
afterEach(() => vi.unstubAllEnvs());

it.each([
  '',
  'chatFrom=2026-10-01',
  'chatTo=2026-10-21',
  'chatFrom=2026-10-01&chatTo=2026-10-21',
])(
  '회원 목록과 상세는 같은 누적 턴을 주고 채팅 생성일 기간만 별도 집계한다: %s',
  async (period) => {
    const member = members[1];
    const response = list(
      new Request(
        `http://localhost/api/members?q=${member.memberId}&${period}`,
      ),
    );

    expect(response.status).toBe(200);

    const {
      items: [row],
    } = await response.json();
    const result = await detail(
      new Request(`http://localhost/api/members/${member.memberId}`),
      { params: Promise.resolve({ id: member.memberId }) },
    );
    const memberDetail = await result.json();
    const owned = [...chats, ...deletedChats].filter(
      (chat) => chat.member?.memberId === member.memberId,
    );
    const query = new URLSearchParams(period);
    const expected = owned
      .filter(
        (chat) =>
          (!query.get('chatFrom') ||
            kstDate(chat.startedAt) >= query.get('chatFrom')!) &&
          (!query.get('chatTo') ||
            kstDate(chat.startedAt) <= query.get('chatTo')!),
      )
      .reduce((sum, chat) => sum + chat.turnCount, 0);

    expect(row.turnCount).toBe(
      owned.reduce((sum, chat) => sum + chat.turnCount, 0),
    );
    expect(row.turnCount).toBe(memberDetail.turnCount);
    expect(row.periodTurnCount).toBe(period ? expected : null);
    expect(memberDetail.periodTurnCount).toBeNull();
  },
);

it.each(['desc', 'asc'])(
  '기간 필터가 있어도 누적 턴 %s 순으로 정렬한다',
  async (order) => {
    const response = list(
      new Request(
        `http://localhost/api/members?chatFrom=2026-10-01&chatTo=2026-10-21&sort=turnCount&order=${order}&size=100`,
      ),
    );

    expect(response.status).toBe(200);

    const { items } = await response.json();

    expect(items.length).toBeGreaterThan(1);

    const actual = items.map((row: { turnCount: number }) => row.turnCount);

    expect(actual).toEqual(
      actual.toSorted((a: number, b: number) =>
        order === 'asc' ? a - b : b - a,
      ),
    );
  },
);
