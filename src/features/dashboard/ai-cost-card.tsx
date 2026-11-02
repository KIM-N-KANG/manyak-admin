'use client';

import { QueryState } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { costPerTurn, useAiCost } from '@/features/analytics/ai-cost';
import { metricNumber } from '@/features/analytics/config';
import { DefinitionText } from '@/features/analytics/metric-definition';
import { overviewAiCostDefinition } from '@/features/analytics/metric-definitions-data';

import { OverviewCard } from './overview-card';

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

  return (
    <OverviewCard
      title="AI 비용"
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
          metricNumber(data.totals.costKrw, '원')
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
