'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

export function DeliveryChart({
  items,
}: {
  items: { label: string; deliveredMembers: number }[];
}) {
  return (
    <ChartContainer
      className="h-72 w-full"
      config={{
        deliveredMembers: {
          label: '도달 메시지 수 (건)',
          color: 'var(--primary)',
        },
      }}>
      <BarChart accessibilityLayer data={items}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={30}
        />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="deliveredMembers"
          fill="var(--primary)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
