// @vitest-environment jsdom
import {
  cloneElement,
  createElement,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { FunnelChart } from '@/features/analytics/metric-ui';

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: ReactNode }) =>
    cloneElement(children as ReactElement<{ width: number; height: number }>, {
      width: 900,
      height: 360,
    }),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
  ChartLegend: () => null,
  ChartLegendContent: () => null,
}));
afterEach(cleanup);
it('실제 Recharts가 0%를 포함한 세로 막대의 상자와 빗금 스택을 렌더한다', async () => {
  const { container } = render(
    createElement(FunnelChart, {
      steps: [100, 0, 40].map((users, i) => ({ event: `step_${i}`, users })),
    }),
  );

  await waitFor(() =>
    expect(container.querySelectorAll('[data-funnel-label]')).toHaveLength(3),
  );

  const labels = [...container.querySelectorAll('[data-funnel-label]')];

  expect(
    labels.map((node) =>
      [...node.querySelectorAll('text')].map((text) => text.textContent),
    ),
  ).toEqual([
    ['100.0%', '100명'],
    ['0.0%', '0명'],
    ['40.0%', '40명'],
  ]);

  for (const box of container.querySelectorAll('[data-funnel-label] rect')) {
    expect(Number.isFinite(Number(box.getAttribute('x')))).toBe(true);
    expect(Number.isFinite(Number(box.getAttribute('y')))).toBe(true);
  }

  const id = container.querySelector('pattern')!.id;

  expect(container.querySelector(`[fill="url(#${id})"]`)).toBeTruthy();
});
