// @vitest-environment jsdom
import { createElement } from 'react';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { modelLabel, sourceHelp } from '@/features/analytics/config';
import {
  InfraServices,
  InfraStorage,
} from '@/features/analytics/infra/content';
import { featureColor, modelSeries } from '@/features/analytics/series';
import {
  ConversionContent,
  QualityContent,
} from '@/features/analytics/tab-content';
import { TURN_THRESHOLDS } from '@/features/analytics/turn-thresholds';
import type {
  AiCostResponse,
  TurnReachResponse,
} from '@/features/analytics/types';
import { getStoryDetail, stories } from '@/fixtures/entities';
import { infraMetricsFixture } from '@/fixtures/infra';
import { metricFixture } from '@/fixtures/metrics';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const aiCostStates = [
  { pending: true, expired: false, label: '준비 중', imageCost: 96 },
  { pending: true, expired: true, label: '준비 중', imageCost: 0 },
  { pending: false, expired: true, label: '보관 기간 지남', imageCost: 96 },
  { pending: false, expired: false, label: '비용 기록 없음', imageCost: 96 },
];

function renderAiCost({
  pending,
  expired,
  imageCost,
}: (typeof aiCostStates)[number]) {
  const date = '2026-10-21';
  const data = metricFixture(
    '/quality/ai-cost',
    new URLSearchParams(`from=${date}&to=2026-10-22`),
  ) as AiCostResponse;

  data.pendingDates = pending ? [date] : [];
  data.expiredDates = expired ? [date] : [];
  data.daily.forEach((day) => {
    day.byFeature = [
      {
        feature: 'chat_response',
        model: null,
        calls: 2,
        inputTokens: 0,
        outputTokens: 0,
        callsWithoutTokens: 0,
        costKrw: null,
      },
      {
        feature: 'chat_image',
        model: null,
        calls: 2,
        inputTokens: 0,
        outputTokens: 0,
        callsWithoutTokens: 0,
        costKrw: imageCost,
      },
    ];
  });
  render(createElement(QualityContent, { tab: 'ai-cost', data }));

  return screen.getByLabelText('기능별 일별 비용 추이');
}

it.each(aiCostStates)(
  'AI 비용 수치 표는 pending=$pending, expired=$expired의 null을 $label으로 표시하고 이미지 $imageCost원을 유지한다',
  (state) => {
    const chart = renderAiCost(state);
    const tables = screen.getAllByText('전체 수치 표');
    const chartRows = within(tables[0].closest('details')!)
      .getAllByRole('row')
      .slice(1);

    expect(cellTexts(chartRows[0])).toEqual([
      '2026-10-21',
      state.label,
      state.label,
      `${state.imageCost}원`,
      state.label,
      state.label,
    ]);

    const allRows = within(tables[1].closest('details')!).getAllByRole('row');

    expect(cellTexts(allRows[1])).toEqual([
      '기능별 일별 비용',
      '2026-10-21',
      'AI 응답 생성',
      state.label,
    ]);
    expect(cellTexts(allRows[3])).toEqual([
      '기능별 일별 비용',
      '2026-10-21',
      '실시간 이미지 생성',
      `${state.imageCost}원`,
    ]);

    const costRows = within(screen.getByText('비용 표').closest('details')!)
      .getAllByRole('row')
      .slice(1);

    expect(cellTexts(costRows[0])[6]).toBe(state.label);
    expect(cellTexts(costRows[1])[6]).toBe(`${state.imageCost}원`);
    expect(chart.querySelectorAll('.recharts-line-curve[d]')).toHaveLength(1);
  },
);

it.each(aiCostStates)(
  'AI 비용 툴팁은 pending=$pending, expired=$expired의 null을 $label으로 표시하고 이미지 $imageCost원을 유지한다',
  async (state) => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('recharts-wrapper')
          ? new DOMRect(0, 0, 320, 200)
          : new DOMRect(0, 0, 0, 0);
      },
    );

    const chart = renderAiCost(state);

    fireEvent.mouseMove(chart.querySelector('.recharts-wrapper')!, {
      clientX: 64,
      clientY: 90,
    });
    await waitFor(() => {
      const tooltip = chart.querySelector('.recharts-tooltip-wrapper')!;

      expect(tooltip.textContent).toContain('2026-10-21');
      expect(tooltip.textContent).toContain(`AI 응답 생성 ${state.label}`);
      expect(tooltip.textContent).toContain(
        `실시간 이미지 생성 ${state.imageCost}원`,
      );
    });
  },
);

it('턴 도달률 차트의 X축에 기준 턴 라벨을 그대로 표시한다', () => {
  const { container } = render(
    createElement(ConversionContent, {
      tab: 'turn-reach',
      data: metricFixture(
        '/conversion/turn-reach',
        new URLSearchParams('from=2026-10-17&to=2026-10-23'),
      ),
    }),
  );

  expect(
    Array.from(
      container.querySelectorAll(
        '.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value',
      ),
    ).map((node) => node.textContent),
  ).toEqual(TURN_THRESHOLDS.map((turn) => `${turn}턴`));
  expect(screen.getByRole('heading', { name: 'N턴 이상 도달률' })).toBeTruthy();
  expect(screen.getByLabelText('도달률 범례').textContent).toContain(
    '게스트 (채팅 없음)',
  );
  expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(2);

  const table = screen.getByText('전체 수치 표').closest('details')!;

  expect(within(table).getAllByRole('row')).toHaveLength(14);
  expect(within(table).getAllByRole('columnheader')).toHaveLength(7);

  const ticks = Array.from(
    container.querySelectorAll(
      '.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value',
    ),
  );
  const positions = ticks.map((t) => Number(t.getAttribute('x')));

  for (let i = 2; i < positions.length; i++)
    expect(positions[i] - positions[i - 1]).toBeCloseTo(
      positions[1] - positions[0],
    );
});

it('채팅이 있는 전체·게스트·회원은 세 선이며 실제 0 도달률도 그린다', () => {
  const data = metricFixture(
    '/conversion/turn-reach',
    new URLSearchParams('from=2026-10-21&to=2026-10-21'),
  ) as TurnReachResponse;

  data.segments[1].chats = 1;

  const { container } = render(
    createElement(ConversionContent, { tab: 'turn-reach', data }),
  );

  expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(3);
  expect(screen.getByLabelText('도달률 범례').textContent).not.toContain(
    '채팅 없음',
  );
});

it('모델별 턴 비중은 턴 합계로 나누고 오로라·라이트 색은 단독일 때도 고정한다', () => {
  render(
    createElement(QualityContent, {
      tab: 'chat-options',
      data: metricFixture(
        '/quality/chat-options',
        new URLSearchParams('from=2026-10-21&to=2026-10-21'),
      ),
    }),
  );

  const summary = screen
    .getByRole('heading', { name: '턴 수' })
    .closest('section')!;

  expect(summary.textContent).toContain('6턴');

  const table = screen.getByText('모델별 비중').closest('details')!;

  expect(within(table).getByText('33.3%')).toBeTruthy();
  expect(within(table).getByText('66.7%')).toBeTruthy();
  expect(screen.getByRole('heading', { name: '모델별 턴 수' })).toBeTruthy();
  expect(modelSeries(['LITE'])[0].color).toBe('var(--chart-2)');
  expect(
    modelSeries(['NOVA', 'LITE', 'AURORA']).map((s) => [s.key, s.color]),
  ).toEqual([
    ['AURORA', 'var(--chart-1)'],
    ['LITE', 'var(--chart-2)'],
    ['NOVA', 'var(--muted-foreground)'],
  ]);
  expect(featureColor('storyline_generation')).toBe('var(--chart-4)');
  expect(featureColor('chat_image')).toBe('var(--chart-3)');
});

it('인프라는 평균 선과 평균 / 최대 표·툴팁을 표시하며 최대를 별도 선으로 그리지 않는다', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      return this.classList.contains('recharts-wrapper')
        ? new DOMRect(0, 0, 320, 200)
        : new DOMRect(0, 0, 0, 0);
    },
  );

  const data = infraMetricsFixture('2026-10-21', '2026-10-21');
  const at = data.ecs!.services[0].cpu[0].at;

  for (const service of data.ecs!.services) {
    service.cpu = [
      { at, value: 7.4 },
      { at: new Date(Date.parse(at) + 300000).toISOString(), value: 7.4 },
    ];
    service.cpuMax = [
      { at, value: 21 },
      { at: new Date(Date.parse(at) + 300000).toISOString(), value: 21 },
    ];
  }

  const { container } = render(createElement(InfraServices, { data }));
  const chart = screen.getByLabelText('CPU 사용률');

  expect(chart.querySelectorAll('.recharts-line-curve')).toHaveLength(3);
  expect(
    Array.from(chart.querySelectorAll('.recharts-line-curve')).map((path) =>
      path.getAttribute('stroke'),
    ),
  ).toEqual([
    'var(--color-service_0)',
    'var(--color-service_1)',
    'var(--color-service_2)',
  ]);

  const card = chart.closest('section')!;

  expect(within(card).getByText('서버 (평균 / 최대)')).toBeTruthy();
  expect(within(card).getAllByText('7.4% / 21.0%')).toHaveLength(6);
  fireEvent.mouseMove(chart.querySelector('.recharts-wrapper')!, {
    clientX: 60,
    clientY: 90,
  });
  await waitFor(() =>
    expect(
      chart.querySelector('.recharts-tooltip-wrapper')?.textContent,
    ).toContain('서버 7.4% / 21.0%'),
  );
  expect(
    container.querySelectorAll('.recharts-line-curve').length,
  ).toBeGreaterThan(3);
});

it('스토리 상세 fixture는 12개 기준 턴을 응답하고 Redis는 노드 번호 순서로 표시한다', () => {
  expect(
    getStoryDetail(stories[0].storyId)!.retention.map((point) => point.turn),
  ).toEqual([...TURN_THRESHOLDS]);

  const data = infraMetricsFixture('2026-10-21', '2026-10-21', true);

  data.redis!.nodes.reverse();

  const { container } = render(createElement(InfraStorage, { data }));
  const redis = screen.getByRole('region', { name: 'Redis' });
  const chart = within(redis).getByLabelText('CPU 사용률');

  expect(chart.textContent!.indexOf('노드 001')).toBeLessThan(
    chart.textContent!.indexOf('노드 002'),
  );
  expect(
    container.querySelectorAll('.recharts-line-curve').length,
  ).toBeGreaterThan(0);
});

const optionData = (
  chats: number,
  byModel: Record<string, number>,
  turnsByModel: Record<string, number>,
) => ({
  asOf: '2026-10-21T03:00:00Z',
  from: '2026-10-21',
  to: '2026-10-21',
  daily: [{ date: '2026-10-21', chats, withPersona: 0, byModel, turnsByModel }],
});
const shareRows = () =>
  within(screen.getByText('모델별 비중').closest('details')!)
    .getAllByRole('row')
    .slice(1);
const cellTexts = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

it('채팅 0과 턴 4는 독립적으로 채팅 없음과 라이트 턴 비중 100%를 표시한다', () => {
  render(
    createElement(QualityContent, {
      tab: 'chat-options',
      data: optionData(0, {}, { LITE: 4 }),
    }),
  );
  expect(cellTexts(shareRows()[0])).toEqual([
    '라이트',
    '0개',
    '채팅 없음',
    '4턴',
    '100.0%',
  ]);
});

it('채팅 3과 턴 없음은 독립적으로 오로라 채팅 비중 100%와 턴 없음을 표시한다', () => {
  render(
    createElement(QualityContent, {
      tab: 'chat-options',
      data: optionData(3, { AURORA: 3 }, {}),
    }),
  );
  expect(cellTexts(shareRows()[0])).toEqual([
    '오로라',
    '3개',
    '100.0%',
    '0턴',
    '턴 없음',
  ]);
});

it('비중 행은 모델 합집합이며 기록 전은 마지막 행이고 없는 쪽은 0이다', () => {
  render(
    createElement(QualityContent, {
      tab: 'chat-options',
      data: optionData(3, { AURORA: 3 }, { LITE: 4, UNRECORDED: 2 }),
    }),
  );
  expect(shareRows().map(cellTexts)).toEqual([
    ['오로라', '3개', '100.0%', '0턴', '0.0%'],
    ['라이트', '0개', '0.0%', '4턴', '66.7%'],
    ['기록 전', '0개', '0.0%', '2턴', '33.3%'],
  ]);
  expect(modelLabel('UNRECORDED')).toBe('기록 전');
  expect(
    modelSeries(['UNRECORDED', 'ZETA', 'LITE', 'AURORA', 'BETA']).map(
      (s) => s.key,
    ),
  ).toEqual(['AURORA', 'LITE', 'BETA', 'ZETA', 'UNRECORDED']);
});

it('NOVA·BETA 등장·소멸은 모델별 색을 바꾸지 않고 미등록·기록 전은 회색이다', () => {
  for (const codes of [
    ['AURORA', 'NOVA'],
    ['AURORA', 'BETA', 'NOVA'],
    ['LITE'],
    ['UNRECORDED', 'NOVA'],
  ]) {
    for (const s of modelSeries(codes)) {
      expect(s.color).toBe(
        s.key === 'AURORA'
          ? 'var(--chart-1)'
          : s.key === 'LITE'
            ? 'var(--chart-2)'
            : 'var(--muted-foreground)',
      );
    }
  }
});

it('모델 집계 기준은 포커스 도움말의 목록이며 출처 안내는 정본 전체 문구다', async () => {
  render(
    createElement(QualityContent, {
      tab: 'chat-options',
      data: optionData(3, { AURORA: 3 }, { LITE: 4 }),
    }),
  );

  const button = screen.getByRole('button', {
    name: '채팅 옵션 모델 집계 기준',
  });

  act(() => button.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
  expect(
    within(tooltip)
      .getAllByRole('listitem')
      .map((li) => li.textContent),
  ).toEqual([
    '채팅 수는 채팅에 지금 선택된 모델 기준이고 턴 수는 그 턴을 실제로 만든 모델 기준입니다.',
    '게스트 턴은 라이트로 셉니다.',
  ]);
  expect(sourceHelp['chat-options']).toBe(
    '서버 DB 출처 지표입니다. 팀 계정은 제외합니다. 채팅 수는 삭제되지 않은 채팅을 생성일 기준으로 집계하며 채팅에 지금 선택된 모델로 셉니다. 턴 수는 AI 응답이 생성된 날 기준이고 그 턴을 만든 모델로 세며 삭제된 채팅의 턴도 셉니다. 모델 기록 전의 턴은 "기록 전"으로 셉니다.',
  );
});

it('동일한 도달률과 근접한 인프라 평균은 공용 끝 라벨로 간격을 확보하고 최대는 표에 유지한다', () => {
  const data = metricFixture(
    '/conversion/turn-reach',
    new URLSearchParams('from=2026-10-21&to=2026-10-21'),
  ) as TurnReachResponse;

  for (const segment of data.segments) {
    segment.chats = 100;

    for (const point of segment.reached) point.rate = 0.5;
  }

  const view = render(
    createElement(ConversionContent, { tab: 'turn-reach', data }),
  );
  const labelYs = Array.from(
    view.container.querySelectorAll('.chart-end-labels text'),
  )
    .map((node) => Number(node.getAttribute('y')))
    .toSorted((a, b) => a - b);

  expect(labelYs).toHaveLength(3);
  expect(labelYs[1] - labelYs[0]).toBeGreaterThanOrEqual(18);
  expect(labelYs[2] - labelYs[1]).toBeGreaterThanOrEqual(18);
  expect(view.container.querySelector('.recharts-label-list')).toBeNull();
  view.unmount();

  const infra = infraMetricsFixture('2026-10-21', '2026-10-21');

  for (const service of infra.ecs!.services) {
    service.cpu = service.cpu.map((point) => ({ ...point, value: 7.4 }));
    service.cpuMax = service.cpuMax.map((point) => ({ ...point, value: 21 }));
  }

  const { container } = render(createElement(InfraServices, { data: infra }));
  const chart = screen.getByLabelText('CPU 사용률');
  const ys = Array.from(chart.querySelectorAll('.chart-end-labels text'))
    .map((node) => Number(node.getAttribute('y')))
    .toSorted((a, b) => a - b);

  expect(ys).toHaveLength(3);
  expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(18);
  expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(18);
  expect(container.textContent).toContain('7.4% / 21.0%');
});
