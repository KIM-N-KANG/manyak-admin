'use client';

import { Cross, useActiveTooltipCoordinate, usePlotArea } from 'recharts';

/** 활성 툴팁의 좌표를 차트 영역 안의 십자선으로 표시한다. */
export function ChartCrosshair() {
  const coordinate = useActiveTooltipCoordinate();
  const area = usePlotArea();

  if (!coordinate || !area) return null;

  return (
    <Cross
      x={coordinate.x}
      y={coordinate.y}
      left={area.x}
      top={area.y}
      width={area.width}
      height={area.height}
      stroke="var(--muted-foreground)"
      strokeDasharray="3 3"
      pointerEvents="none"
    />
  );
}
