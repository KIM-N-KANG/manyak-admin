import { expect, it } from 'vitest';

import {
  analyticsRange,
  shiftDate,
  tabLimits,
} from '@/features/analytics/range';
import { getRangeError, quickRange } from '@/features/dashboard/date-range';

const today = '2026-11-03';

it.each([
  ['activation', 31, 62],
  ['creation', 20, 41],
  ['story-detail', 31, 35],
] as const)(
  '%s는 확정일에만 상한을 늘리고 조정 범위도 따른다',
  (tab, normal, confirmed) => {
    for (const [to, max] of [
      ['2026-11-03', normal],
      ['2026-11-02', normal],
      ['2026-11-01', confirmed],
      ['2026-10-21', confirmed],
    ] as const) {
      expect(tabLimits(tab, to, today).maxDays).toBe(max);

      const from = shiftDate(to, 1 - max);
      const valid = analyticsRange(
        new URLSearchParams({ from, to }),
        tab,
        undefined,
        today,
      );

      expect(valid.error).toBeNull();
      expect(valid.maxDays).toBe(max);

      const invalid = analyticsRange(
        new URLSearchParams({ from: shiftDate(from, -1), to }),
        tab,
        undefined,
        today,
      );

      expect(invalid.error).toBe('limit');
      expect(invalid.adjusted).toEqual({ from, to });
    }
  },
);
it('확정 범위 82일은 62일로 맞추고 진행 중 33일은 31일에서 막는다', () => {
  const closed = analyticsRange(
    new URLSearchParams('from=2026-08-01&to=2026-10-21'),
    'activation',
    undefined,
    today,
  );

  expect(closed.maxDays).toBe(62);
  expect(closed.adjusted.from).toBe('2026-08-21');
  expect(
    analyticsRange(
      new URLSearchParams('from=2026-10-01&to=2026-11-02'),
      'activation',
      undefined,
      today,
    ).maxDays,
  ).toBe(31);
});
it('빠른 범위는 각 끝 날짜로 상한을 고른다', () => {
  const limit = (to: string) => tabLimits('creation', to, today).maxDays;

  expect(
    getRangeError(quickRange('lastMonth', today), today, limit),
  ).toBeNull();
  expect(getRangeError(quickRange('last30d', today), today, limit)).toContain(
    '20일',
  );
});
it('일반 전환 퍼널·소스·다른 탭의 상한은 유지한다', () => {
  for (const [tab, max] of [
    ['funnels', 31],
    ['sources', 10],
    ['trend', 366],
    ['retention', 366],
  ] as const)
    expect(tabLimits(tab, '2026-10-21', today).maxDays).toBe(max);
});
