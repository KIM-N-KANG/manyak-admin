export type ChartLabelPosition = {
  id: string;
  x: number;
  y: number;
  text: string;
  centered?: boolean;
};

/** 가로로 겹치는 라벨 묶음마다 최소 세로 간격을 확보한다. */
export function layoutChartLabels<T extends ChartLabelPosition>(
  labels: T[],
  top: number,
  bottom: number,
  gap = 18,
): (T & { labelY: number })[] {
  const groups: { left: number; right: number; labels: T[] }[] = [];
  const width = (text: string) =>
    Array.from(text).reduce(
      (sum, char) => sum + (/[^\x00-\x7F]/.test(char) ? 11 : 6),
      0,
    );

  for (const label of labels.toSorted(
    (a, b) => a.x - b.x || a.id.localeCompare(b.id),
  )) {
    const size = width(label.text);
    const left = label.x - (label.centered ? size / 2 : 0);
    const right = left + size;
    const matches = groups.filter(
      (group) => left < group.right + 8 && right > group.left - 8,
    );
    const group = { left, right, labels: [label] };

    for (const match of matches) {
      group.left = Math.min(group.left, match.left);
      group.right = Math.max(group.right, match.right);
      group.labels.push(...match.labels);
      groups.splice(groups.indexOf(match), 1);
    }

    groups.push(group);
  }

  return groups.flatMap((group) => {
    const sorted = group.labels.toSorted(
      (a, b) => a.y - b.y || a.id.localeCompare(b.id),
    );
    const positions: number[] = [];

    sorted.forEach((label, index) => {
      positions.push(
        Math.max(top, label.y, index ? positions[index - 1] + gap : top),
      );
    });

    const overflow = Math.max(0, positions.at(-1)! - bottom);

    if (overflow) {
      positions[positions.length - 1] -= overflow;

      for (let i = positions.length - 2; i >= 0; i--) {
        positions[i] = Math.min(positions[i], positions[i + 1] - gap);
      }
    }

    return sorted.map((label, index) => ({
      ...label,
      labelY: positions[index],
    }));
  });
}
