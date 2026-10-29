import { createElement } from 'react';

import { DistributionCard } from '@/features/dashboard/distribution-card';
import type { DashboardCharts } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

/** 분포 카드의 차트와 표 회귀 검증을 위한 테스트 구성이다. 실제 화면 배치는 도메인 화면 테스트에서 검증한다. */
export function DistributionCards() {
  const response = useApi<DashboardCharts>('/api/dashboard/charts');
  const areas = [
    ['채팅 참여', ['genre-depth', 'turns', 'first-message']],
    ['채팅 소유자', ['started-as', 'member-chats']],
    ['콘텐츠', ['creation-mode', 'characters']],
    ['AI 품질', ['ai-latency', 'ai-success']],
  ] as const;

  return createElement(
    'div',
    null,
    areas.map(([label, ids]) =>
      createElement(
        'section',
        { key: label, 'aria-label': label },
        createElement('h2', null, label),
        createElement(
          'div',
          { className: 'grid gap-5 xl:grid-cols-2' },
          response.data?.distributions
            .filter((item) => (ids as readonly string[]).includes(item.chartId))
            .map((distribution) =>
              createElement(DistributionCard, {
                key: distribution.chartId,
                distribution,
              }),
            ),
        ),
      ),
    ),
  );
}
