import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { analyticsRefetch, defaultPeriod } from '@/features/analytics/range';
import { metricsRoute } from '@/fixtures/metrics-route';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-24T05:00:00Z'));
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const invoke = (query = '') =>
  metricsRoute(
    new NextRequest(
      `http://localhost/api/campaigns/push-opens${query ? `?${query}` : ''}`,
    ),
  );

it('최근 7일과 기간 쿼리를 적용한 fixture는 모든 측정 상태와 네 활동 종류를 제공한다', async () => {
  expect(defaultPeriod('push', undefined, '2026-10-24')).toEqual({
    from: '2026-10-18',
    to: '2026-10-24',
  });

  const response = await invoke();

  expect(response.status).toBe(200);

  const data = await response.json();

  expect(data.from).toBe('2026-10-18');
  expect(data.to).toBe('2026-10-24');
  expect(data.activityTypes.map((x: { type: string }) => x.type)).toEqual([
    'STORY_COMPLETED',
    'STORY_MODERATION_COMPLETED',
    'ATTENDANCE_REMINDER',
    'CREDIT_EXPIRY_REMINDER',
  ]);
  expect(
    new Set(data.campaigns.map((x: { openState: string }) => x.openState)),
  ).toEqual(new Set(['MEASURED', 'BEFORE_MEASUREMENT', 'NO_LINK', 'PENDING']));
});
it.each([
  ['14', '2026-10-11'],
  ['30', '2026-09-25'],
])('fixture는 days=%s의 기간을 적용한다', async (days, from) => {
  const response = await invoke(`days=${days}`);

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ from, to: '2026-10-24' });
});
it.each([
  'days=x',
  'days=7&from=2026-10-18&to=2026-10-24',
  'from=2026-10-18',
  'from=2024-01-01&to=2026-10-24',
  'campaign=FOURTH_2026',
])('%s는 400이다', async (query) => {
  expect((await invoke(query)).status).toBe(400);
});
it('측정 시작 전 범위는 null 기준 시각·빈 준비 날짜이고 재요청하지 않는다', async () => {
  const response = await invoke('from=2026-10-01&to=2026-10-02');

  expect(response.status).toBe(200);

  const data = await response.json();

  expect(data.asOf).toBeNull();
  expect(data.pendingDates).toEqual([]);
  expect(data.activityFrom).toBeNull();
  expect(
    data.activityTypes.every(
      (x: { openState: string; pushOpens: number | null }) =>
        x.openState === 'BEFORE_MEASUREMENT' && x.pushOpens === null,
    ),
  ).toBe(true);
  expect(analyticsRefetch({ state: { data } })).toBe(false);
  expect(
    analyticsRefetch({ state: { data: { pendingDates: ['2026-10-23'] } } }),
  ).toBe(60000);
});

it('366일은 허용하고 367일 범위는 400이다', async () => {
  expect((await invoke('from=2025-10-24&to=2026-10-24')).status).toBe(200);
  expect((await invoke('from=2025-10-23&to=2026-10-24')).status).toBe(400);
});

it('측정 구간이 없으면 분석 설정이 없어도 200이고 측정 구간이 있으면 503이다', async () => {
  vi.stubEnv('ADMIN_ANALYTICS_FIXTURE_SCENARIO', 'unavailable');

  const response = await invoke('from=2026-10-01&to=2026-10-02');

  expect(response.status).toBe(200);
  expect((await response.json()).asOf).toBeNull();
  expect((await invoke()).status).toBe(503);
});
