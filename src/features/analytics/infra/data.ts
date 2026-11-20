import {
  getRangeError,
  kstToday,
  quickRanges,
  resolveRange,
} from '@/features/dashboard/date-range';

import type {
  InfraBundle,
  InfraMetrics,
  InfraPoint,
  InfraSeries,
  InfraUnit,
} from './types';

export function infraRange(params: URLSearchParams, today = kstToday()) {
  const custom = { from: params.get('from') ?? '', to: params.get('to') ?? '' };
  const customError = getRangeError(custom, today);
  const hasQuick = quickRanges.some(([key]) => key === params.get('range'));
  const range = hasQuick
    ? resolveRange(params, today)
    : !customError || customError.includes('366일')
      ? { ...custom, label: `${custom.from} ~ ${custom.to}`, name: null }
      : resolveRange(new URLSearchParams({ range: 'today' }), today);

  return {
    ...range,
    exceeded:
      (Date.parse(range.to) - Date.parse(range.from)) / 86400000 + 1 > 31,
  };
}

const bundleNames: Record<InfraBundle, string> = {
  host: '앱 호스트 CPU',
  hostSystem: '앱 호스트 메모리와 디스크',
  requests: '요청',
  rds: 'RDS',
  redis: 'Redis',
  opensearch: 'OpenSearch',
};

/** null 묶음의 문구를 반환한다. unavailable에 있으면 일시 조회 실패, 없으면 설정 없음이다(WEB 4-1). */
export function bundleNotice(data: InfraMetrics, bundle: InfraBundle) {
  if (data[bundle] !== null) return null;

  return data.unavailable.includes(bundle)
    ? `지금 ${bundleNames[bundle]} 지표를 가져올 수 없습니다. 잠시 후 다시 시도해 주세요.`
    : `이 환경에는 ${bundleNames[bundle]} 지표 설정이 없습니다.`;
}
/** 상태 검사가 실패(1)한 구간 수를 문구로 반환한다. */
export function statusCheck(points: InfraPoint[]) {
  if (!points.length) return '수집된 값 없음';

  const failed = points.filter((point) => point.value >= 1).length;

  return failed ? `실패 ${failed.toLocaleString('ko-KR')}구간` : '정상';
}

const mebibytes = (bytes: number) =>
  `${(bytes / 1048576).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}MB`;

/** Redis 메모리는 1MB를 1,048,576바이트로 계산한다(WEB 5-1 Redis 카드). 한도 0은 한도 없음이다. */
export function redisMemory(used: number, max: number) {
  return {
    value: mebibytes(used),
    detail: max
      ? `한도 ${mebibytes(max)}, ${((used / max) * 100).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
      : '한도 없음',
  };
}
export function listedSeries(
  key: string,
  label: string,
  points: InfraPoint[],
  index: number,
): InfraSeries {
  return {
    key,
    label,
    points,
    color:
      [
        'var(--chart-1)',
        'var(--chart-2)',
        'var(--chart-3)',
        'var(--chart-4)',
        'var(--chart-5)',
      ][index] ?? 'var(--muted-foreground)',
    dash: [undefined, '6 3', '2 3', '8 3 2 3'][index % 4],
  };
}
export function pairSeries(
  key: string,
  label: string,
  points: InfraPoint[],
  second = false,
): InfraSeries {
  return {
    key,
    label,
    points,
    color: second ? 'var(--chart-2)' : 'var(--chart-1)',
    dash: second ? '6 3' : undefined,
  };
}
export function infraValue(value: number, unit: InfraUnit) {
  return unit === 'GB'
    ? value / 1000000000
    : unit === 'MB'
      ? value / 1000000
      : value;
}
export const fractionUnits: InfraUnit[] = ['%', 'GB', 'MB', 'ms', '크레딧'];
export function infraNumber(value: number, unit: InfraUnit) {
  return `${infraValue(value, unit).toLocaleString('ko-KR', { minimumFractionDigits: fractionUnits.includes(unit) ? 1 : 0, maximumFractionDigits: fractionUnits.includes(unit) ? 1 : 0 })}${unit}`;
}
export function kstTime(at: string, timeOnly = false) {
  const text = new Date(Date.parse(at) + 9 * 3600000).toISOString();

  return timeOnly
    ? text.slice(11, 16)
    : `${text.slice(0, 10)} ${text.slice(11, 16)}`;
}
export function timeRows(
  data: Pick<InfraMetrics, 'from' | 'to' | 'asOf' | 'periodSeconds'>,
  series: InfraSeries[],
  unit: InfraUnit,
) {
  const start = Date.parse(`${data.from}T00:00:00+09:00`);
  const end = Math.min(
    Date.parse(`${data.to}T00:00:00+09:00`) + 86400000,
    Date.parse(data.asOf),
  );
  const lookup = series.map(
    (item) =>
      new Map(item.points.map((point) => [Date.parse(point.at), point.value])),
  );

  return Array.from(
    {
      length: Math.max(
        0,
        Math.ceil((end - start) / (data.periodSeconds * 1000)),
      ),
    },
    (_, index) => {
      const at = start + index * data.periodSeconds * 1000;

      return Object.fromEntries([
        ['at', new Date(at).toISOString()],
        ...series.map((item, i) => {
          const value = lookup[i].get(at);

          return [
            item.key,
            value === undefined ? null : infraValue(value, unit),
          ];
        }),
      ]) as { at: string } & Record<string, number | string | null>;
    },
  );
}
export const tableName = (table: { schema: string; name: string }) =>
  table.schema === 'public' ? table.name : `${table.schema}.${table.name}`;
