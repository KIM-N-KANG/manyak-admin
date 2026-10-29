'use client';

import type { ReactNode } from 'react';

import { HelpTooltip } from '@/components/admin/help-tooltip';
import { Card } from '@/components/ui/card';

import {
  infraNumber,
  listedSeries,
  orderedServices,
  pairSeries,
  serviceName,
  serviceSeries,
  tableName,
} from './data';
import { InfraChart, InfraRanking } from './infra-chart';
import type { InfraMetrics, InfraPoint, InfraTables, InfraUnit } from './types';

export function InfraSummaries({
  items,
}: {
  items: { label: string; value: ReactNode; detail?: string }[];
}) {
  return (
    <div className="mb-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="min-w-0">
          <h3 className="text-sm text-muted-foreground">{item.label}</h3>
          <p className="mt-3 text-2xl font-semibold break-words">
            {item.value}
          </p>
          {item.detail ? (
            <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

const last = (points: InfraPoint[], unit: InfraUnit) =>
  points.length ? infraNumber(points.at(-1)!.value, unit) : '수집된 값 없음';
const sum = (points: InfraPoint[]) =>
  points.reduce((total, point) => total + point.value, 0);
const missing = (name: string) => (
  <p
    role="status"
    className="mb-5 rounded-md border p-4 text-sm text-muted-foreground">
    이 환경에는 {name} 지표 설정이 없습니다.
  </p>
);

export function InfraServices({ data }: { data: InfraMetrics }) {
  const services = data.ecs ? orderedServices(data.ecs) : [];

  return (
    <>
      {!data.ecs ? missing('ECS') : null}
      {!data.alb ? missing('ALB') : null}
      <InfraSummaries
        items={[
          ...services.map((service) => ({
            label: `${serviceName(service.name)} 태스크`,
            value: `${service.runningTasks.toLocaleString('ko-KR')}개`,
            detail: `목표 ${service.desiredTasks.toLocaleString('ko-KR')}개, 시작 중 ${service.pendingTasks.toLocaleString('ko-KR')}개`,
          })),
          ...(data.alb
            ? [
                {
                  label: '요청 수',
                  value: data.alb.requests.length
                    ? infraNumber(sum(data.alb.requests), '회')
                    : '수집된 값 없음',
                },
                {
                  label: '5xx 응답',
                  value:
                    data.alb.target5xx.length || data.alb.elb5xx.length
                      ? infraNumber(
                          sum(data.alb.target5xx) + sum(data.alb.elb5xx),
                          '회',
                        )
                      : '수집된 값 없음',
                },
              ]
            : []),
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-2 [&>*:last-child:nth-child(odd)]:xl:col-span-2">
        {data.ecs
          ? (['cpu', 'memory'] as const).map((metric) => (
              <InfraChart
                key={metric}
                title={metric === 'cpu' ? 'CPU 사용률' : '메모리 사용률'}
                data={data}
                series={services.map((service, index) => ({
                  ...serviceSeries(service.name, service[metric]),
                  maxPoints: service[metric === 'cpu' ? 'cpuMax' : 'memoryMax'],
                  key: `service_${index}`,
                }))}
                unit="%"
              />
            ))
          : null}
        {data.alb ? (
          <>
            <InfraChart
              title="요청 수"
              data={data}
              series={[pairSeries('requests', '요청 수', data.alb.requests)]}
              unit="회"
            />
            <InfraChart
              title="5xx 응답"
              data={data}
              series={[
                pairSeries('target5xx', '대상 5xx', data.alb.target5xx),
                pairSeries('elb5xx', 'ALB 5xx', data.alb.elb5xx, true),
              ]}
              unit="회"
            />
            <InfraChart
              title="대상 응답 시간 p95"
              data={data}
              series={[pairSeries('p95', 'p95', data.alb.responseTimeP95Ms)]}
              unit="ms"
            />
          </>
        ) : null}
      </div>
    </>
  );
}
export function InfraStorage({ data }: { data: InfraMetrics }) {
  return (
    <>
      <InfraSummaries
        items={[
          ...(data.rds
            ? [
                {
                  label: 'RDS 여유 스토리지',
                  value: last(data.rds.freeStorageBytes, 'GB'),
                },
              ]
            : []),
          ...(data.opensearch
            ? [
                {
                  label: 'OpenSearch 여유 스토리지',
                  value: last(data.opensearch.freeStorageBytes, 'GB'),
                },
                {
                  label: 'OpenSearch JVM 메모리 압박',
                  value: data.opensearch.jvmMemoryPressure.length
                    ? infraNumber(
                        Math.max(
                          ...data.opensearch.jvmMemoryPressure.map(
                            (point) => point.value,
                          ),
                        ),
                        '%',
                      )
                    : '수집된 값 없음',
                },
              ]
            : []),
        ]}
      />
      <section aria-label="RDS" className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">RDS</h2>
        {data.rds ? (
          <div className="grid gap-5 xl:grid-cols-2 [&>*:last-child:nth-child(odd)]:xl:col-span-2">
            <InfraChart
              title="CPU 사용률"
              data={data}
              series={[pairSeries('cpu', 'CPU', data.rds.cpu)]}
              unit="%"
            />
            <InfraChart
              title="여유 스토리지"
              data={data}
              series={[
                pairSeries(
                  'storage',
                  '여유 스토리지',
                  data.rds.freeStorageBytes,
                ),
              ]}
              unit="GB"
            />
            <InfraChart
              title="연결 수"
              data={data}
              series={[
                pairSeries('connections', '연결 수', data.rds.connections),
              ]}
              unit="개"
            />
            <InfraChart
              title="읽기와 쓰기 지연"
              data={data}
              series={[
                pairSeries('read', '읽기', data.rds.readLatencyMs),
                pairSeries('write', '쓰기', data.rds.writeLatencyMs, true),
              ]}
              unit="ms"
            />
          </div>
        ) : (
          missing('RDS')
        )}
      </section>
      <section aria-label="Redis" className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Redis</h2>
        {data.redis ? (
          <div className="grid gap-5 xl:grid-cols-2 [&>*:last-child:nth-child(odd)]:xl:col-span-2">
            {(['cpu', 'memory', 'connections'] as const).map((metric) => (
              <InfraChart
                key={metric}
                title={
                  {
                    cpu: 'CPU 사용률',
                    memory: '메모리 사용률',
                    connections: '연결 수',
                  }[metric]
                }
                data={data}
                series={data
                  .redis!.nodes.toSorted((a, b) =>
                    a.id
                      .split('-')
                      .at(-1)!
                      .localeCompare(b.id.split('-').at(-1)!, undefined, {
                        numeric: true,
                      }),
                  )
                  .map((node, index) =>
                    listedSeries(
                      `node_${index}`,
                      `노드 ${node.id.split('-').at(-1)}`,
                      node[metric],
                      index,
                    ),
                  )}
                unit={metric === 'connections' ? '개' : '%'}
              />
            ))}
          </div>
        ) : (
          missing('Redis')
        )}
      </section>
      <section aria-label="OpenSearch" className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">OpenSearch</h2>
        {data.opensearch ? (
          <div className="grid gap-5 xl:grid-cols-2 [&>*:last-child:nth-child(odd)]:xl:col-span-2">
            <InfraChart
              title="여유 스토리지"
              data={data}
              series={[
                pairSeries(
                  'storage',
                  '여유 스토리지',
                  data.opensearch.freeStorageBytes,
                ),
              ]}
              unit="GB"
            />
            <InfraChart
              title="JVM 메모리 압박"
              data={data}
              series={[
                pairSeries(
                  'jvm',
                  'JVM 메모리 압박',
                  data.opensearch.jvmMemoryPressure,
                ),
              ]}
              unit="%"
            />
          </div>
        ) : (
          missing('OpenSearch')
        )}
      </section>
    </>
  );
}
export function InfraTableContent({ data }: { data: InfraTables }) {
  return (
    <>
      <InfraSummaries
        items={[
          {
            label: '데이터베이스 크기',
            value: infraNumber(data.databaseBytes, 'GB'),
          },
          { label: '테이블 수', value: infraNumber(data.tableCount, '개') },
        ]}
      />
      <InfraRanking data={data} />
      <div className="mt-5 overflow-auto rounded-md border bg-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">DB 테이블 크기</caption>
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              {['테이블', '전체 크기', '테이블 크기', '인덱스 크기'].map(
                (label) => (
                  <th key={label} scope="col" className="px-4 py-3 font-normal">
                    {label}
                  </th>
                ),
              )}
              <th scope="col" className="px-4 py-3 font-normal">
                <span className="inline-flex items-center gap-2">
                  추정 행 수
                  <HelpTooltip label="추정 행 수 도움말">
                    통계가 추정한 행 수라 실제 행 수와 다를 수 있습니다.
                  </HelpTooltip>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.tables.map((table) => (
              <tr
                key={`${table.schema}.${table.name}`}
                className="border-b last:border-b-0">
                <td className="px-4 py-3 font-mono">{tableName(table)}</td>
                {[table.totalBytes, table.tableBytes, table.indexBytes].map(
                  (value, index) => (
                    <td key={index} className="px-4 py-3 whitespace-nowrap">
                      {infraNumber(value, 'MB')}
                    </td>
                  ),
                )}
                <td className="px-4 py-3 whitespace-nowrap">
                  {table.estimatedRows.toLocaleString('ko-KR')}행
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
