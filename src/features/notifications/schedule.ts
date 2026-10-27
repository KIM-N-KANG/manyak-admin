/**
 * 캠페인 예약 시각을 기기 시간대와 무관하게 KST 벽시계로 다루는 함수 모음.
 * 한국은 서머타임이 없어 UTC+9 고정 오프셋으로 변환한다.
 */
const offset = 9 * 3600_000;
const minute = 60_000;
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

export const nightStartHour = 21;
export const nightEndHour = 8;

export type KstParts = {
  date: string;
  hour: number;
  minute: number;
  weekday: string;
};

/** 숫자를 두 자리로 채운다. */
export const padTime = (value: number) => String(value).padStart(2, '0');

/** 시각의 KST 날짜(YYYY-MM-DD)·시·분·요일을 반환한다. */
export function kstParts(at: Date): KstParts {
  const shifted = new Date(at.getTime() + offset);

  return {
    date: shifted.toISOString().slice(0, 10),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: weekdays[shifted.getUTCDay()],
  };
}

/** KST 날짜와 시·분을 실제 시각으로 바꾼다. 형식이 틀리면 null을 반환한다. */
export function fromKst(date: string, hour: number, minutes: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match || hour < 0 || hour > 23 || minutes < 0 || minutes > 59)
    return null;

  const [year, month, day] = match.slice(1).map(Number);
  const value = Date.UTC(year, month - 1, day, hour, minutes) - offset;
  const check = new Date(value + offset);

  // 2월 30일처럼 넘어간 날짜는 받지 않는다.
  return check.getUTCDate() === day ? new Date(value) : null;
}

/** KST 21:00 이상이거나 08:00 미만이면 야간이다. */
export function isNightKst(at: Date) {
  const { hour } = kstParts(at);

  return hour >= nightStartHour || hour < nightEndHour;
}

/** 야간 시각을 바로 다음 KST 08:00로 옮긴다. 주간이면 그대로 반환한다. */
export function nextDaytime(at: Date) {
  if (!isNightKst(at)) return at;

  const { date, hour } = kstParts(at);
  const morning = fromKst(date, nightEndHour, 0)!;

  return hour >= nightStartHour
    ? new Date(morning.getTime() + 24 * 3600_000)
    : morning;
}

/** "2026년 10월 28일 (수) 오전 10:00" 형식으로 KST 시각을 적는다. */
export function formatKst(at: Date) {
  const { date, hour, minute: m, weekday } = kstParts(at);
  const [year, month, day] = date.split('-').map(Number);
  const half = hour < 12 ? '오전' : '오후';

  return `${year}년 ${month}월 ${day}일 (${weekday}) ${half} ${hour % 12 || 12}:${padTime(m)}`;
}

/** 두 시각의 차이를 "1일 3시간 20분" 형식으로 적는다. 1분 미만은 "1분 미만"이다. */
export function formatDuration(ms: number) {
  const total = Math.floor(ms / minute);

  if (total < 1) return '1분 미만';

  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;

  return [
    days ? `${days}일` : '',
    hours ? `${hours}시간` : '',
    minutes ? `${minutes}분` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** 시각을 다음 5분 단위로 올린다. */
export function ceilToFiveMinutes(at: Date) {
  const step = 5 * minute;

  return new Date(Math.ceil(at.getTime() / step) * step);
}

export type QuickPick = { label: string; at: Date; disabled: boolean };

/** 빠른 선택 칩을 만든다. 지난 시각은 비활성이다. */
export function quickPicks(now: Date): QuickPick[] {
  const today = kstParts(now).date;
  const tomorrow = kstParts(new Date(now.getTime() + 24 * 3600_000)).date;
  const picks = [
    {
      label: '약 1시간 뒤',
      at: ceilToFiveMinutes(new Date(now.getTime() + 3600_000)),
    },
    { label: '오늘 12:00', at: fromKst(today, 12, 0)! },
    { label: '오늘 20:00', at: fromKst(today, 20, 0)! },
    { label: '내일 10:00', at: fromKst(tomorrow, 10, 0)! },
    { label: '내일 20:00', at: fromKst(tomorrow, 20, 0)! },
  ];

  return picks.map((pick) => ({
    ...pick,
    disabled: pick.at.getTime() <= now.getTime(),
  }));
}

/** 예약 시각의 오류 문구를 반환한다. 서버는 과거 시각만 거절한다. */
export function scheduleError(at: Date | null, now: Date) {
  if (!at) return '예약 날짜와 시각을 선택해 주세요.';

  if (at.getTime() <= now.getTime())
    return '이미 지난 시각입니다. 현재 이후로 선택해 주세요.';

  return '';
}
