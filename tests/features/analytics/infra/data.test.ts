import { afterEach, expect, it, vi } from 'vitest';

import { MetricsResponse, TablesResponse } from '@/api/generated/zod/admin';
import { GET as tables } from '@/app/api/infra/db-tables/route';
import { GET as metrics } from '@/app/api/infra/metrics/route';
import {
  infraNumber,
  infraRange,
  kstTime,
  listedSeries,
  orderedServices,
  serviceName,
  serviceSeries,
  tableName,
  timeRows,
} from '@/features/analytics/infra/data';
import { infraMetricsFixture, infraTablesFixture } from '@/fixtures/infra';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
it('정본의 고정 데이터를 생성 스키마로 검증한다', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));
  expect(MetricsResponse.safeParse(infraMetricsFixture()).success).toBe(true);
  expect(
    MetricsResponse.parse(infraMetricsFixture()).ecs?.services?.[0].cpuMax
      ?.length,
  ).toBeGreaterThan(0);
  expect(
    MetricsResponse.safeParse(infraMetricsFixture(undefined, undefined, true))
      .success,
  ).toBe(true);
  expect(TablesResponse.safeParse(infraTablesFixture()).success).toBe(true);
  expect(infraMetricsFixture().redis).toBeNull();
  expect(infraMetricsFixture('2026-10-23', '2026-10-23').periodSeconds).toBe(
    300,
  );
  expect(infraMetricsFixture('2026-10-17', '2026-10-23').periodSeconds).toBe(
    900,
  );
  expect(infraMetricsFixture('2026-10-01', '2026-10-23').periodSeconds).toBe(
    3600,
  );
  expect(infraMetricsFixture('2026-01-01', '2026-01-01').periodSeconds).toBe(
    3600,
  );
});
it('오늘 기본값과 31일 상한, 명시한 기간을 보존한다', () => {
  expect(infraRange(new URLSearchParams(), '2026-10-23')).toMatchObject({
    from: '2026-10-23',
    to: '2026-10-23',
    label: '오늘',
    exceeded: false,
  });
  expect(
    infraRange(new URLSearchParams('range=last90d'), '2026-10-23'),
  ).toMatchObject({ from: '2026-07-26', to: '2026-10-23', exceeded: true });
  expect(
    infraRange(
      new URLSearchParams('from=2026-09-01&to=2026-10-23'),
      '2026-10-23',
    ).exceeded,
  ).toBe(true);
});
it('용량·백분율·지연·KST 시각과 테이블 이름을 정본대로 표시한다', () => {
  expect(infraNumber(18253611008, 'GB')).toBe('18.3GB');
  expect(infraNumber(402653184, 'MB')).toBe('402.7MB');
  expect(infraNumber(182, 'ms')).toBe('182.0ms');
  expect(infraNumber(8, '%')).toBe('8.0%');
  expect(kstTime('2026-10-22T15:05:00Z', true)).toBe('00:05');
  expect(kstTime('2026-10-22T15:05:00Z').slice(5)).toBe('10-23 00:05');
  expect(tableName({ schema: 'public', name: 'chat_messages' })).toBe(
    'chat_messages',
  );
  expect(tableName({ schema: 'audit', name: 'events' })).toBe('audit.events');
});
it('서비스 순서·색·모양과 알 수 없는 이름, Redis 순서를 유지한다', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));

  const data = infraMetricsFixture();
  const services = data.ecs!.services;

  expect(
    orderedServices({
      services: [
        { ...services[0], name: 'worker' },
        services[2],
        services[1],
        services[0],
      ],
    }).map((x) => serviceName(x.name)),
  ).toEqual(['서버', 'AI', '알림', 'worker']);
  expect(serviceSeries('server', []).color).toBe('var(--chart-1)');
  expect(serviceSeries('ai', [])).toMatchObject({
    color: 'var(--chart-2)',
    dash: '6 3',
  });
  expect(serviceSeries('notification', [])).toMatchObject({
    color: 'var(--chart-3)',
    dash: '2 3',
  });
  expect(listedSeries('n', '노드 002', [], 1)).toMatchObject({
    label: '노드 002',
    dash: '6 3',
  });
});
it('빈 구간은 null로 채워 선을 끊고 서버가 준 실제 0은 그대로 둔다', () => {
  const rows = timeRows(
    {
      from: '2026-10-23',
      to: '2026-10-23',
      asOf: '2026-10-22T16:00:00Z',
      periodSeconds: 300,
    },
    [
      {
        key: 'cpu',
        label: 'CPU',
        color: 'var(--chart-1)',
        points: [
          { at: '2026-10-22T15:00:00Z', value: 0 },
          { at: '2026-10-22T15:10:00Z', value: 8 },
        ],
      },
    ],
    '%',
  );

  expect(rows).toHaveLength(12);
  expect(rows[0].cpu).toBe(0);
  expect(rows[1].cpu).toBeNull();
  expect(rows[2].cpu).toBe(8);
});
it('fixture BFF는 생성 쿼리 검증과 기간 쌍·상한을 적용한다', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  vi.stubEnv('VERCEL_ENV', 'preview');
  expect(
    (await metrics(new Request('http://localhost/api/infra/metrics'))).status,
  ).toBe(200);

  for (const query of [
    'from=2026-10-23',
    'from=bad&to=2026-10-23',
    'from=2026-09-01&to=2026-10-23',
    'from=2026-10-23&to=2026-10-24',
  ])
    expect(
      (
        await metrics(
          new Request(`http://localhost/api/infra/metrics?${query}`),
        )
      ).status,
    ).toBe(400);

  expect(
    (await tables(new Request('http://localhost/api/infra/db-tables?limit=0')))
      .status,
  ).toBe(400);
  expect(
    (await tables(new Request('http://localhost/api/infra/db-tables?limit=20')))
      .status,
  ).toBe(200);
  vi.stubEnv('ADMIN_INFRA_FIXTURE_SCENARIO', 'unavailable');
  expect(
    (await metrics(new Request('http://localhost/api/infra/metrics'))).status,
  ).toBe(503);
  expect(
    (await tables(new Request('http://localhost/api/infra/db-tables?limit=20')))
      .status,
  ).toBe(200);
});
