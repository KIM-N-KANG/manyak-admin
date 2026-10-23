import { describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/dashboard/charts/route';
import {
  kstToday,
  quickRange,
  quickRanges,
  resolveRange,
  validRange,
} from '@/features/dashboard/date-range';

const today = '2026-10-22';

describe('KST 기간 선택', () => {
  it.each([
    ['today', '2026-10-22', '2026-10-22'],
    ['yesterday', '2026-10-21', '2026-10-21'],
    ['last7d', '2026-10-16', '2026-10-22'],
    ['last14d', '2026-10-09', '2026-10-22'],
    ['last30d', '2026-09-23', '2026-10-22'],
    ['last90d', '2026-07-25', '2026-10-22'],
    ['thisWeek', '2026-10-19', '2026-10-22'],
    ['lastWeek', '2026-10-12', '2026-10-18'],
    ['thisMonth', '2026-10-01', '2026-10-22'],
    ['lastMonth', '2026-09-01', '2026-09-30'],
    ['last6m', '2026-04-23', '2026-10-22'],
    ['last1y', '2025-10-23', '2026-10-22'],
  ] as const)('%s는 양끝을 포함한다', (name, from, to) => {
    expect(quickRange(name, today)).toEqual({ from, to });
    expect(validRange({ from, to }, today)).toBe(true);
  });
  it('월말·윤년과 월요일 주 경계를 처리한다', () => {
    expect(quickRange('last6m', '2026-08-31').from).toBe('2026-03-01');
    expect(quickRange('last1y', '2024-02-29').from).toBe('2023-03-01');
    expect(quickRange('lastWeek', '2026-10-19')).toEqual({
      from: '2026-10-12',
      to: '2026-10-18',
    });
  });
  it('예전 days·직접 날짜·상대 범위를 해석하고 방문 날짜에 따라 재계산한다', () => {
    expect(resolveRange(new URLSearchParams('days=7'), today).name).toBe(
      'last7d',
    );
    expect(
      resolveRange(new URLSearchParams('from=2026-10-01&to=2026-10-10'), today)
        .label,
    ).toBe('2026-10-01 ~ 2026-10-10');
    expect(
      resolveRange(new URLSearchParams('range=last7d'), '2026-10-23').to,
    ).toBe('2026-10-23');
    expect(quickRanges).toHaveLength(12);
  });
  it.each([
    'from=2026-10-01',
    'to=2026-10-01',
    'from=2026-10-02&to=2026-10-01',
    'from=2026-02-30&to=2026-03-01',
    'from=2020-01-01&to=2026-01-01',
    'from=2999-01-01&to=2999-01-01',
    'days=7&from=2026-10-01&to=2026-10-02',
    'from=2026-10-01&from=2026-10-02&to=2026-10-03',
  ])('잘못된 요청은 400: %s', (query) => {
    expect(
      GET(new Request(`http://localhost/api/dashboard/charts?${query}`)).status,
    ).toBe(400);
  });
  it('직접 범위 일별 수치와 분포 링크에 같은 날짜를 적용한다', async () => {
    const data = await GET(
      new Request(
        'http://localhost/api/dashboard/charts?from=2026-10-01&to=2026-10-14',
      ),
    ).json();

    expect(data.from).toBe('2026-10-01');
    expect(data.to).toBe('2026-10-14');
    expect(data.daily).toHaveLength(14);
    expect(data.distributions[0].points[0].link.params).toMatchObject({
      chatFrom: '2026-10-01',
      chatTo: '2026-10-14',
    });
  });
});

it('KST 자정을 기준으로 오늘을 계산한다', () => {
  vi.useFakeTimers({ toFake: ['Date'] });

  try {
    vi.setSystemTime(new Date('2026-10-21T14:59:59Z'));
    expect(kstToday()).toBe('2026-10-21');
    vi.setSystemTime(new Date('2026-10-21T15:00:00Z'));
    expect(kstToday()).toBe('2026-10-22');
  } finally {
    vi.useRealTimers();
  }
});
it('최대 366일은 허용하고 367일과 미래는 거부한다', () => {
  expect(validRange({ from: '2025-10-22', to: '2026-10-22' }, today)).toBe(
    true,
  );
  expect(validRange({ from: '2025-10-21', to: '2026-10-22' }, today)).toBe(
    false,
  );
  expect(validRange({ from: '2026-10-22', to: '2026-10-23' }, today)).toBe(
    false,
  );
});
