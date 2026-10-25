import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { POST as adjust } from '@/app/api/credits/adjustments/route';
import {
  DELETE as unsuspend,
  POST as suspend,
} from '@/app/api/members/[id]/suspension/route';
import {
  getMemberDetail,
  members,
  memberTransactions,
} from '@/fixtures/entities';

const statuses = members.map((member) => member.status);
const transactions = new Map(memberTransactions);
const reason = '운영 조치';

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
});
afterEach(() => {
  members.forEach((member, index) => (member.status = statuses[index]));
  memberTransactions.clear();

  for (const [id, rows] of transactions) memberTransactions.set(id, rows);

  vi.unstubAllEnvs();
});

function request(path: string, method: string, body: unknown) {
  return new Request(`https://admin.example/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const adjustment = (body: Record<string, unknown>) =>
  adjust(
    request('/credits/adjustments', 'POST', {
      memberId: members[2].memberId,
      idempotencyKey: crypto.randomUUID(),
      reason,
      ...body,
    }),
  );
const suspension = (
  index: number,
  method: 'POST' | 'DELETE',
  body = { reason },
) =>
  (method === 'POST' ? suspend : unsuspend)(
    request(`/members/${members[index].memberId}/suspension`, method, body),
  );

it('지급은 기본 30일 만료와 관리자 지급 행을 남긴다', async () => {
  const response = await adjustment({ type: 'GRANT', amount: 5000 });
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data).toMatchObject({
    type: 'GRANT',
    requestedAmount: 5000,
    appliedAmount: 5000,
    shortfall: 0,
    balance: 10240,
    duplicated: false,
  });
  expect(Date.parse(data.expiresAt) - Date.now()).toBeGreaterThan(
    29.9 * 86400000,
  );
  expect(memberTransactions.get(members[2].memberId)![0]).toMatchObject({
    amount: 5000,
    reason: 'ADMIN_GRANT',
    balanceAfter: 10240,
  });
});

it('잔액보다 큰 회수는 잔액만큼만 회수하고 부족분을 돌려준다', async () => {
  const data = await (
    await adjustment({ type: 'REVOKE', amount: 10000, expiresInDays: 10 })
  ).json();

  expect(data).toMatchObject({
    appliedAmount: 5240,
    shortfall: 4760,
    balance: 0,
    expiresAt: null,
  });
  expect(getMemberDetail(members[2].memberId)!.creditBalance).toBe(0);
});

it('같은 멱등 키는 같은 요청이면 처음 결과를, 다르면 409를 돌려준다', async () => {
  const idempotencyKey = 'retry-key-1';
  const first = await (
    await adjustment({ type: 'GRANT', amount: 100, idempotencyKey })
  ).json();
  const again = await adjustment({
    type: 'GRANT',
    amount: 100,
    idempotencyKey,
  });
  const changed = await adjustment({
    type: 'GRANT',
    amount: 200,
    idempotencyKey,
  });

  expect(await again.json()).toEqual({ ...first, duplicated: true });
  expect(changed.status).toBe(409);
  expect((await changed.json()).code).toBe('IDEMPOTENCY_KEY_CONFLICT');
  expect(getMemberDetail(members[2].memberId)!.creditBalance).toBe(5340);
});

it.each([
  [{ type: 'GRANT', amount: 0 }, 400],
  [{ type: 'GRANT', amount: 100001 }, 400],
  [{ type: 'GRANT', amount: 10, expiresInDays: 366 }, 400],
  [{ type: 'SET', amount: 10 }, 400],
  [{ type: 'GRANT', amount: 10, reason: '   ' }, 400],
  [{ type: 'GRANT', amount: 10, idempotencyKey: 'a b' }, 400],
  [{ type: 'GRANT', amount: 10, memberId: members[4].memberId }, 409],
  [
    {
      type: 'GRANT',
      amount: 10,
      memberId: '00000009-0000-4000-8000-000000000009',
    },
    404,
  ],
])('조정 %o는 %i로 거절한다', async (body, status) => {
  expect((await adjustment(body)).status).toBe(status);
});

it('정지와 해제는 상태를 전환하고 같은 상태·관리자·탈퇴는 409로 거절한다', async () => {
  const suspended = await suspension(2, 'POST');

  expect(await suspended.json()).toMatchObject({
    memberId: members[2].memberId,
    status: 'SUSPENDED',
  });
  expect((await suspension(2, 'POST')).status).toBe(409);
  expect((await (await suspension(2, 'DELETE')).json()).status).toBe('ACTIVE');
  expect((await suspension(2, 'DELETE')).status).toBe(409);
  expect((await suspension(4, 'POST')).status).toBe(409);

  const admin = await suspension(1, 'POST');

  expect(admin.status).toBe(409);
  expect((await admin.json()).code).toBe('ADMIN_ACCOUNT_PROTECTED');
  expect((await suspension(2, 'POST', { reason: ' ' })).status).toBe(400);
});
