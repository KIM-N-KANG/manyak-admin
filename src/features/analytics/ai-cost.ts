import { useApi } from '@/features/shared/use-api';

import { metricNumber } from './config';
import { analyticsRefetch } from './range';
import type { AiCostResponse } from './types';

export function useAiCost(query: string, enabled = true) {
  return useApi<AiCostResponse>(`/api/quality/ai-cost?${query}`, enabled, {
    staleTime: 60000,
    refetchInterval: analyticsRefetch,
  });
}

export function costPerTurn(data: AiCostResponse) {
  return data.totals.costPerTurnKrw === null
    ? data.daily.some((day) =>
        day.byFeature.some(
          (item) => item.feature === 'chat_response' && item.calls > 0,
        ),
      )
      ? '계산할 수 없음'
      : '호출 없음'
    : metricNumber(data.totals.costPerTurnKrw, '원');
}
