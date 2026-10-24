// @vitest-environment jsdom
import { createElement } from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { QueryState } from '@/components/admin/data-ui';
import {
  ChartsSkeleton,
  DetailSkeleton,
  LoadingStatus,
  PageSkeleton,
  TableSkeleton,
} from '@/components/admin/loading-ui';
import { Skeleton } from '@/components/ui/skeleton';

afterEach(cleanup);

it('스켈레톤은 장식으로 숨기고 reduced-motion에서 펄스 애니메이션을 끈다', () => {
  const { container } = render(
    createElement(Skeleton, { className: 'h-9 w-24' }),
  );
  const node = container.querySelector('[data-slot="skeleton"]')!;

  expect(node.getAttribute('aria-hidden')).toBe('true');
  expect(node.className).toContain('animate-pulse');
  expect(node.className).toContain('[animation-duration:1.5s]');
  expect(node.className).toContain('motion-reduce:animate-none');
});

it('로딩 영역은 busy·status와 숨겨진 기존 문구를 한 번 제공하며 탭 대상이 없다', () => {
  render(
    createElement(
      LoadingStatus,
      null,
      createElement(TableSkeleton, { columns: 4, rows: 10 }),
    ),
  );

  const status = screen.getByRole('status');

  expect(status.getAttribute('aria-busy')).toBe('true');
  expect(screen.getByText('데이터를 불러오는 중입니다…').className).toBe(
    'sr-only',
  );
  expect(
    status.querySelectorAll('a, button, input, select, textarea, [tabindex]'),
  ).toHaveLength(0);

  const rows = status.querySelector(
    '[data-loading-layout="table"] > div > div',
  )!;

  expect(rows.children).toHaveLength(11);
  expect(rows.children[0].children).toHaveLength(4);
});

it('개요 Suspense 골격은 10개 요약과 8개 작은 차트를 같은 반응형 칸에 예약한다', () => {
  const { container } = render(
    createElement(PageSkeleton, {
      layout: 'overview',
    }),
  );

  expect(
    container.querySelectorAll('[data-loading-layout="summary-card"]'),
  ).toHaveLength(10);

  const grid = container.querySelector(
    '[data-loading-layout="summary-card"]',
  )!.parentElement!;

  expect(grid.className).toContain('xl:grid-cols-5');
  expect(grid.className).toContain('items-stretch');

  const charts = container.querySelector('[data-loading-layout="charts"]')!;

  expect(charts.children).toHaveLength(8);
  expect(charts.className).toContain('xl:grid-cols-4');
  expect(charts.querySelectorAll('.h-\\[200px\\]')).toHaveLength(8);
});

it('검수 상세 골격은 실제 1:2 열을 유지하고 차트는 고정된 콘텐츠 높이를 사용한다', () => {
  const view = render(
    createElement(
      LoadingStatus,
      null,
      createElement(DetailSkeleton, { split: true }),
    ),
  );

  expect(
    view.container.querySelector('[data-loading-layout="detail"] > div')!
      .className,
  ).toContain('xl:grid-cols-[1fr_2fr]');
  view.rerender(
    createElement(LoadingStatus, null, createElement(ChartsSkeleton)),
  );
  expect(view.container.querySelectorAll('.h-72')).toHaveLength(2);
});

it('인라인 로딩은 새 박스 없이 숫자 자리를 채우고 완료되면 busy와 골격을 없앤다', () => {
  const retry = vi.fn();
  const view = render(
    createElement(QueryState, {
      pending: true,
      error: null,
      retry,
      variant: 'inline',
    }),
  );

  expect(
    screen.getByRole('status').querySelector('[data-slot="card"]'),
  ).toBeNull();
  expect(
    screen.getByRole('status').querySelectorAll('[data-slot="skeleton"]'),
  ).toHaveLength(4);
  view.rerender(
    createElement(QueryState, {
      pending: false,
      error: null,
      retry,
      variant: 'inline',
    }),
  );
  expect(screen.queryByRole('status')).toBeNull();
  expect(view.container.querySelector('[aria-busy="true"]')).toBeNull();
  expect(view.container.querySelector('[data-slot="skeleton"]')).toBeNull();
});
