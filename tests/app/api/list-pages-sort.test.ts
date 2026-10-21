import { describe, expect, it } from 'vitest';

import { GET as chats } from '@/app/api/chats/route';
import { GET as members } from '@/app/api/members/route';
import { GET as payments } from '@/app/api/payments/route';
import { GET as stories } from '@/app/api/stories/route';
import type { ChatRoom } from '@/features/chats/types';
import type { MemberListItem } from '@/features/members/types';
import type { PaymentOrder } from '@/features/payments/types';
import { listSorts } from '@/features/shared/list-config';
import type { Page } from '@/features/shared/types';
import type { Story } from '@/features/stories/types';
import * as entities from '@/fixtures/entities';

type Row = Story | MemberListItem | PaymentOrder | ChatRoom;

const cases = [
  { domain: 'stories', get: stories, rows: entities.stories, id: 'storyId' },
  { domain: 'members', get: members, rows: entities.members, id: 'memberId' },
  { domain: 'payments', get: payments, rows: entities.payments, id: 'orderId' },
  { domain: 'chats', get: chats, rows: entities.chats, id: 'chatId' },
] as const;
const field = (row: Row, key: string): string | number | null =>
  (row as unknown as Record<string, string | number | null>)[key];

for (const { domain, get, rows, id } of cases) {
  const read = async (query = ''): Promise<Page<Row>> => {
    const response = get(
      new Request(`http://localhost/api/${domain}?${query}`),
    );

    expect(response.status).toBe(200);

    return response.json();
  };

  describe(`${domain} 숫자 페이지와 전체 정렬`, () => {
    it('기본 20건, 크기 1·100, 마지막 페이지와 범위 밖을 구분한다', async () => {
      const first = await read();

      expect(Object.keys(first)).toEqual([
        'items',
        'page',
        'size',
        'totalElements',
        'totalPages',
      ]);
      expect(first).toMatchObject({
        page: 1,
        size: 20,
        totalElements: rows.length,
        totalPages: Math.ceil(rows.length / 20),
      });
      expect(first.items).toHaveLength(20);

      for (const size of [1, 20, 100]) {
        const totalPages = Math.ceil(rows.length / size);
        const last = await read(`page=${totalPages}&size=${size}`);

        expect(last.items).toHaveLength(rows.length - (totalPages - 1) * size);
        expect(last).toMatchObject({
          page: totalPages,
          size,
          totalElements: rows.length,
          totalPages,
        });
        expect(await read(`page=${totalPages + 1}&size=${size}`)).toMatchObject(
          {
            items: [],
            page: totalPages + 1,
            totalElements: rows.length,
            totalPages,
          },
        );
      }

      expect(await read('page=9007199254740991')).toMatchObject({
        items: [],
        totalPages: first.totalPages,
      });
    });

    it('빈 필터 결과도 페이지 메타데이터를 보존한다', async () => {
      const filter =
        domain === 'members' ? 'query=없는회원검색' : 'memberId=missing';

      expect(await read(`${filter}&page=3&size=7`)).toEqual({
        items: [],
        page: 3,
        size: 7,
        totalElements: 0,
        totalPages: 0,
      });
    });

    it('잘못된 페이지·크기·정렬 열·방향은 빈 결과에서도 400이다', () => {
      const invalid = [
        '0',
        '-1',
        '1.5',
        'NaN',
        'Infinity',
        '1e2',
        'abc',
        '',
        ' 2',
        '9007199254740992',
      ];
      const queries = [
        ...['page', 'size'].flatMap((key) =>
          invalid.map((value) => `${key}=${encodeURIComponent(value)}`),
        ),
        'size=101',
        'page=1&page=2',
        'size=20&size=30',
        'sort=latest',
        'sort=unknown',
        'sort=',
        'sort=createdAt&sort=priceKrw',
        'order=ASC',
        'order=unknown',
        'order=',
        'order=asc&order=desc',
        'cursor=legacy',
        'limit=20',
      ];

      for (const query of queries)
        expect(
          get(
            new Request(
              `http://localhost/api/${domain}?memberId=missing&query=없는회원검색&${query}`,
            ),
          ).status,
          query,
        ).toBe(400);
    });

    for (const sort of listSorts[domain]) {
      it.each(['desc', 'asc'])(
        `${sort} %s를 전체에 적용하고 동률은 ID 오름차순으로 고정한다`,
        async (order) => {
          const original = rows[0];
          const duplicate = {
            ...original,
            [id]: '00000009-0000-4000-8000-999999999999',
          } as Row;

          (rows as Row[]).push(duplicate);

          try {
            const expected = [...rows].sort((a, b) => {
              const left = field(a, sort);
              const right = field(b, sort);
              const tie = String(field(a, id)).localeCompare(
                String(field(b, id)),
              );

              if (left === null || right === null)
                return left === right ? tie : left === null ? 1 : -1;

              const comparison = left < right ? -1 : left > right ? 1 : 0;

              return comparison * (order === 'asc' ? 1 : -1) || tie;
            });
            const actual: Row[] = [];
            const size = 100;

            for (let page = 1; page <= Math.ceil(rows.length / size); page++) {
              const result = await read(
                `sort=${sort}&order=${order}&size=${size}&page=${page}`,
              );

              actual.push(...result.items);
            }

            const ids = actual.map((row) => field(row, id));

            expect(ids).toEqual(expected.map((row) => field(row, id)));
            expect(new Set(ids).size).toBe(rows.length);

            const originalIndex = actual.findIndex(
              (row) => field(row, id) === field(original, id),
            );
            const duplicateIndex = actual.findIndex(
              (row) => field(row, id) === field(duplicate, id),
            );

            expect(originalIndex).toBeLessThan(duplicateIndex);
            expect(
              actual.filter((row) => field(row, sort) === field(original, sort))
                .length,
            ).toBeGreaterThan(1);
          } finally {
            (rows as Row[]).pop();
          }
        },
      );
    }
  });
}
