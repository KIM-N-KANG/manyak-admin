// @vitest-environment jsdom
import { createElement } from 'react';

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';

import { dailyCost } from '@/features/analytics/ai-cost';
import {
  Sparkline,
  trendSeries,
} from '@/features/dashboard/overview-sparkline';

afterEach(cleanup);
it('미니 선은 숨김 SVG 하나이며 null과 누락 날짜에서 끊고 0은 보존한다', () => {
  const { container } = render(
    createElement(Sparkline, {
      trend: [
        { date: '2026-10-01', value: 0 },
        { date: '2026-10-02', value: 4 },
        { date: '2026-10-03', value: null },
        { date: '2026-10-04', value: 8 },
        { date: '2026-10-06', value: 2 },
      ],
    }),
  );
  const svg = container.querySelector('svg')!;

  expect(svg.getAttribute('aria-hidden')).toBe('true');
  expect(svg.querySelectorAll('path')).toHaveLength(1);

  const path = svg.querySelector('path')!;

  expect(path.getAttribute('d')!.match(/M/g)).toHaveLength(3);
  expect(path.getAttribute('d')).not.toMatch(/NaN|Infinity/);
  expect(path.getAttribute('vector-effect')).toBe('non-scaling-stroke');
  expect(path.getAttribute('stroke')).toBe('var(--primary)');
  expect(svg.querySelectorAll('circle,text,title')).toHaveLength(0);
});
it.each([
  undefined,
  [],
  [{ date: '2026-10-01', value: 5 }],
  [{ date: '2026-10-01', value: null }],
])('유효 값 둘 미만이면 자리는 유지하고 SVG를 만들지 않는다: %j', (trend) => {
  const { container } = render(createElement(Sparkline, { trend }));

  expect(container.querySelector('[data-overview-trend]')).toBeTruthy();
  expect(container.querySelector('svg')).toBeNull();
});
it('선택 범위만 사용하고 누락·준비 중 날짜는 null이다', () => {
  expect(
    trendSeries(
      [
        { date: '2026-10-01', value: 100 },
        { date: '2026-10-02', value: 2 },
        { date: '2026-10-04', value: 4 },
      ],
      { from: '2026-10-02', to: '2026-10-04' },
      ['2026-10-04'],
    ),
  ).toEqual([
    { date: '2026-10-02', value: 2 },
    { date: '2026-10-03', value: null },
    { date: '2026-10-04', value: null },
  ]);
});
it('AI 일별 합은 null 아닌 기능만 더하며 모두 null이면 null이다', () => {
  expect(
    dailyCost([{ costKrw: 1.2 }, { costKrw: null }, { costKrw: 3.4 }]),
  ).toBeCloseTo(4.6);
  expect(dailyCost([{ costKrw: null }])).toBeNull();
  expect(dailyCost([{ costKrw: 0 }])).toBe(0);
});
