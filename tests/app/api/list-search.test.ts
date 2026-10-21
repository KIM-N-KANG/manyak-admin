import { describe, expect, it } from 'vitest';

import { GET as chats } from '@/app/api/chats/route';
import { GET as members } from '@/app/api/members/route';
import { GET as originals } from '@/app/api/originals/route';
import { GET as payments } from '@/app/api/payments/route';
import { GET as stories } from '@/app/api/stories/route';
import { searchHref } from '@/features/shared/search';
import * as fixtures from '@/fixtures/entities';
import { listOriginals } from '@/fixtures/originals';
import { matchesSearch, readSearch } from '@/fixtures/search';

const original = listOriginals()[0];
const chat = fixtures.chats.find((row) => row.member)!;
const story = fixtures.stories[0];
const member = fixtures.members[0];
const payment = fixtures.payments[0];
const cases = [
  {
    domain: 'members',
    get: members,
    partial: member.nickname.slice(0, 2),
    exact: [member.memberId, fixtures.memberEmails.get(member.memberId)!],
    field: 'memberId',
    id: member.memberId,
    filter: `status=${member.status}`,
    opposite: `status=${member.status === 'ACTIVE' ? 'DELETED' : 'ACTIVE'}`,
    sort: 'createdAt',
  },
  {
    domain: 'stories',
    get: stories,
    partial: story.title.slice(0, 2),
    extra: story.owner.nickname,
    exact: [story.storyId],
    field: 'storyId',
    id: story.storyId,
    filter: `visibility=${story.visibility}`,
    opposite: `visibility=${story.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'}`,
    sort: 'chatCount',
  },
  {
    domain: 'originals',
    get: originals,
    partial: original.title.slice(0, 2),
    exact: [original.id],
    field: 'id',
    id: original.id,
    filter: `visibility=${original.visibility}`,
    opposite: `visibility=${original.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'}`,
    sort: 'updatedAt',
  },
  {
    domain: 'chats',
    get: chats,
    partial: chat.story.title.slice(0, 2),
    extra: chat.member!.nickname,
    exact: [chat.chatId],
    field: 'chatId',
    id: chat.chatId,
    filter: `startedAs=${chat.startedAs}`,
    opposite: `startedAs=${chat.startedAs === 'MEMBER' ? 'GUEST' : 'MEMBER'}`,
    sort: 'turnCount',
  },
  {
    domain: 'payments',
    get: payments,
    partial: payment.member.nickname.slice(0, 2),
    exact: [payment.orderId, payment.member.memberId],
    field: 'orderId',
    id: payment.orderId,
    filter: `status=${payment.status}`,
    opposite: `status=${payment.status === 'COMPLETED' ? 'REFUNDED' : 'COMPLETED'}`,
    sort: 'priceKrw',
  },
];

for (const c of cases) {
  const read = async (q: string, more = '') => {
    const response = c.get(
      new Request(
        `http://localhost/api/${c.domain}?q=${encodeURIComponent(q)}&size=100&${more}`,
      ),
    );

    expect(response.status).toBe(200);

    return response.json();
  };

  describe(`${c.domain} 공통 검색`, () => {
    it('공백·대소문자를 정리한 부분 검색과 추가 닉네임 검색을 적용한다', async () => {
      for (const term of [c.partial, ...(c.extra ? [c.extra] : [])]) {
        const data = await read(`  ${term.toUpperCase()}  `);

        expect(
          data.items.some(
            (row: Record<string, string>) => row[c.field] === c.id,
          ),
        ).toBe(true);
      }
    });
    it('공개 식별자는 정확 일치하고 이메일·회원 ID도 지정된 필드만 일치한다', async () => {
      for (const term of c.exact) {
        const data = await read(term.toUpperCase());

        expect(
          data.items.some(
            (row: Record<string, string>) => row[c.field] === c.id,
          ),
        ).toBe(true);
        expect((await read(term.slice(0, -1))).items).toEqual([]);
      }
    });
    it('필터·정렬을 AND로 적용한 전체 결과를 페이지로 자른다', async () => {
      const term = c.exact[0];

      expect((await read(term, c.filter)).items).toHaveLength(1);
      expect((await read(term, c.opposite)).items).toEqual([]);

      const all = await read(c.partial, `${c.filter}&sort=${c.sort}&order=asc`);

      expect(all.totalElements).toBeGreaterThan(0);

      const response = c.get(
        new Request(
          `http://localhost/api/${c.domain}?q=${encodeURIComponent(c.partial)}&${c.filter}&sort=${c.sort}&order=asc&page=2&size=1`,
        ),
      );
      const page = await response.json();

      expect(page.items).toEqual(all.items.slice(1, 2));
      expect(page.totalElements).toBe(all.totalElements);

      const outside = await read(c.partial, 'page=999');

      expect(outside.items).toEqual([]);

      const url = new URL(
        searchHref(
          `/${c.domain}`,
          new URLSearchParams(
            `page=9&size=3&${c.filter}&sort=${c.sort}&order=asc`,
          ),
          term,
        ),
        'http://localhost',
      );

      expect(url.searchParams.get('page')).toBe('1');
      expect(url.searchParams.get('q')).toBe(term);
      expect(url.searchParams.get('size')).toBe('3');
      expect(url.searchParams.get('sort')).toBe(c.sort);
      expect(url.searchParams.get('order')).toBe('asc');

      const [key, value] = c.filter.split('=');

      expect(url.searchParams.get(key)).toBe(value);
    });
    it('빈 검색은 해제하고 50자 경계·초과·중복은 전체 결과 전에 검증한다', async () => {
      expect((await read('   ')).totalElements).toBeGreaterThan(0);
      expect((await read('가'.repeat(50))).items).toEqual([]);

      for (const suffix of [`q=${'가'.repeat(51)}`, 'q=a&q=b'])
        expect(
          c.get(new Request(`http://localhost/api/${c.domain}?${suffix}`))
            .status,
        ).toBe(400);

      const url = new URL(
        searchHref(
          `/${c.domain}`,
          new URLSearchParams('q=old&page=9&size=3'),
          '  ',
        ),
        'http://localhost',
      );

      expect(url.searchParams.has('q')).toBe(false);
      expect(url.searchParams.get('page')).toBe('1');
    });
  });
}

it('원천 문자열의 연속 공백과 영문 대소문자도 동일하게 정리한다', () => {
  expect(readSearch(new URLSearchParams('q=++HELLO+++World++'))).toBe(
    'hello world',
  );
  expect(matchesSearch('hello world', ['HELLO   World'])).toBe(true);
  expect(
    matchesSearch(
      'MEMBER@EXAMPLE.COM'.toLowerCase(),
      [],
      ['Member@example.com'],
    ),
  ).toBe(true);
  expect(matchesSearch('member', [], ['Member@example.com'])).toBe(false);
});
