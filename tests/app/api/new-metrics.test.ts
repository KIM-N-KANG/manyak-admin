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
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
});
afterEach(() => vi.unstubAllEnvs());
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
