'use client';

import { usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';

import { layoutChartLabels } from './chart-label-layout';

export type ChartEndLabel = {
  id: string;
  x: string | number;
  y: number;
  text: string;
  centered?: boolean;
  offsetY?: number;
};

/** 실제 축 좌표를 기준으로 라벨만 옮겨 데이터 점의 위치를 보존한다. */
export function ChartEndLabels({ labels }: { labels: ChartEndLabel[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const plot = usePlotArea();

  if (!xScale || !yScale || !plot) return null;

  const anchors = labels.flatMap((label) => {
    const anchorX = xScale(label.x, { position: 'middle' });
    const anchorY = yScale(label.y);

    if (
      anchorX == null ||
      anchorY == null ||
      !Number.isFinite(anchorX) ||
      !Number.isFinite(anchorY)
    )
      return [];

    return [
      {
        ...label,
        anchorX,
        anchorY,
        x: anchorX + (label.centered ? 0 : 8),
        y: anchorY + (label.offsetY ?? 0),
      },
    ];
  });

  return (
    <g className="chart-end-labels" pointerEvents="none">
      {layoutChartLabels(anchors, plot.y + 6, plot.y + plot.height - 6).map(
        (label) => (
          <g key={label.id} data-label-id={label.id}>
            {Math.abs(label.labelY - label.anchorY) > 6 ? (
              <line
                x1={label.anchorX}
                y1={label.anchorY}
                x2={label.x}
                y2={label.labelY}
                stroke="var(--border)"
              />
            ) : null}
            <text
              x={label.x}
              y={label.labelY}
              dominantBaseline="middle"
              textAnchor={label.centered ? 'middle' : 'start'}
              fill="var(--foreground)"
              fontSize={11}>
              {label.text}
            </text>
          </g>
        ),
      )}
    </g>
  );
}
