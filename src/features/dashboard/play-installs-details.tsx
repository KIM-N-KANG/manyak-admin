'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import { DataTable, NumberValue, QueryState } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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

export function PlayInstallsDetails() {
  const query = useApi<PlayInstalls>('/api/dashboard/play-installs');
  const data = query.isError ? undefined : query.data;

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-semibold">앱 설치</h2>
        <HelpTooltip label="앱 설치 출처와 집계 안내" source="Google Play">
          Google Play 설치 보고서 출처 지표입니다. 보고서는 며칠 늦게 반영되고
          날짜는 Play 기준 태평양 시간입니다. 누적 기기 설치 수는 보고서 전체
          기간의 일별 기기 설치 수를 합산한 값입니다. 선택한 기간은 이 탭에
          적용되지 않습니다.
        </HelpTooltip>
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
        source="play"
      />
      {data ? (
        <Card className="min-w-0">
          <p className="mb-5 text-xs text-muted-foreground">
            집계 기준 날짜 {data.asOf} (Play 기준 태평양 시간)
          </p>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium">
                누적 기기 설치 수와 활성 기기 수
              </h3>
              <ChartContainer
                config={config}
                className="mt-3 h-64 w-full"
                aria-label="누적 기기 설치 수와 활성 기기 수 추이">
                <LineChart
                  accessibilityLayer
                  data={data.daily}
                  margin={{ top: 20, right: 80, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => String(value).slice(5)}
                    minTickGap={24}
                  />
                  <YAxis width={40} unit="대" />
                  <ChartTooltip
                    cursor={<ChartCrosshair />}
                    isAnimationActive={false}
                    content={<ChartTooltipContent />}
                  />
                  {(['cumulativeInstalls', 'activeDevices'] as const).map(
                    (key) => (
                      <Line
                        key={key}
                        dataKey={key}
                        type={
                          key === 'cumulativeInstalls' ? 'stepAfter' : 'linear'
                        }
                        stroke={`var(--color-${key})`}
                        strokeWidth={2}
                        strokeDasharray={
                          key === 'activeDevices' ? '6 3' : undefined
                        }
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}>
                        <LabelList
                          dataKey={(day: PlayInstalls['daily'][number]) =>
                            day.date === data.asOf && day[key] !== null
                              ? `${key === 'cumulativeInstalls' ? '누적' : '활성'} ${day[key].toLocaleString('ko-KR')}대`
                              : null
                          }
                          position="right"
                          dy={key === 'cumulativeInstalls' ? -8 : 12}
                          fill="var(--foreground)"
                          fontSize={11}
                        />
                      </Line>
                    ),
                  )}
                  <ChartLegend
                    itemSorter={null}
                    content={<ChartLegendContent />}
                  />
                </LineChart>
              </ChartContainer>
            </div>
            <div>
              <h3 className="text-sm font-medium">
                일별 기기 설치 수와 앱 삭제 수
              </h3>
              <ChartContainer
                config={config}
                className="mt-3 h-64 w-full"
                aria-label="일별 기기 설치 수와 앱 삭제 수">
                <BarChart
                  accessibilityLayer
                  data={data.daily.map((day) => ({
                    ...day,
                    uninstalls: -day.uninstalls,
                  }))}
                  stackOffset="sign">
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => String(value).slice(5)}
                    minTickGap={24}
                  />
                  <YAxis
                    width={40}
                    tickFormatter={(value) =>
                      Math.abs(Number(value)).toLocaleString('ko-KR')
                    }
                    unit="대"
                  />
                  <ReferenceLine y={0} stroke="var(--foreground)" />
                  <ChartTooltip
                    isAnimationActive={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <span>
                            {config[name as keyof typeof config]?.label}{' '}
                            {Math.abs(Number(value)).toLocaleString('ko-KR')}대
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar
                    dataKey="installs"
                    stackId="daily"
                    fill="var(--primary)"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="uninstalls"
                    stackId="daily"
                    fill="var(--muted-foreground)"
                    isAnimationActive={false}
                  />
                  <ChartLegend
                    itemSorter={null}
                    content={<ChartLegendContent />}
                  />
                </BarChart>
              </ChartContainer>
            </div>
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                전체 수치 표
              </summary>
              <div className="mt-3 max-h-64 overflow-auto">
                <DataTable
                  headers={[
                    '날짜 (Play)',
                    '일별 기기 설치 수',
                    '일별 앱 삭제 수',
                    'Android 누적 기기 설치 수',
                    '활성 기기 수',
                  ]}
                  empty={!data.daily.length}>
                  {data.daily.map((day) => (
                    <tr key={day.date}>
                      <td>{day.date}</td>
                      {(
                        [
                          'installs',
                          'uninstalls',
                          'cumulativeInstalls',
                          'activeDevices',
                        ] as const
                      ).map((key) => (
                        <td key={key}>
                          {day[key] === null ? (
                            '보고서 값 없음'
                          ) : (
                            <NumberValue value={day[key]} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </DataTable>
              </div>
            </details>
          </div>
        </Card>
      ) : null}
    </>
  );
}
