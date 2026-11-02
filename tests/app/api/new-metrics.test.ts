import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { metricsRoute } from '@/fixtures/metrics-route';

const paths = [
  '/payments/metrics',
  '/credits/metrics',
  '/stories/consumption',
  '/chats/engagement',
  '/moderation/metrics',
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-02T03:00:00Z'));
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it.each(paths)(
  '%s fixture도 생성 Zod로 쿼리를 검증하고 계약 응답을 준다',
  async (path) => {
    const response = await metricsRoute(
      new Request(
        `http://localhost/api${path}?from=2026-10-26&to=2026-10-27${path.includes('consumption') ? '&limit=20' : ''}`,
      ),
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    const expectedKey = (
      {
        '/payments/metrics': 'conversionRate',
        '/credits/metrics': 'sinkRate',
        '/stories/consumption': 'ranking',
        '/chats/engagement': 'monthlyActiveMembers',
        '/moderation/metrics': 'rejectionRules',
      } as Record<string, string>
    )[path];

    expect(data).toHaveProperty(expectedKey);
    expect(data).toMatchObject({
      from: '2026-10-26',
      to: '2026-10-27',
    });

    for (const invalid of [
      'from=not-date&to=2026-10-27',
      'from=2026-10-27&to=2026-10-26',
      'from=2026-10-26',
      'unexpected=1',
      'days=abc',
      'days=0',
      'days=367',
      'from=2026-10-26&from=2026-10-25&to=2026-10-27',
    ]) {
      expect(
        (
          await metricsRoute(
            new Request(`http://localhost/api${path}?${invalid}`),
          )
        ).status,
      ).toBe(400);
    }
  },
);
it.each(['0', '51', '1.5', 'abc'])(
  '소비 limit=%s는 거부한다',
  async (limit) => {
    expect(
      (
        await metricsRoute(
          new Request(
            `http://localhost/api/stories/consumption?limit=${limit}`,
          ),
        )
      ).status,
    ).toBe(400);
  },
);

it.each(paths)(
  '%s의 기본 기간과 days=30은 모두 오늘을 포함한 30일이다',
  async (path) => {
    for (const query of ['', '?days=30']) {
      const response = await metricsRoute(
        new Request(`http://localhost/api${path}${query}`),
      );

      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.from).toBe('2026-10-04');
      expect(data.to).toBe('2026-11-02');
      expect((Date.parse(data.to) - Date.parse(data.from)) / 86400000 + 1).toBe(
        30,
      );

      if ('daily' in data) expect(data.daily).toHaveLength(30);
    }
  },
);

it('생성 응답 Zod가 unknown인 신규 fixture는 응답 키와 계약 구간 순서를 검증한다', async () => {
  const keys: Record<string, string[]> = {
    '/payments/metrics': [
      'asOf',
      'from',
      'to',
      'activeMembers',
      'payingMembers',
      'conversionRate',
      'orders',
      'amountKrw',
      'arppu',
      'firstTime',
      'repeat',
      'products',
      'refundedOrders',
      'refundRate',
      'daysToFirstPayment',
    ],
    '/credits/metrics': [
      'asOf',
      'from',
      'to',
      'granted',
      'spent',
      'sinkRate',
      'grantedByReason',
      'spentByReason',
      'balances',
    ],
    '/stories/consumption': [
      'asOf',
      'from',
      'to',
      'publicStories',
      'officialStories',
      'playedStories',
      'playedRate',
      'otherMemberChats',
      'topConcentration',
      'ranking',
      'creators',
    ],
    '/chats/engagement': [
      'asOf',
      'from',
      'to',
      'activeMembers',
      'monthlyActiveMembers',
      'turnsPerActiveMember',
      'daily',
    ],
    '/moderation/metrics': [
      'asOf',
      'from',
      'to',
      'decided',
      'approved',
      'rejected',
      'rejectionRate',
      'failed',
      'held',
      'pending',
      'daily',
      'rejectionRules',
    ],
  };

  for (const path of paths) {
    const response = await metricsRoute(
      new Request(`http://localhost/api${path}?days=30`),
    );

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(Object.keys(data).toSorted()).toEqual(keys[path].toSorted());

    if (path === '/payments/metrics')
      expect(
        data.daysToFirstPayment.map((row: { bucket: string }) => row.bucket),
      ).toEqual(['0', '1~3', '4~7', '8~30', '31+']);

    if (path === '/credits/metrics') {
      expect(
        data.grantedByReason.map((row: { reason: string }) => row.reason),
      ).toEqual([
        'SIGNUP_REWARD',
        'INVITE_REWARD',
        'ATTENDANCE_REWARD',
        'PURCHASE',
        'ADMIN_GRANT',
      ]);
      expect(
        data.spentByReason.map((row: { reason: string }) => row.reason),
      ).toEqual(['STORY_CREATION', 'CHAT_TURN', 'CHAT_IMAGE']);
      expect(
        data.balances.buckets.map((row: { bucket: string }) => row.bucket),
      ).toEqual(['0', '1~99', '100~499', '500~1999', '2000+']);
    }
  }
});
