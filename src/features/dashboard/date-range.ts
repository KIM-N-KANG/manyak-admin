export const quickRanges = [
  ['today', '오늘'],
  ['yesterday', '어제'],
  ['last7d', '최근 7일'],
  ['last14d', '최근 14일'],
  ['last30d', '최근 30일'],
  ['last90d', '최근 90일'],
  ['thisWeek', '이번 주'],
  ['lastWeek', '지난주'],
  ['thisMonth', '이번 달'],
  ['lastMonth', '지난달'],
  ['last6m', '최근 6개월'],
  ['last1y', '최근 1년'],
] as const;
export type RangeName = (typeof quickRanges)[number][0];
export type DateRange = { from: string; to: string };
export function kstToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(
    new Date(),
  );
}

const date = (value: Date) => value.toISOString().slice(0, 10);

export function quickRange(name: RangeName, today = kstToday()): DateRange {
  const end = new Date(`${today}T00:00:00Z`);
  const start = new Date(end);
  const shift = (n: number) => start.setUTCDate(start.getUTCDate() - n);

  if (name === 'yesterday') {
    shift(1);
    end.setUTCDate(end.getUTCDate() - 1);
  } else if (/^last\d+d$/.test(name)) shift(Number(name.slice(4, -1)) - 1);
  else if (name === 'thisWeek' || name === 'lastWeek') {
    shift((start.getUTCDay() + 6) % 7);

    if (name === 'lastWeek') {
      end.setTime(start.getTime() - 86400000);
      shift(7);
    }
  } else if (name === 'thisMonth' || name === 'lastMonth') {
    start.setUTCDate(1);

    if (name === 'lastMonth') {
      end.setTime(start.getTime() - 86400000);
      start.setUTCMonth(start.getUTCMonth() - 1);
    }
  } else if (name === 'last6m' || name === 'last1y') {
    const day = start.getUTCDate();

    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - (name === 'last6m' ? 6 : 12));

    const lastDay = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
    ).getUTCDate();

    start.setUTCDate(Math.min(day, lastDay));
    start.setUTCDate(start.getUTCDate() + 1);
  }

  return { from: date(start), to: date(end) };
}
export function getRangeError({ from, to }: DateRange, today = kstToday()) {
  const validDate = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    date(new Date(v)) === v;

  if (!validDate(from) || !validDate(to))
    return '시작 날짜와 끝 날짜를 올바르게 입력해 주세요.';

  if (from > to) return '끝 날짜는 시작 날짜와 같거나 이후로 선택해 주세요.';

  if (to > today) return '끝 날짜는 오늘 또는 이전 날짜로 선택해 주세요.';

  if ((Date.parse(to) - Date.parse(from)) / 86400000 >= 366)
    return '시작 날짜와 끝 날짜를 포함해 366일 이내로 선택해 주세요.';

  return null;
}
export function validRange(range: DateRange, today = kstToday()) {
  return getRangeError(range, today) === null;
}
export function resolveRange(params: URLSearchParams, today = kstToday()) {
  const name =
    params.get('range') ??
    (['7', '30', '90'].includes(params.get('days') ?? '')
      ? `last${params.get('days')}d`
      : null);
  const quick = quickRanges.find(([key]) => key === name);
  const custom = { from: params.get('from') ?? '', to: params.get('to') ?? '' };

  if (!quick && validRange(custom, today))
    return { ...custom, label: `${custom.from} ~ ${custom.to}`, name: null };

  const [key, label] = quick ?? quickRanges[4];

  return { ...quickRange(key, today), label, name: key };
}
