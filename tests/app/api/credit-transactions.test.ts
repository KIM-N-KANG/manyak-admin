import { afterEach, expect, it } from 'vitest';

import { GET } from '@/app/api/credits/transactions/route';
import type { CreditTransactionItem } from '@/features/credits/types';
import type { CreditTransaction } from '@/features/members/types';
import type { Page } from '@/features/shared/types';
import { members, memberTransactions } from '@/fixtures/entities';

const original = new Map(memberTransactions);
const originalAdmin = members[0].isAdmin;
const request = (query = '') =>
  new Request(
    `http://localhost/api/credits/transactions${query ? `?${query}` : ''}`,
  );
const read = (query = ''): Promise<Page<CreditTransactionItem>> =>
  GET(request(query)).json();

afterEach(() => {
  memberTransactions.clear();

  for (const [id, rows] of original) memberTransactions.set(id, rows);

  members[0].isAdmin = originalAdmin;
});

it('전체 원장을 페이지로 반환하고 공통 회원 요약 이외의 식별자·잔액·개인정보를 노출하지 않는다', async () => {
  const data = await read();

  expect(data).toMatchObject({
    page: 1,
    size: 20,
    totalElements: 6200,
    totalPages: 310,
  });
  expect(data.items).toHaveLength(20);

  for (const row of data.items) {
    expect(Object.keys(row).sort()).toEqual([
      'amount',
      'createdAt',
      'member',
      'reason',
    ]);
    expect(Object.keys(row.member).sort()).toEqual([
      'createdAt',
      'isAdmin',
      'memberId',
      'nickname',
      'status',
    ]);

    const member = members.find(
      (member) => member.memberId === row.member.memberId,
    )!;

    expect(row.member).toEqual({
      memberId: member.memberId,
      nickname: member.nickname,
      status: member.status,
      isAdmin: member.isAdmin,
      createdAt: member.createdAt,
    });
  }
});

it('동률의 내부 순번 내림차순을 필터와 페이지 사이에서도 유지한다', async () => {
  memberTransactions.clear();

  const createdAt = '2026-10-20T15:00:00Z';
  const rows: CreditTransaction[] = [1, 2, 3].map((amount) => ({
    createdAt,
    amount,
    reason: 'ADMIN_GRANT',
    balanceAfter: amount,
  }));

  memberTransactions.set(members[0].memberId, rows.slice(0, 2));
  memberTransactions.set(members[1].memberId, rows.slice(2));

  for (const filter of [
    '',
    '&direction=granted&date=2026-10-21',
    '&order=asc',
  ]) {
    const pages = await Promise.all(
      [1, 2, 3].map((page) => read(`size=1&page=${page}${filter}`)),
    );

    expect(
      pages.flatMap((page) => page.items.map((row) => row.amount)),
    ).toEqual([3, 2, 1]);
  }

  expect((await read('page=4&size=1')).items).toEqual([]);
});

it('KST 자정·사유·부호로 필터링하며 전체에는 환불·만료·회수와 팀·정지·탈퇴 회원을 포함한다', async () => {
  memberTransactions.clear();
  members[0].isAdmin = true;

  const before = '2026-10-20T14:59:59Z';
  const midnight = '2026-10-20T15:00:00Z';
  const transaction = (
    amount: number,
    reason: string,
    createdAt = midnight,
  ): CreditTransaction => ({ amount, reason, createdAt, balanceAfter: 0 });

  memberTransactions.set(members[0].memberId, [
    transaction(100, 'PURCHASE', before),
    transaction(10, 'SIGNUP_REWARD'),
    transaction(20, 'INVITE_REWARD'),
    transaction(30, 'ATTENDANCE_REWARD'),
    transaction(40, 'PURCHASE'),
    transaction(50, 'ADMIN_GRANT'),
    transaction(-1, 'STORY_CREATION'),
    transaction(-2, 'CHAT_TURN'),
    transaction(-3, 'CHAT_IMAGE'),
    transaction(1, 'REFUND'),
    transaction(-1, 'EXPIRE'),
    transaction(-1, 'ADMIN_REVOKE'),
    transaction(-10, 'ADMIN_GRANT'),
    transaction(10, 'CHAT_TURN'),
    transaction(0, 'PURCHASE'),
  ]);
  memberTransactions.set(members[4].memberId, [transaction(1, 'REFUND')]);
  memberTransactions.set(members[7].memberId, [transaction(-1, 'EXPIRE')]);

  const granted = await read('direction=granted&date=2026-10-21');

  expect(granted.items.map((row) => row.amount)).toEqual([50, 40, 30, 20, 10]);
  expect(granted.items.every((row) => row.member.isAdmin)).toBe(true);

  const spent = await read('direction=spent&date=2026-10-21');

  expect(spent.items.map((row) => row.amount)).toEqual([-3, -2, -1]);
  expect(
    (await read('date=2026-10-20')).items.map((row) => row.amount),
  ).toEqual([100]);

  const all = await read('date=2026-10-21');

  expect(all.totalElements).toBe(16);
  expect(all.items.map((row) => row.member.status)).toEqual(
    expect.arrayContaining(['DELETED', 'SUSPENDED']),
  );
  expect(all.items.map((row) => row.reason)).toEqual(
    expect.arrayContaining(['REFUND', 'EXPIRE', 'ADMIN_REVOKE']),
  );
  expect((await read('date=2027-01-01')).totalElements).toBe(0);
});

it('기록 시각의 기본 최신순과 오름차순을 지원한다', async () => {
  const desc = await read();
  const asc = await read('sort=createdAt&order=asc');

  expect(desc.items[0].createdAt).toBe('2026-10-21T04:00:00Z');
  expect(asc.items[0].createdAt).toBe('2026-10-19T15:00:00Z');
});

it.each([
  'direction=other',
  'direction=',
  'direction=granted&direction=spent',
  'date=2026-02-30',
  'date=2026-2-01',
  'date=',
  'date=invalid',
  'date=2026-10-21&date=2026-10-20',
  'page=0',
  'page=1.5',
  'page=1&page=2',
  'page=9007199254740992',
  'size=0',
  'size=101',
  'size=1&size=2',
  'sort=amount',
  'sort=createdAt&sort=createdAt',
  'order=up',
  'order=asc&order=desc',
  'memberId=00000001-0000-4000-8000-000000000001',
  'q=member',
  'cursor=one',
  'limit=10',
])('지원하지 않는 쿼리 %s는 BAD_REQUEST이다', async (query) => {
  const response = GET(request(query));

  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    status: 400,
    code: 'BAD_REQUEST',
    path: '/api/credits/transactions',
  });
});
