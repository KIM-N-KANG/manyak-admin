import type { HomeSection } from './form';

/** 동률이 없으면 이웃 값을 교환하고 동률이 있으면 바꾼 목록의 순서를 고유하게 배정한다. */
export function sectionMoveUpdates(
  rows: HomeSection[],
  section: HomeSection,
  neighbor: HomeSection,
) {
  if (new Set(rows.map((row) => row.sortOrder)).size === rows.length) {
    return [
      { id: section.id, sortOrder: neighbor.sortOrder },
      { id: neighbor.id, sortOrder: section.sortOrder },
    ];
  }

  const ordered = [...rows];
  const from = ordered.findIndex((row) => row.id === section.id);
  const to = ordered.findIndex((row) => row.id === neighbor.id);

  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];

  return ordered.flatMap((row, index) =>
    row.sortOrder === index + 1 ? [] : [{ id: row.id, sortOrder: index + 1 }],
  );
}
