'use client';

import { Line, LineChart } from 'recharts';

import { NumberValue, QueryState } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ChartCrosshair } from '@/features/dashboard/chart-crosshair';
import type { PlayInstalls } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

const config = {
  cumulativeInstalls: {
    label: 'Android 누적 기기 설치 수',
    color: 'var(--primary)',
  },
  activeDevices: { label: '활성 기기 수', color: 'var(--muted-foreground)' },
  installs: { label: '일별 기기 설치 수', color: 'var(--primary)' },
  uninstalls: { label: '일별 앱 삭제 수', color: 'var(--muted-foreground)' },
};

export function PlayInstallsCard() {
  const query = useApi<PlayInstalls>('/api/dashboard/play-installs');
  const data = query.data;

  return (
    <section aria-labelledby="play-installs-heading" className="mb-8 min-w-0">
      <Card className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 id="play-installs-heading" className="font-semibold">
            앱 설치(Android)
          </h2>
          <HelpTooltip label="앱 설치(Android) 집계 안내">
            보고서는 며칠 늦게 반영됩니다. 누적 기기 설치 수는 보고서 전체
            기간의 일별 기기 설치 수를 합산한 값입니다. 페이지에서 선택한 기간은
            이 카드에 적용되지 않습니다.
          </HelpTooltip>
        </div>
        <QueryState
          pending={query.isPending}
          error={query.error}
          retry={query.refetch}
          source="play"
        />
        {data && !query.isError ? (
          <>
            <div className="mt-4 flex items-center gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  Android 누적 기기 설치 수
                </p>
                <p className="mt-1 text-3xl font-semibold">
                  <NumberValue value={data.totalInstalls} />
                  <span className="ml-1 text-sm font-normal">대</span>
                </p>
                <p className="mt-3 text-sm">
                  활성 기기 수 <NumberValue value={data.activeDevices} />대
                </p>
              </div>
              <ChartContainer
                config={config}
                className="h-20 w-28 shrink-0"
                aria-label="일별 기기 설치 수 추이">
                <LineChart accessibilityLayer data={data.daily}>
                  <ChartTooltip
                    cursor={<ChartCrosshair />}
                    isAnimationActive={false}
                    content={<ChartTooltipContent />}
                  />
                  <Line
                    dataKey="installs"
                    type="linear"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              집계 기준 날짜 {data.asOf} (Play 기준 태평양 시간)
            </p>
          </>
        ) : null}
      </Card>
    </section>
  );
}
