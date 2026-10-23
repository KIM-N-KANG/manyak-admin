import {
  type DateRange,
  getRangeError,
  kstToday,
  quickRanges,
  resolveRange,
} from '@/features/dashboard/date-range';

export const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
export function tabLimits(tab: string) {
  return {
    maxDays:
      tab === 'creation'
        ? 20
        : ['story-detail', 'funnels'].includes(tab)
          ? 31
          : tab === 'sources'
            ? 10
            : 366,
    yesterday: tab === 'retention',
  };
}
export function defaultPeriod(
  tab: string,
  campaign?: { startDate: string; endDate: string | null },
  today = kstToday(),
): DateRange {
  if (campaign && ['trend', 'creation', 'story-detail'].includes(tab))
    return { from: campaign.startDate, to: campaign.endDate ?? today };

  const days = ['retention', 'sources', 'funnels'].includes(tab)
    ? 7
    : tab === 'sessions'
      ? 14
      : 30;
  const to = tab === 'retention' ? shiftDate(today, -1) : today;

  return { from: shiftDate(to, 1 - days), to };
}
export function analyticsRange(
  params: URLSearchParams,
  tab: string,
  campaign?: { startDate: string; endDate: string | null },
  today = kstToday(),
) {
  const hasQuick = quickRanges.some(([key]) => key === params.get('range'));
  const custom = { from: params.get('from') ?? '', to: params.get('to') ?? '' };
  const explicit = hasQuick || !getRangeError(custom, today);
  const range = explicit
    ? resolveRange(params, today)
    : { ...defaultPeriod(tab, campaign, today), name: null, label: '' };
  const { maxDays, yesterday } = tabLimits(tab);
  const endDate = yesterday ? shiftDate(today, -1) : today;
  const error =
    range.to > endDate
      ? 'retention'
      : (Date.parse(range.to) - Date.parse(range.from)) / 86400000 + 1 > maxDays
        ? 'limit'
        : null;

  return {
    ...range,
    label: range.label || `${range.from} ~ ${range.to}`,
    maxDays,
    endDate,
    error,
    adjusted: {
      to: range.to > endDate ? endDate : range.to,
      from:
        error === 'retention'
          ? [
              range.from > endDate ? endDate : range.from,
              shiftDate(endDate, 1 - maxDays),
            ]
              .sort()
              .at(-1)!
          : shiftDate(range.to, 1 - maxDays),
    },
  };
}
export function chartDates(from: string, to: string) {
  return Array.from(
    { length: Math.max(0, (Date.parse(to) - Date.parse(from)) / 86400000 + 1) },
    (_, i) => shiftDate(from, i),
  );
}
export function analyticsRefetch({
  state,
}: {
  state: {
    data?: { pendingDates?: string[]; monthlyActiveUsers?: number | null };
  };
}) {
  return state.data &&
    ((state.data.pendingDates?.length ?? 0) > 0 ||
      state.data.monthlyActiveUsers === null)
    ? 60000
    : false;
}
