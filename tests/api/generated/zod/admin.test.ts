import { expect, it } from 'vitest';

import { ChatsQueryParams } from '@/api/generated/zod/admin';

it('생성된 채팅 쿼리 Zod는 turnBucket 11·12를 허용하고 13은 거부한다', () => {
  for (const turnBucket of [11, 12]) {
    expect(
      ChatsQueryParams.safeParse({ request: { turnBucket } }).success,
    ).toBe(true);
  }

  expect(
    ChatsQueryParams.safeParse({ request: { turnBucket: 13 } }).success,
  ).toBe(false);
});
