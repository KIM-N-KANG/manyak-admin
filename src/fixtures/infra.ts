import type {
  InfraMetrics,
  InfraPoint,
  InfraTables,
} from '@/features/analytics/infra/types';
import { kstToday } from '@/features/dashboard/date-range';

/**
 * 인프라 지표 고정 데이터 시나리오(WEB 3-2).
 * `not-configured`는 묶음 하나가 설정 없음으로 `null`, `partial`은 Prometheus 출처 실패로 세 묶음이 `null`이고 `unavailable`에 있다.
 */
export type InfraFixtureScenario =
  | 'complete'
  | 'not-configured'
  | 'partial'
  | 'empty';

export function infraMetricsFixture(
  from = kstToday(),
  to = from,
  scenario: InfraFixtureScenario = 'complete',
): InfraMetrics {
  const now = new Date();
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  const periodSeconds =
    Date.parse(from) < now.getTime() - 63 * 86400000
      ? 3600
      : days <= 2
        ? 300
        : days <= 7
          ? 900
          : 3600;
  const start = Date.parse(`${from}T00:00:00+09:00`);
  const end = Math.min(
    Date.parse(`${to}T00:00:00+09:00`) + 86400000,
    now.getTime(),
  );
  const times = Array.from(
    { length: Math.max(0, Math.ceil((end - start) / (periodSeconds * 1000))) },
    (_, i) => new Date(start + i * periodSeconds * 1000).toISOString(),
  );
  const points = (value: number, gaps = false): InfraPoint[] =>
    times.flatMap((at, i) =>
      gaps && (i === 3 || i === 7) ? [] : [{ at, value }],
    );
  const counts = (values: number[]) =>
    times.slice(0, values.length).map((at, i) => ({ at, value: values[i] }));
  const data: InfraMetrics = {
    asOf: now.toISOString(),
    from,
    to,
    periodSeconds,
    unavailable: [],
    host: {
      cpu: points(4.1, true),
      cpuMax: points(12.3, true),
      cpuCreditBalance: points(331.4),
      statusCheckFailed: points(0),
    },
    hostSystem: {
      memoryTotalBytes: 4015000000,
      memoryAvailableBytes: points(1876000000),
      disks: [
        {
          mount: '/',
          totalBytes: 21462000000,
          availableBytes: points(15400000000),
        },
        {
          mount: '/data',
          totalBytes: 10000000000,
          availableBytes: points(9900000000),
        },
      ],
    },
    requests: {
      requests: counts([312, 0, 40]),
      server5xx: counts([1, 0, 2]),
      responseTimeP95Ms: points(182),
    },
    rds: {
      cpu: points(4.9, true),
      freeStorageBytes: points(18253611008),
      connections: points(21),
      readLatencyMs: points(0.8, true),
      writeLatencyMs: points(1.6, true),
    },
    redis: {
      usedMemoryBytes: 2474639,
      maxMemoryBytes: 268435456,
      connectedClients: 6,
      keys: 7450,
      aofLastWriteOk: true,
    },
    opensearch: {
      status: 'green',
      diskTotalBytes: 137170518016,
      diskAvailableBytes: points(114949550080),
      jvmMemoryPressure: points(9),
    },
  };

  if (scenario === 'not-configured') data.host = null;

  if (scenario === 'partial') {
    data.unavailable = ['hostSystem', 'requests', 'opensearch'];
    data.hostSystem = null;
    data.requests = null;
    data.opensearch = null;
  }

  if (scenario === 'empty') {
    data.opensearch!.diskAvailableBytes = [];
    data.opensearch!.jvmMemoryPressure = [];
    data.rds!.connections = data.rds!.connections.map((point) => ({
      ...point,
      value: 0,
    }));
    data.requests!.requests = [];
    data.requests!.server5xx = [];
    data.host!.cpuCreditBalance = [];
    data.host!.statusCheckFailed = [];
    data.hostSystem!.memoryAvailableBytes = [];
  }

  return data;
}
export function infraTablesFixture(limit = 20): InfraTables {
  const tables = [
    {
      schema: 'public',
      name: 'chat_messages',
      totalBytes: 402653184,
      tableBytes: 301989888,
      indexBytes: 83886080,
      estimatedRows: 412380,
    },
    {
      schema: 'public',
      name: 'ai_call_logs',
      totalBytes: 268435456,
      tableBytes: 209715200,
      indexBytes: 50331648,
      estimatedRows: 520117,
    },
    {
      schema: 'audit',
      name: 'events',
      totalBytes: 134217728,
      tableBytes: 100663296,
      indexBytes: 33554432,
      estimatedRows: 250000,
    },
    ...Array.from({ length: 22 }, (_, i) => ({
      schema: 'public',
      name: `fixture_table_${String(i + 1).padStart(2, '0')}`,
      totalBytes: (22 - i) * 1048576,
      tableBytes: (22 - i) * 786432,
      indexBytes: (22 - i) * 262144,
      estimatedRows: i === 0 ? 0 : (22 - i) * 1000,
    })),
  ];

  return {
    asOf: new Date().toISOString(),
    databaseBytes: 1288490188,
    tableCount: 74,
    tables: tables.slice(0, limit),
  };
}
