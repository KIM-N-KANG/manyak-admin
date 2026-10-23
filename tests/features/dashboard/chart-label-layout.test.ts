import { expect, it } from 'vitest';

import { layoutChartLabels } from '@/features/dashboard/chart-label-layout';

it.each([20, 98])(
  '값이 가깝거나 축 끝(%s)에 몰려도 계열 순서와 무관하게 라벨 간격을 확보한다',
  (y) => {
    const labels = [
      { id: 'server', x: 200, y, text: '서버 28.0%' },
      { id: 'ai', x: 200, y: y - 2, text: 'AI 29.0%' },
      { id: 'push', x: 200, y: y + 1, text: '알림 27.9%' },
    ];
    const placed = layoutChartLabels(labels, 6, 100);

    expect(placed.map((l) => l.id)).toEqual(['ai', 'server', 'push']);
    expect(placed[1].labelY - placed[0].labelY).toBeGreaterThanOrEqual(18);
    expect(placed[2].labelY - placed[1].labelY).toBeGreaterThanOrEqual(18);
    expect(placed[0].labelY).toBeGreaterThanOrEqual(6);
    expect(placed[2].labelY).toBeLessThanOrEqual(100);
    expect(labels[0].y).toBe(y);
    expect(layoutChartLabels(labels.toReversed(), 6, 100)).toEqual(placed);
  },
);

it('첫 입력 시간의 긴 백분위·평균 라벨과 서로 다른 끝 날짜도 겹침을 피한다', () => {
  const placed = layoutChartLabels(
    [
      { id: 'P50', x: 80, y: 30, centered: true, text: 'P50 1,200초' },
      { id: 'P75', x: 100, y: 30, centered: true, text: 'P75 1,230초' },
      { id: 'P90', x: 120, y: 30, centered: true, text: 'P90 1,240초' },
      { id: '평균', x: 110, y: 30, centered: true, text: '평균 1,210초' },
    ],
    6,
    100,
  );

  for (let i = 1; i < placed.length; i++)
    expect(placed[i].labelY - placed[i - 1].labelY).toBeGreaterThanOrEqual(18);
});

it('가로로 충분히 떨어진 라벨은 같은 높이를 유지하고 빈 라벨을 허용한다', () => {
  const placed = layoutChartLabels(
    [
      { id: 'a', x: 0, y: 50, text: 'A 0' },
      { id: 'b', x: 200, y: 50, text: 'B 0' },
    ],
    0,
    100,
  );

  expect(placed.map((l) => l.labelY)).toEqual([50, 50]);
  expect(layoutChartLabels([], 0, 100)).toEqual([]);
});
