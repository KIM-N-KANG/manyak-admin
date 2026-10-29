'use client';

import { useRouter } from 'next/navigation';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import { DataTable, NumberValue, TextLink } from '@/components/admin/data-ui';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ChartCrosshair } from '@/features/dashboard/chart-crosshair';
import { chartNumber, periodAverage } from '@/features/dashboard/chart-data';
import { getDailyMetricHref } from '@/features/dashboard/links';
import type { DashboardCharts, MetricKey } from '@/features/dashboard/types';

const metrics: Record<MetricKey, { label: string; unit: string }> = {
  joined: { label: '가입', unit: '명' },
  chats: { label: '채팅 시작', unit: '개' },
  turns: { label: '턴', unit: '턴' },
  stories: { label: '스토리 생성', unit: '개' },
  granted: {
    label: '이프 적립',
    unit: '이프',
  },
  spent: {
    label: '이프 소모',
    unit: '이프',
  },
  payments: { label: '결제 건수', unit: '건' },
  revenue: { label: '결제 금액 (환불 포함)', unit: '원' },
  attendance: { label: '출석 회원 수', unit: '명' },
};

const axisNumber = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const dailyMetrics = [
  'joined',
  'chats',
  'turns',
  'stories',
  'granted',
  'spent',
  'payments',
  'revenue',
] as const;

export function DailyTrends({
  data: c,
  selectedMetrics = dailyMetrics,
  basis,
}: {
  data: DashboardCharts;
  selectedMetrics?: readonly MetricKey[];
  basis?: string | null;
}) {
  const router = useRouter();

  return (
    <Card className="min-w-0">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">일별 추이</h2>
        {basis ? (
          <span className="text-xs text-muted-foreground">{basis}</span>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {c.from} ~ {c.to} (KST)
        </span>
      </div>{' '}
      {c ? (
        <section
          aria-label="일별 지표 추이"
          className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {selectedMetrics.map((metric) => {
            const average = periodAverage(c.daily.map((day) => day[metric]));

            return (
              <div key={metric} className="min-w-0">
                <h2 className="font-semibold">{metrics[metric].label}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  기간 평균 {chartNumber(average)}
                  {metrics[metric].unit}
                </p>
                <ChartContainer
                  config={{
                    [metric]: {
                      label: metrics[metric].label,
                      color: 'var(--primary)',
                    },
                  }}
                  className="mt-5 h-[200px] w-full"
                  aria-label={`${metrics[metric].label} 일별 추이`}>
                  <LineChart
                    accessibilityLayer
                    data={c.daily}
                    margin={{ top: 20, right: 8, bottom: 0, left: 0 }}
                    onClick={(state) => {
                      const i = state.activeTooltipIndex;
                      const date = c.daily[Number(i)]?.date;

                      if (i !== null && i !== undefined && date)
                        router.push(getDailyMetricHref(metric, date));
                    }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => String(v).slice(5)}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={32}
                    />
                    <YAxis
                      width={52}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => axisNumber.format(Number(v))}
                    />
                    <ChartTooltip
                      cursor={<ChartCrosshair />}
                      isAnimationActive={false}
                      content={<ChartTooltipContent />}
                    />
                    <ReferenceLine
                      y={average}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
                    />
                    <Line
                      type="linear"
                      dataKey={metric}
                      stroke={`var(--color-${metric})`}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            );
          })}
          <details className="col-span-full">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              일별 수치와 목록 이동
            </summary>
            <div className="mt-4 max-h-64 overflow-auto">
              <DataTable
                headers={[
                  '날짜',
                  ...selectedMetrics.map(
                    (metric) =>
                      `${metrics[metric].label} (${metrics[metric].unit})`,
                  ),
                ]}>
                {c.daily.map((day) => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    {selectedMetrics.map((metric) => (
                      <td key={metric}>
                        <TextLink href={getDailyMetricHref(metric, day.date)}>
                          <NumberValue value={day[metric]} />{' '}
                          {metrics[metric].unit} →
                        </TextLink>
                      </td>
                    ))}
                  </tr>
                ))}
              </DataTable>
            </div>
          </details>
        </section>
      ) : null}
    </Card>
  );
}
