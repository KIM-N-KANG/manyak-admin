import type {
  ActivityHoursMetric,
  ActivityHoursResponse,
  HoursMetric,
} from '@/features/analytics/activity-hours-types';
import { chartDates } from '@/features/analytics/range';

/** 요청 범위의 요일별 날짜 수로 시간대 예시를 만든다. */
export function activityHoursFixture(
  from: string,
  to: string,
): ActivityHoursResponse {
  const dates = chartDates(from, to);
  const weekdayDays = Array.from({ length: 7 }, (_, i) => ({
    weekday: i + 1,
    days: 0,
  }));

  for (const date of dates)
    weekdayDays[(new Date(date).getUTCDay() + 6) % 7].days++;

  const metric = (scale: number): ActivityHoursMetric => {
    const cells = weekdayDays.flatMap(({ weekday, days }) =>
      Array.from({ length: 24 }, (_, hour) => {
        const count = days * ((weekday * 7 + hour * 3) % 31) * scale;

        return { weekday, hour, count, average: days ? count / days : null };
      }),
    );
    const weekdays = weekdayDays.map(({ weekday, days }) => {
      const count = cells
        .filter((cell) => cell.weekday === weekday)
        .reduce((sum, cell) => sum + cell.count, 0);

      return { weekday, count, average: days ? count / days : null };
    });
    const hours = Array.from({ length: 24 }, (_, hour) => {
      const count = cells
        .filter((cell) => cell.hour === hour)
        .reduce((sum, cell) => sum + cell.count, 0);

      return { hour, count, average: count / dates.length };
    });
    const total = weekdays.reduce((sum, row) => sum + row.count, 0);

    return {
      total,
      dailyAverage: total / dates.length,
      cells,
      weekdays,
      hours,
    };
  };
  const metrics = Object.fromEntries(
    (['messages', 'signups', 'stories', 'payments'] as HoursMetric[]).map(
      (key, i) => [key, metric([20, 2, 3, 1][i])],
    ),
  ) as Record<HoursMetric, ActivityHoursMetric>;

  return {
    asOf: `${to}T03:00:00Z`,
    from,
    to,
    totalDays: dates.length,
    weekdayDays,
    metrics,
  };
}
