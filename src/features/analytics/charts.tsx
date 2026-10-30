'use client';

import { type ReactNode, useContext } from 'react';

import { percent, ratio } from './config';
import { MetricHelp, MetricScope } from './metric-definition';
import {
  basisMark,
  NumericTable,
  PlatformPlaceholder,
  type PlotEmptyLabel,
  type PlotRow,
  plotValues,
  SeriesChart,
} from './metric-ui';
import { chartDates } from './range';
import type { Series } from './series';

export function dailyRows<D extends { date: string }>(
  data: { from: string; to: string; daily: D[]; pendingDates?: string[] },
  map: (day: D) => Record<string, number | null>,
  { preservePendingValues = false } = {},
): PlotRow[] {
  const byDate = new Map(data.daily.map((day) => [day.date, day]));

  return chartDates(data.from, data.to).map((date) => {
    const day = byDate.get(date);
    const pending = !day || data.pendingDates?.includes(date);

    return {
      date,
      ...(day && (!pending || preservePendingValues) ? map(day) : {}),
      ...(pending ? { pending: 1 } : {}),
    };
  });
}

export function Charts({
  items,
}: {
  items: {
    title: string;
    stacked?: boolean;
    composition?: boolean;
    rows: PlotRow[];
    series: Series[];
    unit: string;
    emptyLabel?: PlotEmptyLabel;
    href?: (date: string) => string;
    aside?: ReactNode;
    /** 고른 구분을 적용하지 못한 값이면 제목 옆과 전체 수치 표에 보이는 표시 문구다. */
    basis?: string | null;
    /** 값이 없어 차트 대신 보이는 안내 문구다. 전체 수치 표에서도 뺀다. */
    empty?: string;
  }[];
}) {
  // 모든 차트가 같은 전체 기준이면 전체 수치 표의 값 열 머리글 옆에 한 번만 보인다.
  const shared = items.every((item) => item.basis === items[0]?.basis)
    ? items[0]?.basis
    : undefined;

  const definitions = items.map((item) => item.title);
  const scope = useContext(MetricScope);
  const prepared = items.map((item) => ({
    ...item,
    values: plotValues(scope, item),
  }));

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-2 [&>*:last-child:nth-child(odd)]:xl:col-span-2">
        {items.map(({ basis, empty, ...item }) =>
          empty ? (
            <PlatformPlaceholder
              key={item.title}
              title={item.title}
              aside={item.aside}
              message={empty}
            />
          ) : (
            <SeriesChart
              key={item.title}
              {...item}
              aside={item.aside ?? basisMark(basis)}
            />
          ),
        )}
      </div>
      <NumericTable
        title="전체 수치 표"
        definitionTitle={definitions}
        headers={[
          { label: '지표', definitionTitle: definitions },
          { label: '날짜', definitionTitle: null },
          { label: '계열', definitionTitle: definitions },
          {
            label: shared ? `값 · ${shared}` : '값',
            definitionTitle: definitions,
          },
        ]}
        rows={prepared.flatMap((item) =>
          (item.empty ? [] : item.rows).flatMap((row) =>
            item.series.map((series) => [
              <span key="metric" className="inline-flex items-center gap-2">
                {item.title}
                {item.basis && !shared ? basisMark(item.basis) : null}
                <MetricHelp title={item.title} />
              </span>,
              row.date,
              series.label,
              item.composition && !row.pending
                ? `${item.values.format(row, series.key)} (${percent(
                    ratio(
                      Number(row[series.key] ?? 0),
                      item.series.reduce(
                        (sum, s) => sum + Number(row[s.key] ?? 0),
                        0,
                      ),
                    ),
                  )})`
                : item.values.format(row, series.key),
            ]),
          ),
        )}
      />
    </>
  );
}
