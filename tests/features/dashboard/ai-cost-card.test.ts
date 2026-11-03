// @vitest-environment jsdom
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { costPerTurn } from '@/features/analytics/ai-cost';
import { MarginArea } from '@/features/analytics/new-metrics-content';
import type { AiCostResponse } from '@/features/analytics/types';
import { AiCostCard } from '@/features/dashboard/ai-cost-card';
import { metricFixture } from '@/fixtures/metrics';

let client: QueryClient;
let pending = false;
let previousPending = false;
let expired = false;
let fail = false;
let unit: number | null = 3.5;
const selected = 'from=2026-10-02&to=2026-10-31';
const previous = { from: '2026-09-02', to: '2026-10-01' };
const requests: string[] = [];
const card = () => within(screen.getByRole('region', { name: 'AI 비용' }));

function draw() {
  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AiCostCard, { query: selected, previous, days: 30 }),
    ),
  );
}

const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  pending = previousPending = expired = fail = false;
  unit = 3.5;
  requests.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requests.push(url);

      const prev = url.includes('from=2026-09-02');

      if (fail && !prev)
        return Response.json({ message: '실패' }, { status: 503 });

      return Response.json({
        ...metricFixture(
          '/quality/ai-cost',
          new URLSearchParams(
            prev ? 'from=2026-09-02&to=2026-10-01' : selected,
          ),
        ),
        pendingDates: (prev ? previousPending : pending) ? ['2026-10-01'] : [],
        expiredDates: prev && expired ? ['2026-09-02'] : [],
        totals: { costKrw: prev ? 100000 : 120000, costPerTurnKrw: unit },
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('두 기간의 비용·증감·턴당 원가·링크를 표시하고 마진과 60초 캐시를 공유한다', async () => {
  const view = draw();

  await tick(600);
  expect(
    card().getByText('120,000').closest('[data-overview-slot="value"]')!
      .textContent,
  ).toBe('120,000원');
  expect(card().getByText('▲ 20.0%')).toBeTruthy();
  expect(card().getByText('이전 30일 대비')).toBeTruthy();
  expect(card().getByText('턴당 원가 3.5원')).toBeTruthy();
  expect(card().getByRole('link').getAttribute('href')).toBe(
    '/analytics/ops?tab=ai-cost',
  );
  expect(requests).toEqual([
    `/api/quality/ai-cost?${selected}`,
    '/api/quality/ai-cost?from=2026-09-02&to=2026-10-01',
  ]);
  view.unmount();
  client.setQueryData([`/api/dashboard/charts?${selected}`], {
    totals: { revenue: 200000 },
  });
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MarginArea, { query: selected }),
    ),
  );
  await tick(100);
  expect(
    requests.filter((url) => url.startsWith('/api/quality/ai-cost?')),
  ).toHaveLength(2);
});
it.each([false, true])(
  '선택/직전 pending을 독립 재요청하고 완료 후 멈춘다: %s',
  async (prev) => {
    pending = !prev;
    previousPending = prev;
    draw();
    await tick(600);
    expect(card().getAllByText('준비 중')).toHaveLength(prev ? 1 : 2);

    if (prev)
      expect(
        card().getByText('120,000').closest('[data-overview-slot="value"]')!
          .textContent,
      ).toBe('120,000원');

    pending = previousPending = false;
    await tick(60000);
    expect(
      requests.filter((url) =>
        url.includes(prev ? 'from=2026-09-02' : 'from=2026-10-02'),
      ),
    ).toHaveLength(2);
    expect(requests).toHaveLength(3);
    await tick(120000);
    expect(requests).toHaveLength(3);
  },
);
it('직전 비용 만료는 큰 숫자를 유지하고 비교할 이전 값 없음을 표시한다', async () => {
  expired = true;
  draw();
  await tick(600);
  expect(
    card().getByText('120,000').closest('[data-overview-slot="value"]')!
      .textContent,
  ).toBe('120,000원');
  expect(card().getByText('비교할 이전 값 없음')).toBeTruthy();
});
it('선택 비용 503은 카드 안에 오류와 재시도를 표시한다', async () => {
  fail = true;
  draw();
  await tick(600);
  expect(card().getByRole('alert')).toBeTruthy();
  fail = false;
  fireEvent.click(card().getByRole('button', { name: '다시 시도' }));
  await tick(600);
  expect(
    card().getByText('120,000').closest('[data-overview-slot="value"]')!
      .textContent,
  ).toBe('120,000원');
});
it('턴당 원가 null 처리는 운영 AI 비용과 같은 함수를 쓴다', async () => {
  unit = null;
  draw();
  await tick(600);
  expect(card().getByText(/턴당 원가 (계산할 수 없음|호출 없음)/)).toBeTruthy();
});

it('직전 기간이 아직 없으면 조회하지 않고 차트가 준 범위가 생긴 뒤 조회한다', async () => {
  const view = render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AiCostCard, { query: selected, days: 30 }),
    ),
  );

  await tick(600);
  expect(requests).toEqual([`/api/quality/ai-cost?${selected}`]);
  view.rerender(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AiCostCard, { query: selected, previous, days: 30 }),
    ),
  );
  await tick(600);
  expect(requests).toHaveLength(2);
  expect(requests[1]).toBe(
    '/api/quality/ai-cost?from=2026-09-02&to=2026-10-01',
  );
});
it('공유 원가 함수는 null일 때 응답 호출 유무에 따라 같은 문구를 반환한다', () => {
  const data = metricFixture(
    '/quality/ai-cost',
    new URLSearchParams(selected),
  ) as AiCostResponse;

  data.totals.costPerTurnKrw = null;

  const response = data.daily
    .flatMap((day) => day.byFeature)
    .find((item) => item.feature === 'chat_response')!;

  response.calls = 1;
  expect(costPerTurn(data)).toBe('계산할 수 없음');
  data.daily = [];
  expect(costPerTurn(data)).toBe('호출 없음');
});

it('AI 비용은 원 단위로 반올림하고 숫자와 작은 단위를 분리한다', async () => {
  client.setQueryData([`/api/quality/ai-cost?${selected}`], {
    ...metricFixture('/quality/ai-cost', new URLSearchParams(selected)),
    pendingDates: [],
    totals: { costKrw: 106155.88, costPerTurnKrw: 3.5 },
  });
  draw();
  await tick(600);

  const number = card().getByText('106,156');

  expect(number.classList.contains('font-mono')).toBe(true);
  expect(number.parentElement!.textContent).toBe('106,156원');
  expect(card().getByText('원').classList.contains('text-xs')).toBe(true);
  expect(card().getByText('턴당 원가 3.5원')).toBeTruthy();
});

it('선택 비용의 준비 중 날짜는 실제 미니 선에서도 끊는다', async () => {
  const data = metricFixture(
    '/quality/ai-cost',
    new URLSearchParams(selected),
  ) as AiCostResponse;

  data.pendingDates = ['2026-10-15'];
  data.daily = data.daily.map((day) => ({
    ...day,
    byFeature: day.byFeature.map((item) => ({ ...item, costKrw: 1 })),
  }));
  client.setQueryData([`/api/quality/ai-cost?${selected}`], data);
  draw();
  await tick(600);

  const node = screen
    .getByRole('region', { name: 'AI 비용' })
    .querySelector('[data-overview-trend] path')!;

  expect(node.getAttribute('d')!.match(/M/g)).toHaveLength(2);
  expect(card().getAllByText('준비 중')).toHaveLength(2);
});
