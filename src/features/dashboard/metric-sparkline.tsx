'use client';

import { Line, LineChart } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ChartCrosshair } from '@/features/dashboard/chart-crosshair';
import type { DailyMetrics, MetricKey } from '@/features/dashboard/types';

export function MetricSparkline({
  daily,
  metric,
  label,
}: {
  daily: DailyMetrics[];
  metric: MetricKey;
  label: string;
}) {
  return (
    <ChartContainer
      config={{ [metric]: { label, color: 'var(--primary)' } }}
      className="h-12 w-full"
      aria-label={`${label} 기간별 추이`}>
      <LineChart
        accessibilityLayer={false}
        data={daily}
        margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
        <ChartTooltip
          cursor={<ChartCrosshair />}
          isAnimationActive={false}
          labelFormatter={(_label, payload) => payload[0]?.payload?.date ?? ''}
          content={<ChartTooltipContent />}
        />
        <Line
          type="linear"
          dataKey={metric}
          stroke={`var(--color-${metric})`}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
