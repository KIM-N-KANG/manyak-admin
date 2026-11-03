'use client';

import { Tooltip } from '@base-ui/react/tooltip';

import { dateTime, QueryState } from '@/components/admin/data-ui';
import { ChartsSkeleton, SummarySkeleton } from '@/components/admin/loading-ui';
import { Card } from '@/components/ui/card';
import { useApi } from '@/features/shared/use-api';
import { cn } from '@/lib/utils';

import type {
  ActivityHoursMetric,
  ActivityHoursResponse,
  HoursMetric,
} from './activity-hours-types';
import { MetricHelp, MetricScope } from './metric-definition';
import { NumericTable, Source, SummaryCards } from './metric-ui';

export const hoursMetrics = [
  ['messages', '채팅 메시지'],
  ['signups', '회원 가입'],
  ['stories', '스토리 생성'],
  ['payments', '결제'],
] as const;

const units = { messages: '개', signups: '명', stories: '개', payments: '건' };
const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
const hours = Array.from({ length: 24 }, (_, i) => i);

export const activityHoursHelp =
  '서버 DB 출처 지표입니다. 팀 계정은 제외하고 게스트 채팅은 포함합니다. 시각은 KST이고 칸은 그 요일 하루 평균입니다. 기간에 오늘이 있으면 아직 오지 않은 시각은 0으로 셉니다.';

export function hoursAverage(value: number | null) {
  return value === null
    ? '기간에 없음'
    : value > 0 && value < 0.05
      ? '0.1 미만'
      : value.toLocaleString('ko-KR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
}

function peakCell(metric: ActivityHoursMetric) {
  return metric.cells
    .filter((cell) => cell.average !== null && cell.average > 0)
    .sort(
      (a, b) =>
        b.average! - a.average! || a.weekday - b.weekday || a.hour - b.hour,
    )[0];
}

export function ActivityHoursContent({
  data,
  metric,
}: {
  data: ActivityHoursResponse;
  metric: HoursMetric;
}) {
  const selected = data.metrics[metric];
  const unit = units[metric];
  const peak = peakCell(selected);
  const byCell = new Map(
    selected.cells.map((cell) => [`${cell.weekday}/${cell.hour}`, cell]),
  );
  const byWeekday = new Map(
    selected.weekdays.map((row) => [row.weekday, row.average]),
  );
  const byHour = new Map(selected.hours.map((row) => [row.hour, row.average]));
  const daysByWeekday = new Map(
    data.weekdayDays.map((row) => [row.weekday, row.days]),
  );
  const tableRows = weekdays.map((name, i) => [
    name,
    ...hours.map((hour) =>
      hoursAverage(byCell.get(`${i + 1}/${hour}`)?.average ?? null),
    ),
    hoursAverage(byWeekday.get(i + 1) ?? null),
  ]);

  return (
    <MetricScope value={`hours-${metric}`}>
      <SummaryCards
        items={[
          {
            label: '기간 합계',
            value: `${selected.total.toLocaleString('ko-KR')}${unit}`,
          },
          {
            label: '하루 평균',
            value: `${hoursAverage(selected.dailyAverage)}${unit}`,
          },
          {
            label: '가장 많은 시간대',
            value: peak
              ? `${weekdays[peak.weekday - 1]}요일 ${peak.hour}시`
              : '없음',
            detail: peak
              ? `평균 ${hoursAverage(peak.average)}${unit}`
              : undefined,
          },
        ]}
      />
      <Card className="min-w-0">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="font-semibold">요일 시간 격자</h3>
          <MetricHelp title="요일 시간 격자" />
        </div>
        <div className="overflow-x-auto">
          <Tooltip.Provider delay={150}>
            <table
              aria-label="요일 시간 격자"
              className="w-full min-w-240 border-separate border-spacing-1 text-center text-xs tabular-nums">
              <thead>
                <tr>
                  <th scope="col">요일</th>
                  {hours.map((hour) => (
                    <th key={hour} scope="col">
                      {hour}
                    </th>
                  ))}
                  <th scope="col" className="min-w-20">
                    요일 평균
                  </th>
                </tr>
              </thead>
              <tbody>
                {weekdays.map((name, i) => {
                  const weekday = i + 1;
                  const days = daysByWeekday.get(weekday) ?? 0;

                  return (
                    <tr key={weekday}>
                      <th scope="row">{name}</th>
                      {hours.map((hour) => {
                        const cell = byCell.get(`${weekday}/${hour}`);
                        const average = days ? (cell?.average ?? null) : null;
                        const isPeak =
                          peak?.weekday === weekday && peak.hour === hour;
                        const tip =
                          average === null
                            ? '기간에 없음'
                            : `평균 ${hoursAverage(average)}${unit}`;

                        return (
                          <td key={hour} className="p-0">
                            <Tooltip.Root>
                              <Tooltip.Trigger
                                type="button"
                                aria-label={`${name}요일 ${hour}시, ${tip}`}
                                data-peak={isPeak ? 'true' : 'false'}
                                className={cn(
                                  'h-9 w-full min-w-6 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  isPeak && 'ring-2 ring-primary',
                                )}
                                style={
                                  average === null
                                    ? {
                                        backgroundImage:
                                          'repeating-linear-gradient(135deg, transparent, transparent 4px, color-mix(in srgb, var(--muted-foreground) 15%, transparent) 4px, color-mix(in srgb, var(--muted-foreground) 15%, transparent) 6px)',
                                      }
                                    : average > 0 && peak
                                      ? {
                                          backgroundColor: `color-mix(in srgb, var(--primary) ${Math.round((average / peak.average!) * 45)}%, white)`,
                                        }
                                      : undefined
                                }
                              />
                              <Tooltip.Portal>
                                <Tooltip.Positioner sideOffset={6}>
                                  <Tooltip.Popup
                                    role="tooltip"
                                    className="z-50 rounded-sm border bg-popover p-3 text-xs leading-5 text-popover-foreground shadow-sm">
                                    <p>
                                      {name}요일 {hour}시
                                    </p>
                                    <p>{tip}</p>
                                    {average !== null ? (
                                      <p>
                                        합계{' '}
                                        {cell!.count.toLocaleString('ko-KR')}
                                        {unit} ({days}일)
                                      </p>
                                    ) : null}
                                  </Tooltip.Popup>
                                </Tooltip.Positioner>
                              </Tooltip.Portal>
                            </Tooltip.Root>
                          </td>
                        );
                      })}
                      <td>
                        {hoursAverage(
                          days ? (byWeekday.get(weekday) ?? null) : null,
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <th scope="row" className="whitespace-nowrap">
                    시 평균
                  </th>
                  {hours.map((hour) => (
                    <td key={hour}>{hoursAverage(byHour.get(hour) ?? null)}</td>
                  ))}
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </Tooltip.Provider>
        </div>
      </Card>
      <NumericTable
        title="전체 수치 표"
        headers={['요일', ...hours.map(String), '요일 평균']}
        rows={[
          ...tableRows,
          [
            '시 평균',
            ...hours.map((hour) => hoursAverage(byHour.get(hour) ?? null)),
            '—',
          ],
        ]}
      />
    </MetricScope>
  );
}

export function ActivityHoursArea({
  query,
  metric,
}: {
  query: string;
  metric: HoursMetric;
}) {
  const response = useApi<ActivityHoursResponse>(
    `/api/users/activity-hours?${query}`,
  );

  return (
    <section aria-label="요일과 시간대 활동 영역" className="mb-8">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">요일과 시간대 활동</h2>
        <Source source="서버 DB" help={activityHoursHelp} />
      </div>
      {response.data && !response.isError ? (
        <>
          <p className="mb-4 text-xs text-muted-foreground">
            {dateTime(response.data.asOf)} KST 집계 기준
          </p>
          <ActivityHoursContent data={response.data} metric={metric} />
        </>
      ) : (
        <QueryState
          pending={response.isPending}
          error={response.error}
          retry={response.refetch}
          skeleton={
            <>
              <SummarySkeleton count={3} />
              <ChartsSkeleton count={1} />
            </>
          }
        />
      )}
    </section>
  );
}
