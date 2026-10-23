import type {
  InfraMetrics,
  InfraPoint,
  InfraTables,
} from '@/features/analytics/infra/types';
import { kstToday } from '@/features/dashboard/date-range';

export function infraMetricsFixture(
  from = kstToday(),
  to = from,
  withRedis = false,
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
      gaps && (i === 3 || i === 7)
        ? []
        : [
            {
              at,
              value: Math.max(
                0,
                value + (value > 1 ? Math.sin(i / 5) * value * 0.04 : 0),
              ),
            },
          ],
    );
  const counts = (values: number[]) =>
    times.map((at, i) => ({ at, value: values[i] ?? 0 }));

  return {
    asOf: now.toISOString(),
    from,
    to,
    periodSeconds,
    ecs: {
      services: ['server', 'ai', 'notification'].map((name, i) => ({
        name,
        runningTasks: i === 0 ? 1 : 2,
        desiredTasks: 2,
        pendingTasks: i === 0 ? 1 : 0,
        cpu: points(7 + i * 3, true),
        memory: points(40 + i * 5, true),
      })),
    },
    alb: {
      requests: counts([312, 0, 40]),
      elb5xx: counts([0, 0, 0]),
      target5xx: counts([1, 0, 0]),
      responseTimeP95Ms: times.map((at) => ({ at, value: 182 })),
    },
    rds: {
      cpu: points(4.9, true),
      freeStorageBytes: times.map((at) => ({ at, value: 18253611008 })),
      connections: times.map((at) => ({ at, value: 21 })),
      readLatencyMs: points(0.8, true),
      writeLatencyMs: points(1.6, true),
    },
    redis: withRedis
      ? {
          nodes: ['fixture-redis-001', 'fixture-redis-002'].map((id, i) => ({
            id,
            cpu: points(1.2 + i, true),
            memory: points(3.4 + i, true),
            connections: times.map((at) => ({ at, value: 18 + i })),
          })),
        }
      : null,
    opensearch: {
      freeStorageBytes: times.map((at) => ({ at, value: 6442450944 })),
      jvmMemoryPressure: times.map((at) => ({ at, value: 58 })),
    },
  };
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

export function infraEmptyMetricsFixture(
  from: string,
  to: string,
): InfraMetrics {
  const data = infraMetricsFixture(from, to);

  data.opensearch!.freeStorageBytes = [];
  data.rds!.connections = data.rds!.connections.map((point) => ({
    ...point,
    value: 0,
  }));

  return data;
}
