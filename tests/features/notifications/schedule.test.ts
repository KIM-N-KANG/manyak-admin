import { afterEach, describe, expect, it } from 'vitest';

import {
  formatDuration,
  formatKst,
  fromKst,
  isNightKst,
  nextDaytime,
  quickPicks,
  scheduleError,
} from '@/features/notifications/schedule';

const kst = (date: string, hour: number, minute = 0) =>
  fromKst(date, hour, minute)!;
const originalTz = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTz;
});

describe('KST 예약 시각', () => {
  it('KST 벽시계를 기기 시간대와 무관하게 UTC로 바꾼다', () => {
    for (const tz of ['Asia/Seoul', 'America/Los_Angeles', 'UTC']) {
      process.env.TZ = tz;
      expect(kst('2026-10-28', 10).toISOString()).toBe(
        '2026-10-28T01:00:00.000Z',
      );
      expect(kst('2026-10-28', 3, 15).toISOString()).toBe(
        '2026-10-27T18:15:00.000Z',
      );
    }
  });
  it('없는 날짜와 형식 오류는 null이다', () => {
    expect(fromKst('2026-02-30', 10, 0)).toBeNull();
    expect(fromKst('2026-10-28T10', 10, 0)).toBeNull();
    expect(fromKst('2026-10-28', 24, 0)).toBeNull();
  });
  it.each([
    [20, 59, false],
    [21, 0, true],
    [23, 59, true],
    [0, 0, true],
    [7, 59, true],
    [8, 0, false],
  ])('KST %i:%i의 야간 여부는 %s다', (hour, minute, night) => {
    expect(isNightKst(kst('2026-10-28', hour, minute))).toBe(night);
  });
  it('야간 시각은 가장 가까운 KST 08:00로 옮기고 주간은 그대로 둔다', () => {
    expect(nextDaytime(kst('2026-10-28', 21)).toISOString()).toBe(
      kst('2026-10-29', 8).toISOString(),
    );
    expect(nextDaytime(kst('2026-10-28', 3)).toISOString()).toBe(
      kst('2026-10-28', 8).toISOString(),
    );

    const day = kst('2026-10-28', 10);

    expect(nextDaytime(day)).toBe(day);
  });
  it('사람이 읽는 KST 시각과 남은 시간을 적는다', () => {
    expect(formatKst(kst('2026-10-28', 10))).toBe(
      '2026년 10월 28일 (수) 오전 10:00',
    );
    expect(formatKst(kst('2026-10-28', 0))).toBe(
      '2026년 10월 28일 (수) 오전 12:00',
    );
    expect(formatKst(kst('2026-10-28', 13, 5))).toBe(
      '2026년 10월 28일 (수) 오후 1:05',
    );
    expect(formatDuration((13 * 60 + 20) * 60_000)).toBe('13시간 20분');
    expect(formatDuration(27 * 60 * 60_000)).toBe('1일 3시간');
    expect(formatDuration(30_000)).toBe('1분 미만');
  });
  it('빠른 선택은 지난 시각을 비활성으로 두고 1시간 뒤를 5분 단위로 올린다', () => {
    const picks = quickPicks(kst('2026-10-28', 20, 31));
    const state = Object.fromEntries(
      picks.map((pick) => [pick.label, [formatKst(pick.at), pick.disabled]]),
    );

    expect(state).toEqual({
      '1시간 뒤': ['2026년 10월 28일 (수) 오후 9:35', false],
      '오늘 12:00': ['2026년 10월 28일 (수) 오후 12:00', true],
      '오늘 20:00': ['2026년 10월 28일 (수) 오후 8:00', true],
      '내일 10:00': ['2026년 10월 29일 (목) 오전 10:00', false],
      '내일 20:00': ['2026년 10월 29일 (목) 오후 8:00', false],
    });
  });
  it('미정, 과거, 현재 시각을 막고 이후 시각만 허용한다', () => {
    const now = kst('2026-10-28', 10);

    expect(scheduleError(null, now)).toBe('예약 날짜와 시각을 선택해 주세요.');
    expect(scheduleError(kst('2026-10-28', 9, 55), now)).toContain(
      '이미 지난 시각',
    );
    expect(scheduleError(now, now)).toContain('이미 지난 시각');
    expect(scheduleError(kst('2026-10-28', 10, 5), now)).toBe('');
  });
});
