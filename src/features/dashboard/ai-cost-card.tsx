'use client';

import { NumberValue, QueryState } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import {
  costPerTurn,
  dailyCost,
  useAiCost,
} from '@/features/analytics/ai-cost';
import { DefinitionText } from '@/features/analytics/metric-definition';
import { overviewAiCostDefinition } from '@/features/analytics/metric-definitions-data';

import { OverviewCard } from './overview-card';
import { trendSeries } from './overview-sparkline';

export function AiCostCard({
  query,
  previous,
  days,
}: {
  query: string;
  previous?: { from: string; to: string };
  days: number;
}) {
  const current = useAiCost(query);
  const prior = useAiCost(
    previous ? `from=${previous.from}&to=${previous.to}` : '',
    !!previous,
  );
  const data = current.isError ? undefined : current.data;
  const old = prior.isError ? undefined : prior.data;
  const waiting = (data?.pendingDates?.length ?? 0) > 0;
  const comparisonStatus =
    waiting || prior.isPending || (old?.pendingDates?.length ?? 0) > 0
      ? '준비 중'
      : (old?.expiredDates?.length ?? 0) > 0
        ? '비교할 이전 값 없음'
        : prior.isError
          ? '불러오기 실패'
          : undefined;
  const detail = data?.totals ? `턴당 원가 ${costPerTurn(data)}` : undefined;

  const params = new URLSearchParams(query);
  const range = { from: params.get('from')!, to: params.get('to')! };

  return (
    <OverviewCard
      title="AI 비용"
      trend={
        data
          ? trendSeries(
              data.daily.map((day) => ({
                date: day.date,
                value: dailyCost(day.byFeature),
              })),
              range,
              data.pendingDates,
            )
          : undefined
      }
      href="/analytics/ops?tab=ai-cost"
      loading={current.isPending ? 'data' : undefined}
      help={
        <HelpTooltip label="AI 비용 집계 안내">
          <DefinitionText index={overviewAiCostDefinition} />
        </HelpTooltip>
      }
      value={
        current.isError ? (
          <div className="relative z-10 text-sm font-normal whitespace-normal">
            <QueryState
              variant="inline"
              pending={false}
              error={current.error}
              retry={current.refetch}
              source="langfuse"
            />
          </div>
        ) : waiting || !data?.totals ? (
          '준비 중'
        ) : (
          <>
            <NumberValue value={Math.round(data.totals.costKrw)} />
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              원
            </span>
          </>
        )
      }
      comparison={{
        value: data?.totals?.costKrw,
        previous: old?.totals?.costKrw,
        days,
        status: current.isError ? '불러오기 실패' : comparisonStatus,
      }}
      detail={detail}
      detailTitle={detail}
    />
  );
}
