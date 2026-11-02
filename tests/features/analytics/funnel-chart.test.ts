// @vitest-environment jsdom
import {
  createElement,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { FunnelChart } from '@/features/analytics/metric-ui';

type Row = Record<string, unknown>;

type Formatter = (
  value: number,
  name: string,
  item: { payload: Row },
) => ReactNode;

const plot = vi.hoisted(() => ({
  rows: [] as Row[],
  bars: [] as Row[],
  gap: undefined as unknown,
  tooltip: undefined as unknown,
  label: {} as Row,
}));

vi.mock('recharts', () => {
  const Box = ({ children }: PropsWithChildren) =>
    createElement('div', null, children);

  return {
    Line: Box,
    LineChart: Box,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    BarChart: ({
      children,
      data,
      barGap,
    }: PropsWithChildren<{ data: Row[]; barGap?: number }>) => {
      plot.rows = data;
      plot.gap = barGap;

      return createElement('div', null, children);
    },
    Bar: ({ children, ...props }: PropsWithChildren<Row>) => {
      plot.bars.push(props);

      return createElement('div', null, children);
    },
    LabelList: ({
      dataKey,
      position,
      offset,
    }: {
      dataKey: (row: Row) => string;
      position: string;
      offset: number;
    }) => {
      plot.label = { bar: plot.bars.at(-1)?.dataKey, position, offset };

      return createElement(
        'div',
        { 'data-testid': 'funnel-labels' },
        plot.rows.map((row, i) =>
          createElement('span', { key: i }, dataKey(row)),
        ),
      );
    },
  };
});
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: PropsWithChildren) =>
    createElement('div', null, children),
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
  plot.tooltip = undefined;
});
afterEach(cleanup);

const draw = (values: number[]) =>
  render(
    createElement(FunnelChart, {
      steps: values.map((users, i) => ({ event: `step_${i}`, users })),
    }),
  );

it('첫 단계에는 수만 표시하고 다음 단계부터 두 비율과 앞 단계 배경을 표시한다', () => {
  draw([100, 40, 10]);
  expect(screen.getByTestId('funnel-labels').textContent).toBe(
    '100명40명, 첫 단계 대비 40.0%, 앞 단계 대비 40.0%10명, 첫 단계 대비 10.0%, 앞 단계 대비 25.0%',
  );

  const background = plot.bars.find(
    (bar) => bar.dataKey === 'backgroundUsers',
  )!;

  expect(background.fill).toBe('var(--primary)');
  expect(background.fillOpacity).toBe(0.18);
  expect(background.tooltipType).toBe('none');
  expect(plot.gap).toBe(-24);
  expect(plot.label).toEqual({
    bar: 'backgroundUsers',
    position: 'right',
    offset: 8,
  });
  expect(plot.bars.map((bar) => bar.dataKey)).toEqual([
    'backgroundUsers',
    'users',
  ]);
  expect(plot.bars[1].fillOpacity).toBe(1);
  expect(plot.rows.map((row) => row.backgroundUsers)).toEqual([100, 100, 40]);

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
  ).toEqual(['', '']);
  expect(
    [...rows[2].querySelectorAll('td')]
      .slice(2)
      .map((node) => node.textContent),
  ).toEqual(['10.0%', '25.0%']);

  const format = (plot.tooltip as ReactElement<{ formatter: Formatter }>).props
    .formatter;

  expect(format(40, '사용자 수', { payload: plot.rows[1] })).toBe(
    '40명, 첫 단계 대비 40.0%, 앞 단계 대비 40.0%',
  );
  expect(format(100, '사용자 수', { payload: plot.rows[0] })).toBe('100명');
});
it('앞 단계가 0이면 그 비율만 계산할 수 없음이고 100% 초과도 유지한다', () => {
  draw([100, 0, 150]);

  const row = screen.getAllByRole('row')[3];

  expect(within(row).getByText('150.0%')).toBeTruthy();
  expect(within(row).getByText('계산할 수 없음')).toBeTruthy();
  expect(plot.rows[2].backgroundUsers).toBe(150);
});
it('첫 단계 0은 이벤트 수신 없음이며 막대와 두 비율을 만들지 않는다', () => {
  draw([0, 20]);
  expect(screen.getByRole('status').textContent).toBe('이벤트 수신 없음');
  expect(plot.bars).toHaveLength(0);
  expect(screen.queryByRole('table')).toBeNull();
});

it('앞 단계보다 사용자가 많으면 100% 초과를 줄이지 않고 표시한다', () => {
  draw([100, 140, 180]);
  expect(screen.getByTestId('funnel-labels').textContent).toContain(
    '140명, 첫 단계 대비 140.0%, 앞 단계 대비 140.0%',
  );
  expect(screen.getByTestId('funnel-labels').textContent).toContain(
    '180명, 첫 단계 대비 180.0%, 앞 단계 대비 128.6%',
  );
  expect(plot.rows.map((row) => row.backgroundUsers)).toEqual([100, 140, 180]);
  expect(plot.label).toEqual({
    bar: 'backgroundUsers',
    position: 'right',
    offset: 8,
  });
});
