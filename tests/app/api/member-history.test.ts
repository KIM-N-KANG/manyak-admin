import { describe, expect, it } from 'vitest';

import { GET as attendance } from '@/app/api/members/[id]/attendance/route';
import { GET as detail } from '@/app/api/members/[id]/route';
import { GET as transactions } from '@/app/api/members/[id]/transactions/route';
import { getMemberDetail, members } from '@/fixtures/entities';

for (const [kind, get] of [
  ['transactions', transactions],
  ['attendance', attendance],
] as const) {
  const id = members[0].memberId;
  const request = (query = '') =>
    new Request(`http://localhost/api/members/${id}/${kind}?${query}`);
  const context = { params: Promise.resolve({ id }) };

  describe(`${kind} 페이지 응답`, () => {
    it('기본값·마지막·범위 밖 및 원천 전체 이력의 연속성을 확인한다', async () => {
      const all = getMemberDetail(id)![kind];
      const base = await (await get(request(), context)).json();

      expect(base).toMatchObject({
        page: 1,
        size: 20,
        totalElements: all.length,
        totalPages: Math.ceil(all.length / 20),
      });

      const rows = [];

      for (let page = 1; page <= all.length; page++) {
        const result = await (
          await get(request(`page=${page}&size=1`), context)
        ).json();

        rows.push(...result.items);
      }

      expect(rows).toEqual(all);
      expect(
        await (
          await get(request(`page=${all.length + 1}&size=1`), context)
        ).json(),
      ).toMatchObject({ items: [], totalPages: all.length });
      expect(JSON.stringify(base)).not.toContain('transactionId');
    });
    it.each([
      'page=0',
      'page=-1',
      'page=1.5',
      'page=',
      'page=1&page=2',
      'size=0',
      'size=101',
      'size=abc',
      'size=1&size=2',
    ])('%s는 400이다', async (query) => {
      expect((await get(request(query), context)).status).toBe(400);
    });
    it('잘못된 공개 ID와 없는 회원을 구분한다', async () => {
      expect(
        (
          await get(request(), {
            params: Promise.resolve({ id: 'internal-1' }),
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await get(request(), {
            params: Promise.resolve({
              id: '99999999-0000-4000-8000-000000000001',
            }),
          })
        ).status,
      ).toBe(404);
    });
  });
}

it('회원 상세의 거래도 ID 없는 동일 원천을 사용한다', async () => {
  const id = members[0].memberId;
  const response = await detail(
    new Request(`http://localhost/api/members/${id}`),
    { params: Promise.resolve({ id }) },
  );
  const data = await response.json();

  expect(data.transactions).toEqual(getMemberDetail(id)!.transactions);

  for (const row of data.transactions)
    expect(Object.keys(row).sort()).toEqual([
      'amount',
      'balanceAfter',
      'createdAt',
      'reason',
    ]);
});

it('공개 응답의 엔터티 식별자는 UUID이고 상품 코드를 ID로 노출하지 않는다', async () => {
  const id = members[0].memberId;
  const data = await (
    await detail(new Request(`http://localhost/api/members/${id}`), {
      params: Promise.resolve({ id }),
    })
  ).json();
  let checked = 0;

  function check(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(check);

      return;
    }

    if (!value || typeof value !== 'object') return;

    for (const [key, entry] of Object.entries(value)) {
      if ((key === 'id' || key.endsWith('Id')) && entry !== null) {
        expect(entry).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
        checked++;
      }

      check(entry);
    }
  }

  check(data);
  expect(checked).toBeGreaterThan(1);

  for (const order of data.payments) {
    expect(order.productCode).toMatch(/^if_\d+$/);
    expect(order).not.toHaveProperty('productId');
  }
});
