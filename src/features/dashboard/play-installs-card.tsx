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

import { FetchError } from '@/api/mutator/custom-instance';
import { DataTable, NumberValue } from '@/components/admin/data-ui';
import { Button } from '@/components/ui/button';
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
  cumulativeInstalls: { label: '누적 설치', color: 'var(--primary)' },
  activeDevices: { label: '활성 기기', color: 'var(--muted-foreground)' },
  installs: { label: '설치', color: 'var(--primary)' },
  uninstalls: { label: '삭제', color: 'var(--muted-foreground)' },
};

export function PlayInstallsCard() {
  const query = useApi<PlayInstalls>('/api/dashboard/play-installs');
  const data = query.data;
  const unavailable =
    query.error instanceof FetchError && query.error.status === 503;

  return (
    <section aria-labelledby="play-installs-heading" className="mb-8 min-w-0">
      <Card className="min-w-0">
        <h2 id="play-installs-heading" className="font-semibold">
          앱 설치(Android)
        </h2>
        {query.isError ? (
          <div role="status" className="mt-4">
            <p className="font-medium">
              {unavailable ? '설정 안 됨' : '설치 지표를 불러올 수 없음'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {unavailable
                ? 'Play 설치 지표 설정 또는 보고서 연결을 확인해 주세요.'
                : '잠시 후 다시 시도해 주세요.'}
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => void query.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : query.isPending ? (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            설치 지표를 불러오는 중입니다…
          </p>
        ) : data ? (
          <>
            <div className="mt-4 flex items-center gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">누적 설치</p>
                <p className="mt-1 text-3xl font-semibold">
                  <NumberValue value={data.totalInstalls} />
                  <span className="ml-1 text-sm font-normal">대</span>
                </p>
                <p className="mt-3 text-sm">
                  활성 기기 <NumberValue value={data.activeDevices} />대
                </p>
              </div>
              <ChartContainer
                config={config}
                className="h-20 w-28 shrink-0"
                aria-label="일별 앱 설치 작은 추이">
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
              기준 {data.asOf} · Play 기준 날짜(태평양 시간)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              보고서는 며칠 늦게 반영됩니다. 전체 기간 지표이며 페이지 기간
              선택과 무관합니다.
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-primary-text">
                설치·활성 기기 추이 보기
              </summary>
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium">누적 설치·활성 기기</h3>
                  <ChartContainer
                    config={config}
                    className="mt-3 h-64 w-full"
                    aria-label="누적 설치·활성 기기 추이">
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
                              key === 'cumulativeInstalls'
                                ? 'stepAfter'
                                : 'linear'
                            }
                            stroke={`var(--color-${key})`}
                            strokeWidth={2}
                            strokeDasharray={
                              key === 'activeDevices' ? '4 3' : undefined
                            }
                            dot={false}
                            activeDot={{ r: 4 }}
                            isAnimationActive={false}>
                            <LabelList
                              dataKey={(day: PlayInstalls['daily'][number]) =>
                                day.date === data.asOf
                                  ? `${key === 'cumulativeInstalls' ? '누적' : '활성'} ${day[key].toLocaleString('ko-KR')}`
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
                      <ChartLegend content={<ChartLegendContent />} />
                    </LineChart>
                  </ChartContainer>
                </div>
                <div>
                  <h3 className="text-sm font-medium">일별 설치·삭제</h3>
                  <ChartContainer
                    config={config}
                    className="mt-3 h-64 w-full"
                    aria-label="일별 설치·삭제">
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
                                {Math.abs(Number(value)).toLocaleString(
                                  'ko-KR',
                                )}
                                대
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
                      <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                  </ChartContainer>
                </div>
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    설치 일별 수치
                  </summary>
                  <div className="mt-3 max-h-64 overflow-auto">
                    <DataTable
                      headers={[
                        '날짜 (Play)',
                        '설치',
                        '삭제',
                        '누적 설치',
                        '활성 기기',
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
                              <NumberValue value={day[key]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </DataTable>
                  </div>
                </details>
              </div>
            </details>
          </>
        ) : null}
      </Card>
    </section>
  );
}
