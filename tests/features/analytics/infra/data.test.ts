import { afterEach, expect, it, vi } from 'vitest';

import { Metrics2Response, TablesResponse } from '@/api/generated/zod/admin';
import { GET as tables } from '@/app/api/infra/db-tables/route';
import { GET as metrics } from '@/app/api/infra/metrics/route';
import {
  bundleNotice,
  infraNumber,
  infraRange,
  kstTime,
  listedSeries,
  redisMemory,
  statusCheck,
  tableName,
  timeRows,
} from '@/features/analytics/infra/data';
import { infraMetricsFixture, infraTablesFixture } from '@/fixtures/infra';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
it('고정 데이터의 네 시나리오를 생성 스키마로 검증한다', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-20T03:00:00Z'));

  for (const scenario of [
    'complete',
    'not-configured',
    'partial',
    'empty',
  ] as const)
    expect(
      Metrics2Response.safeParse(
        infraMetricsFixture(undefined, undefined, scenario),
      ).success,
    ).toBe(true);

  expect(TablesResponse.safeParse(infraTablesFixture()).success).toBe(true);
  expect(
    infraMetricsFixture(undefined, undefined, 'not-configured').host,
  ).toBeNull();
  expect(
    infraMetricsFixture(undefined, undefined, 'partial').unavailable,
  ).toEqual(['hostSystem', 'requests', 'opensearch']);
  expect(infraMetricsFixture('2026-11-20', '2026-11-20').periodSeconds).toBe(
    300,
  );
  expect(infraMetricsFixture('2026-11-14', '2026-11-20').periodSeconds).toBe(
    900,
  );
  expect(infraMetricsFixture('2026-11-01', '2026-11-20').periodSeconds).toBe(
    3600,
  );
  expect(infraMetricsFixture('2026-01-01', '2026-01-01').periodSeconds).toBe(
    3600,
  );
});
it('오늘 기본값과 31일 상한, 명시한 기간을 보존한다', () => {
  expect(infraRange(new URLSearchParams(), '2026-11-20')).toMatchObject({
    from: '2026-11-20',
    to: '2026-11-20',
    label: '오늘',
    exceeded: false,
  });
  expect(
    infraRange(new URLSearchParams('range=last90d'), '2026-11-20'),
  ).toMatchObject({ from: '2026-08-23', to: '2026-11-20', exceeded: true });
  expect(
    infraRange(
      new URLSearchParams('from=2026-10-01&to=2026-11-20'),
      '2026-11-20',
    ).exceeded,
  ).toBe(true);
});
it('용량·백분율·지연·크레딧·KST 시각과 테이블 이름을 정본대로 표시한다', () => {
  expect(infraNumber(18253611008, 'GB')).toBe('18.3GB');
  expect(infraNumber(1876000000, 'GB')).toBe('1.9GB');
  expect(infraNumber(402653184, 'MB')).toBe('402.7MB');
  expect(infraNumber(182, 'ms')).toBe('182.0ms');
  expect(infraNumber(8, '%')).toBe('8.0%');
  expect(infraNumber(331.4, '크레딧')).toBe('331.4크레딧');
  expect(kstTime('2026-11-19T15:05:00Z', true)).toBe('00:05');
  expect(kstTime('2026-11-19T15:05:00Z').slice(5)).toBe('11-20 00:05');
  expect(tableName({ schema: 'public', name: 'chat_messages' })).toBe(
    'chat_messages',
  );
  expect(tableName({ schema: 'audit', name: 'events' })).toBe('audit.events');
});
it('Redis 메모리는 다른 용량과 같은 10진 MB로 한도와 사용률을 보이고 한도 0은 한도 없음이다', () => {
  expect(redisMemory(2474639, 268435456)).toEqual({
    value: '2.5MB',
    detail: '한도 268.4MB, 0.9%',
  });
  expect(redisMemory(2474639, 0)).toEqual({
    value: '2.5MB',
    detail: '한도 없음',
  });
});
it('상태 검사는 1인 구간을 세고 점이 없으면 수집된 값 없음이다', () => {
  const at = '2026-11-19T15:00:00Z';

  expect(statusCheck([{ at, value: 0 }])).toBe('정상');
  expect(
    statusCheck([
      { at, value: 1 },
      { at, value: 0 },
      { at, value: 1 },
    ]),
  ).toBe('실패 2구간');
  expect(statusCheck([])).toBe('수집된 값 없음');
});
it('null 묶음은 unavailable에 있으면 일시 조회 실패, 없으면 설정 없음 문구다', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-20T03:00:00Z'));

  const partial = infraMetricsFixture(undefined, undefined, 'partial');
  const missing = infraMetricsFixture(undefined, undefined, 'not-configured');

  expect(bundleNotice(partial, 'requests')).toBe(
    '지금 요청 지표를 가져올 수 없습니다. 잠시 후 다시 시도해 주세요.',
  );
  expect(bundleNotice(partial, 'hostSystem')).toBe(
    '지금 앱 호스트 메모리와 디스크 지표를 가져올 수 없습니다. 잠시 후 다시 시도해 주세요.',
  );
  expect(bundleNotice(partial, 'host')).toBeNull();
  expect(bundleNotice(missing, 'host')).toBe(
    '이 환경에는 앱 호스트 CPU 지표 설정이 없습니다.',
  );
  expect(listedSeries('disk_1', '/data', [], 1)).toMatchObject({
    label: '/data',
    dash: '6 3',
  });
});
it('빈 구간은 null로 채워 선을 끊고 서버가 준 실제 0은 그대로 둔다', () => {
  const rows = timeRows(
    {
      from: '2026-11-20',
      to: '2026-11-20',
      asOf: '2026-11-19T16:00:00Z',
      periodSeconds: 300,
    },
    [
      {
        key: 'cpu',
        label: 'CPU',
        color: 'var(--chart-1)',
        points: [
          { at: '2026-11-19T15:00:00Z', value: 0 },
          { at: '2026-11-19T15:10:00Z', value: 8 },
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
it('fixture BFF는 생성 쿼리 검증과 기간 쌍·상한, 시나리오를 적용한다', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-20T03:00:00Z'));
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  vi.stubEnv('VERCEL_ENV', 'preview');
  expect(
    (await metrics(new Request('http://localhost/api/infra/metrics'))).status,
  ).toBe(200);

  for (const query of [
    'from=2026-11-20',
    'from=bad&to=2026-11-20',
    'from=2026-10-01&to=2026-11-20',
    'from=2026-11-20&to=2026-11-21',
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
  vi.stubEnv('ADMIN_INFRA_FIXTURE_SCENARIO', 'partial');
  expect(
    (
      await (
        await metrics(new Request('http://localhost/api/infra/metrics'))
      ).json()
    ).unavailable,
  ).toEqual(['hostSystem', 'requests', 'opensearch']);
  vi.stubEnv('ADMIN_INFRA_FIXTURE_SCENARIO', 'unavailable');
  expect(
    (await metrics(new Request('http://localhost/api/infra/metrics'))).status,
  ).toBe(503);
  expect(
    (await tables(new Request('http://localhost/api/infra/db-tables?limit=20')))
      .status,
  ).toBe(200);
});
