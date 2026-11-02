import { expect, it } from 'vitest';

import { sectionMoveUpdates } from '@/features/home-sections/move';
import { homeSectionRows } from '@/fixtures/home-sections';

it.each([
  [1, 1, 1],
  [1, 1, 2],
  [1, 2, 2],
  [5, 5, 10],
])(
  '동률 %j에서 양방향 이웃 교환 뒤 전체 순서는 고유하며 다른 항목의 상대 순서를 유지한다',
  (...values) => {
    for (const [from, to] of [
      [0, 1],
      [1, 0],
      [1, 2],
      [2, 1],
    ]) {
      const rows = structuredClone(homeSectionRows()).map((row, index) => ({
        ...row,
        sortOrder: values[index],
      }));
      const expected = rows.map((row) => row.id);

      [expected[from], expected[to]] = [expected[to], expected[from]];

      const updates = sectionMoveUpdates(rows, rows[from], rows[to]);

      for (const update of updates)
        rows.find((row) => row.id === update.id)!.sortOrder = update.sortOrder;

      expect(new Set(rows.map((row) => row.sortOrder)).size).toBe(rows.length);
      expect(
        rows.toSorted((a, b) => a.sortOrder - b.sortOrder).map((row) => row.id),
      ).toEqual(expected);
    }
  },
);
