import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { shiftDate } from '@/features/analytics/range';
import { metricsRoute } from '@/fixtures/metrics-route';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-03T03:00:00Z'));
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
it.each([
  ['/campaigns/funnels/activation', 62, 31],
  ['/campaigns/reach', 62, 31],
  ['/campaigns/funnels/creation', 41, 20],
  ['/campaigns/funnels/story-detail', 35, 31],
] as const)(
  '%s fixture는 3차와 확정 상한을 허용하고 초과·진행 중 상한은 거부한다',
  async (path, max, normal) => {
    const invoke = (from: string, to: string) =>
      metricsRoute(
        new Request(
          `http://localhost/api${path}?campaign=THIRD_2026&from=${from}&to=${to}`,
        ),
      );
    const response = await invoke('2026-08-25', '2026-09-28');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      from: '2026-08-25',
      to: '2026-09-28',
    });
    expect(
      (await invoke(shiftDate('2026-10-21', 1 - max), '2026-10-21')).status,
    ).toBe(200);
    expect(
      (await invoke(shiftDate('2026-10-21', -max), '2026-10-21')).status,
    ).toBe(400);
    expect(
      (await invoke(shiftDate('2026-11-03', -normal), '2026-11-03')).status,
    ).toBe(400);
  },
);
