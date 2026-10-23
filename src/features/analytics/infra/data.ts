import {
  getRangeError,
  kstToday,
  quickRanges,
  resolveRange,
} from '@/features/dashboard/date-range';

import type { InfraMetrics, InfraPoint, InfraSeries, InfraUnit } from './types';

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
export const serviceName = (name: string) =>
  (
    ({ server: '서버', ai: 'AI', notification: '알림' }) as Record<
      string,
      string
    >
  )[name] ?? name;
export const serviceOrder = ['server', 'ai', 'notification'];
export const orderedServices = (data: NonNullable<InfraMetrics['ecs']>) =>
  data.services.toSorted((a, b) => {
    const rank = (name: string) =>
      serviceOrder.includes(name) ? serviceOrder.indexOf(name) : 3;

    return rank(a.name) - rank(b.name);
  });
export const serviceSeries = (
  name: string,
  points: InfraPoint[],
): InfraSeries => ({
  key: name,
  label: serviceName(name),
  points,
  color:
    (
      {
        server: 'var(--chart-1)',
        ai: 'var(--chart-2)',
        notification: 'var(--chart-3)',
      } as Record<string, string>
    )[name] ?? 'var(--chart-3)',
  dash: ({ ai: '6 3', notification: '2 3' } as Record<string, string>)[name],
});
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
export function infraNumber(value: number, unit: InfraUnit) {
  return `${infraValue(value, unit).toLocaleString('ko-KR', { minimumFractionDigits: ['%', 'GB', 'MB', 'ms'].includes(unit) ? 1 : 0, maximumFractionDigits: ['%', 'GB', 'MB', 'ms'].includes(unit) ? 1 : 0 })}${unit}`;
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
