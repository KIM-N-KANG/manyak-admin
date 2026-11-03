import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { findAdminEndpoint } from '@/api/admin-endpoints';
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

const invoke = (query = '') =>
  metricsRoute(
    new Request(`http://localhost/api/users/activity-hours?${query}`),
  );

it('시간대 API는 생성 연산으로 서버 경로와 연결한다', () => {
  expect(findAdminEndpoint('/users/activity-hours', 'GET')).toMatchObject({
    serverPath: '/api/v1/admin/users/activity-hours',
    implemented: true,
    operation: expect.objectContaining({ method: 'GET' }),
  });
});
it('짧은 기간 fixture는 날짜 없는 요일과 168칸·요일/시 평균을 계약대로 준다', async () => {
  const response = await invoke('from=2026-10-26&to=2026-10-28');

  expect(response.status).toBe(200);

  const data = await response.json();

  expect(data.totalDays).toBe(3);
  expect(data.weekdayDays.map((row: { days: number }) => row.days)).toEqual([
    1, 1, 1, 0, 0, 0, 0,
  ]);

  for (const metric of Object.values(data.metrics) as {
    cells: {
      weekday: number;
      hour: number;
      count: number;
      average: number | null;
    }[];
    weekdays: { average: number | null }[];
    hours: unknown[];
  }[]) {
    expect(metric.cells).toHaveLength(168);
    expect(metric.weekdays).toHaveLength(7);
    expect(metric.hours).toHaveLength(24);
    expect(metric.cells[0]).toMatchObject({ weekday: 1, hour: 0 });
    expect(metric.cells[167]).toEqual({
      weekday: 7,
      hour: 23,
      count: 0,
      average: null,
    });
    expect(metric.weekdays.slice(3).every((row) => row.average === null)).toBe(
      true,
    );
  }
});
it('API의 기본값은 화면 기본값과 별개로 오늘 포함 30일이고 days도 지원한다', async () => {
  for (const query of ['', 'days=30']) {
    const response = await invoke(query);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      from: '2026-10-05',
      to: '2026-11-03',
      totalDays: 30,
    });
  }
});
it('시간대 요청은 기간만 받고 잘못된 쿼리·중복·366일 초과를 거부한다', async () => {
  for (const query of [
    'from=bad&to=2026-11-03',
    'from=2026-11-03',
    'from=2026-11-03&to=2026-11-02',
    'from=2025-11-02&to=2026-11-03',
    'days=0',
    'days=367',
    'days=1.5',
    'days=30&from=2026-11-01&to=2026-11-03',
    'platform=web',
    'segment=guest',
    'hoursMetric=payments',
    'from=2026-11-01&from=2026-11-02&to=2026-11-03',
  ])
    expect((await invoke(query)).status).toBe(400);
});
