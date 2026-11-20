'use client';

import type { ReactNode } from 'react';

import { HelpTooltip } from '@/components/admin/help-tooltip';
import { Card } from '@/components/ui/card';

import {
  bundleNotice,
  infraNumber,
  kstTime,
  listedSeries,
  pairSeries,
  redisMemory,
  statusCheck,
  tableName,
} from './data';
import { InfraChart, InfraRanking } from './infra-chart';
import type {
  InfraBundle,
  InfraMetrics,
  InfraPoint,
  InfraTables,
  InfraUnit,
} from './types';

type SummaryItem = { label: string; value: ReactNode; detail?: string };

export function InfraSummaries({
  items,
  label = '요약 지표',
}: {
  items: SummaryItem[];
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="mb-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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

const empty = '수집된 값 없음';
const last = (points: InfraPoint[], unit: InfraUnit) =>
  points.length ? infraNumber(points.at(-1)!.value, unit) : empty;
const sum = (points: InfraPoint[], unit: InfraUnit) =>
  points.length
    ? infraNumber(
        points.reduce((total, point) => total + point.value, 0),
        unit,
      )
    : empty;
const grid =
  'grid gap-5 xl:grid-cols-2 [&>*:last-child:nth-child(odd)]:xl:col-span-2';

/** null 묶음 자리에 둘 문구다. 설정 없음과 일시 조회 실패를 가른다. */
function Notice({ data, bundle }: { data: InfraMetrics; bundle: InfraBundle }) {
  const text = bundleNotice(data, bundle);

  return text ? (
    <p
      role="status"
      className="mb-5 rounded-md border p-4 text-sm text-muted-foreground">
      {text}
    </p>
  ) : null;
}

function Region({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="mb-8">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function InfraServices({ data }: { data: InfraMetrics }) {
  const { host, hostSystem, requests } = data;
  const memoryTotal = hostSystem?.memoryTotalBytes ?? null;

  return (
    <>
      <InfraSummaries
        items={[
          ...(hostSystem
            ? [
                {
                  label: '사용 가능 메모리',
                  value: last(hostSystem.memoryAvailableBytes, 'GB'),
                  detail:
                    memoryTotal === null
                      ? undefined
                      : `전체 ${infraNumber(memoryTotal, 'GB')}`,
                },
              ]
            : []),
          ...(host
            ? [
                {
                  label: 'CPU 크레딧 잔액',
                  value: last(host.cpuCreditBalance, '크레딧'),
                },
                {
                  label: '상태 검사',
                  value: statusCheck(host.statusCheckFailed),
                },
              ]
            : []),
          ...(requests
            ? [
                { label: '요청 수', value: sum(requests.requests, '회') },
                { label: '5xx 응답', value: sum(requests.server5xx, '회') },
              ]
            : []),
        ]}
      />
      <Region title="앱 호스트">
        <Notice data={data} bundle="host" />
        <Notice data={data} bundle="hostSystem" />
        {host || hostSystem ? (
          <div className={grid}>
            {host ? (
              <>
                <InfraChart
                  title="CPU 사용률"
                  data={data}
                  series={[
                    {
                      ...pairSeries('cpu', 'CPU', host.cpu),
                      maxPoints: host.cpuMax,
                    },
                  ]}
                  unit="%"
                />
                <InfraChart
                  title="CPU 크레딧 잔액"
                  data={data}
                  series={[pairSeries('credit', '잔액', host.cpuCreditBalance)]}
                  unit="크레딧"
                />
              </>
            ) : null}
            {hostSystem ? (
              <>
                <InfraChart
                  title="사용 가능 메모리"
                  data={data}
                  series={[
                    pairSeries(
                      'memory',
                      '사용 가능 메모리',
                      hostSystem.memoryAvailableBytes,
                    ),
                  ]}
                  unit="GB"
                  domain={
                    memoryTotal === null
                      ? undefined
                      : [0, memoryTotal / 1000000000]
                  }
                />
                <InfraChart
                  title="디스크 여유"
                  data={data}
                  series={hostSystem.disks.map((disk, index) => ({
                    ...listedSeries(
                      `disk_${index}`,
                      disk.mount,
                      disk.availableBytes,
                      index,
                    ),
                    ...(disk.totalBytes === null
                      ? {}
                      : {
                          maxPoints: disk.availableBytes.map((point) => ({
                            at: point.at,
                            value: disk.totalBytes!,
                          })),
                          pairLabel: '여유 / 크기',
                        }),
                  }))}
                  unit="GB"
                />
              </>
            ) : null}
          </div>
        ) : null}
      </Region>
      <Region title="요청">
        <Notice data={data} bundle="requests" />
        {requests ? (
          <div className={grid}>
            <InfraChart
              title="요청 수"
              data={data}
              series={[pairSeries('requests', '요청 수', requests.requests)]}
              unit="회"
            />
            <InfraChart
              title="5xx 응답"
              data={data}
              series={[pairSeries('server5xx', '5xx 응답', requests.server5xx)]}
              unit="회"
              help="서버가 돌려준 5xx만 셉니다. 서버가 응답하지 못해 프록시가 돌려준 502와 504는 들어가지 않습니다."
            />
            <InfraChart
              title="응답 시간 p95"
              data={data}
              series={[pairSeries('p95', 'p95', requests.responseTimeP95Ms)]}
              unit="ms"
              help="채팅 스트림처럼 오래 열려 있는 SSE 요청은 빼고 계산합니다."
            />
          </div>
        ) : null}
      </Region>
    </>
  );
}

export function InfraStorage({ data }: { data: InfraMetrics }) {
  const { rds, redis, opensearch } = data;
  const memory = redis
    ? redisMemory(redis.usedMemoryBytes, redis.maxMemoryBytes)
    : null;
  const diskTotal = opensearch?.diskTotalBytes ?? null;

  return (
    <>
      <InfraSummaries
        items={[
          ...(rds
            ? [
                {
                  label: 'RDS 여유 스토리지',
                  value: last(rds.freeStorageBytes, 'GB'),
                },
              ]
            : []),
          ...(memory ? [{ label: 'Redis 메모리', ...memory }] : []),
          ...(opensearch
            ? [
                {
                  label: 'OpenSearch 디스크 여유',
                  value: last(opensearch.diskAvailableBytes, 'GB'),
                  detail:
                    diskTotal === null
                      ? undefined
                      : `전체 ${infraNumber(diskTotal, 'GB')}`,
                },
                {
                  label: 'OpenSearch JVM 메모리 압박',
                  value: opensearch.jvmMemoryPressure.length
                    ? infraNumber(
                        Math.max(
                          ...opensearch.jvmMemoryPressure.map(
                            (point) => point.value,
                          ),
                        ),
                        '%',
                      )
                    : empty,
                },
              ]
            : []),
        ]}
      />
      <Region title="RDS">
        <Notice data={data} bundle="rds" />
        {rds ? (
          <div className={grid}>
            <InfraChart
              title="CPU 사용률"
              data={data}
              series={[pairSeries('cpu', 'CPU', rds.cpu)]}
              unit="%"
            />
            <InfraChart
              title="여유 스토리지"
              data={data}
              series={[
                pairSeries('storage', '여유 스토리지', rds.freeStorageBytes),
              ]}
              unit="GB"
            />
            <InfraChart
              title="연결 수"
              data={data}
              series={[pairSeries('connections', '연결 수', rds.connections)]}
              unit="개"
            />
            <InfraChart
              title="읽기와 쓰기 지연"
              data={data}
              series={[
                pairSeries('read', '읽기', rds.readLatencyMs),
                pairSeries('write', '쓰기', rds.writeLatencyMs, true),
              ]}
              unit="ms"
            />
          </div>
        ) : null}
      </Region>
      <Region
        title="Redis"
        aside={
          redis ? (
            <HelpTooltip source="Redis" label="Redis 출처 안내">
              서버가 Redis에 직접 물은 값이며 {kstTime(data.asOf)} KST
              기준입니다. 기간과 무관한 현재 값입니다.
            </HelpTooltip>
          ) : null
        }>
        <Notice data={data} bundle="redis" />
        {redis && memory ? (
          <InfraSummaries
            label="Redis 현재 값"
            items={[
              { label: '사용 메모리와 한도', ...memory },
              {
                label: '연결 수',
                value: infraNumber(redis.connectedClients, '개'),
              },
              { label: '키 수', value: infraNumber(redis.keys, '개') },
              {
                label: 'AOF 쓰기 상태',
                value:
                  redis.aofLastWriteOk === null
                    ? '사용 안 함'
                    : redis.aofLastWriteOk
                      ? '정상'
                      : '실패',
              },
            ]}
          />
        ) : null}
      </Region>
      <Region
        title="OpenSearch"
        aside={
          opensearch ? (
            <span className="text-sm font-medium">
              {opensearch.status ?? empty}
            </span>
          ) : null
        }>
        <Notice data={data} bundle="opensearch" />
        {opensearch ? (
          <div className={grid}>
            <InfraChart
              title="디스크 여유"
              data={data}
              series={[
                pairSeries(
                  'disk',
                  '디스크 여유',
                  opensearch.diskAvailableBytes,
                ),
              ]}
              unit="GB"
              help="홈서버의 다른 컨테이너와 같이 쓰는 디스크의 여유입니다."
            />
            <InfraChart
              title="JVM 메모리 압박"
              data={data}
              series={[
                pairSeries(
                  'jvm',
                  'JVM 메모리 압박',
                  opensearch.jvmMemoryPressure,
                ),
              ]}
              unit="%"
            />
          </div>
        ) : null}
      </Region>
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
