// @vitest-environment jsdom
import { createElement } from 'react';

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { ConversionContent } from '@/features/analytics/tab-content';
import { metricFixture } from '@/fixtures/metrics';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(cleanup);

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
  ).toEqual(['1턴', '5턴', '10턴', '20턴']);
});
