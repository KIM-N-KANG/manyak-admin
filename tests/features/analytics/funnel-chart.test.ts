// @vitest-environment jsdom
import {
  createElement,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { FunnelChart } from '@/features/analytics/metric-ui';

type Row = Record<string, unknown>;

type LabelProps = {
  index: number;
  viewBox: { x: number; y: number; width: number; height: number };
};

type Formatter = (
  value: number,
  name: string,
  item: { payload: Row },
) => ReactNode;

const plot = vi.hoisted(() => ({
  rows: [] as Row[],
  bars: [] as Row[],
  layout: undefined as unknown,
  x: {} as Row,
  y: {} as Row,
  tooltip: undefined as unknown,
  container: {} as Row,
}));

vi.mock('recharts', () => {
  const Box = ({ children }: PropsWithChildren) =>
    createElement('g', null, children);

  return {
    Rectangle: () => null,
    Line: Box,
    LineChart: Box,
    CartesianGrid: () => null,
    XAxis: (props: Row) => {
      plot.x = props;

      return null;
    },
    YAxis: (props: Row) => {
      plot.y = props;

      return null;
    },
    BarChart: ({
      children,
      data,
      layout,
    }: PropsWithChildren<{ data: Row[]; layout?: string }>) => {
      plot.rows = data;
      plot.layout = layout;

      return createElement('svg', null, children);
    },
    Bar: ({ children, ...props }: PropsWithChildren<Row>) => {
      plot.bars.push(props);

      return createElement('g', null, children);
    },
    LabelList: ({
      content,
      dataKey,
    }: {
      content?: (props: LabelProps) => ReactNode;
      dataKey?: (row: Row) => string;
    }) =>
      createElement(
        'g',
        null,
        plot.rows.map((row, index) =>
          createElement(
            'g',
            { key: index },
            content
              ? content({
                  index,
                  viewBox: {
                    x: 30 + index * 160,
                    y: 60 + index * 40,
                    width: 80,
                    height: 100,
                  },
                })
              : createElement('text', null, dataKey?.(row)),
          ),
        ),
      ),
  };
});
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children, ...props }: PropsWithChildren<Row>) => {
    plot.container = props;

    return createElement('div', null, children);
  },
  ChartTooltip: ({ content }: { content: unknown }) => {
    plot.tooltip = content;

    return null;
  },
  ChartTooltipContent: () => null,
  ChartLegend: () => null,
  ChartLegendContent: () => null,
}));
beforeEach(() => {
  plot.rows = [];
  plot.bars = [];
});
afterEach(cleanup);

const draw = (values: number[]) =>
  render(
    createElement(FunnelChart, {
      steps: values.map((users, i) => ({ event: `step_${i}`, users })),
    }),
  );

it('100→40→10을 세로 비율 막대와 빗금 감소분, 두 줄 상자로 표시한다', () => {
  const { container } = draw([100, 40, 10]);

  expect(plot.layout).not.toBe('vertical');
  expect(plot.x.dataKey).toBe('label');
  expect(plot.y.type).toBe('number');
  expect(plot.y.domain).toEqual([0, 100]);
  expect(plot.y.ticks).toEqual([0, 25, 50, 75, 100]);
  expect(plot.rows.map((row) => row.rate)).toEqual([100, 40, 10]);
  expect(plot.rows.map((row) => row.dropoff)).toEqual([0, 60, 30]);

  const pattern = container.querySelector('pattern')!;

  expect(pattern).toBeTruthy();
  expect(pattern.querySelector('line,path')).toBeTruthy();

  const pale = plot.bars.find((bar) => bar.dataKey === 'dropoff')!;

  expect(pale.fill).toBe(`url(#${pattern.id})`);
  expect(pale.tooltipType).toBe('none');
  expect(pale.stackId).toBe(
    plot.bars.find((bar) => bar.dataKey === 'rate')!.stackId,
  );

  const labels = container.querySelectorAll('[data-funnel-label]');

  expect(labels).toHaveLength(3);
  expect(
    [...labels].map((node) =>
      [...node.querySelectorAll('text')].map((text) => text.textContent),
    ),
  ).toEqual([
    ['100.0%', '100명'],
    ['40.0%', '40명'],
    ['10.0%', '10명'],
  ]);
  expect(labels[0].querySelector('rect')!.getAttribute('fill')).toBe(
    'var(--card)',
  );
  expect(labels[0].querySelector('rect')!.getAttribute('stroke')).toBe(
    'var(--border)',
  );
  expect(labels[0].querySelector('text')!.getAttribute('font-weight')).toBe(
    '600',
  );
  expect(labels[0].querySelectorAll('text')[0].getAttribute('font-size')).toBe(
    '12',
  );
  expect(labels[0].querySelectorAll('text')[1].getAttribute('font-size')).toBe(
    '11',
  );
  expect(
    Number(labels[0].querySelector('rect')!.getAttribute('height')),
  ).toBeGreaterThanOrEqual(44);

  const rows = screen.getByRole('table').querySelectorAll('tbody tr');

  expect(
    screen.getAllByRole('columnheader').map((node) => node.textContent),
  ).toEqual([
    '단계',
    '사용자 수',
    '첫 단계 대비 전환율',
    '앞 단계 대비 전환율',
  ]);
  expect(
    [...rows[0].querySelectorAll('td')]
      .slice(2)
      .map((node) => node.textContent),
  ).toEqual(['100.0%', '']);
  expect(
    [...rows[2].querySelectorAll('td')]
      .slice(2)
      .map((node) => node.textContent),
  ).toEqual(['10.0%', '25.0%']);

  const format = (plot.tooltip as ReactElement<{ formatter: Formatter }>).props
    .formatter;

  expect(format(10, '비율', { payload: plot.rows[2] })).toBe(
    '10명, 첫 단계 대비 10.0%, 앞 단계 대비 25.0%',
  );
  expect(format(100, '비율', { payload: plot.rows[0] })).toBe(
    '100명, 첫 단계 대비 100.0%',
  );
});
it('증가 단계는 빗금 없이 100%를 넘겨 축을 확장한다', () => {
  draw([100, 140, 180]);
  expect(plot.y.domain).toEqual([0, 180]);
  expect(plot.rows.map((row) => row.dropoff)).toEqual([0, 0, 0]);
  expect(plot.rows.map((row) => row.rate)).toEqual([100, 140, 180]);
});
it('중간 0의 높이는 0이고 앞 단계 분모 0만 계산할 수 없음이다', () => {
  draw([100, 40, 0, 0]);
  expect(plot.rows.map((row) => row.rate)).toEqual([100, 40, 0, 0]);

  const cells = screen
    .getByRole('table')
    .querySelectorAll('tbody tr')[3]
    .querySelectorAll('td');

  expect(cells[2].textContent).toBe('0.0%');
  expect(cells[3].textContent).toBe('계산할 수 없음');
});
it('첫 단계 0은 이벤트 수신 없음이며 막대와 표가 없다', () => {
  draw([0, 20]);
  expect(screen.getByRole('status').textContent).toBe('이벤트 수신 없음');
  expect(plot.bars).toHaveLength(0);
  expect(screen.queryByRole('table')).toBeNull();
});
it('여러 퍼널의 빗금 ID가 겹치지 않고 긴 단계 이름은 줄을 나눈다', () => {
  const view = draw([100, 80, 60, 40, 20, 10, 5]);

  draw([100, 70, 60, 40, 20, 10, 5]);

  const ids = [...document.querySelectorAll('pattern')].map((node) => node.id);

  expect(new Set(ids).size).toBe(2);
  expect(
    (plot.container.style as { height: number }).height,
  ).toBeGreaterThanOrEqual(360);

  expect((plot.container.style as { minWidth: number }).minWidth).toBe(840);

  const tick = plot.x.tick as (props: {
    x: number;
    y: number;
    payload: { value: string };
  }) => ReactElement;
  const label = '턴 1 채팅 메시지 전송';

  view.rerender(
    createElement(
      'svg',
      null,
      tick({ x: 10, y: 10, payload: { value: label } }),
    ),
  );

  const texts = view.container.querySelectorAll('tspan');

  expect(texts.length).toBeGreaterThan(1);
  expect([...texts].map((node) => node.textContent)).toEqual([
    '턴 1 채팅',
    '메시지 전송',
  ]);
  expect(view.container.querySelector('title')!.textContent).toBe(label);
  expect(view.container.querySelector('text')!.getAttribute('font-size')).toBe(
    '11',
  );

  const long = '턴 1 채팅 메시지 전송 마지막 단계 아주 긴 추가 설명 이름';

  view.rerender(
    createElement(
      'svg',
      null,
      tick({ x: 10, y: 10, payload: { value: long } }),
    ),
  );

  const clipped = view.container.querySelectorAll('tspan');

  expect(clipped).toHaveLength(2);
  expect(clipped[1].textContent!.endsWith('…')).toBe(true);
  expect(view.container.querySelector('title')!.textContent).toBe(long);
});
