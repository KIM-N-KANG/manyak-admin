// @vitest-environment node
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { expect, it, vi } from 'vitest';

import Loading from '@/app/loading';
import { LoadingBoundary } from '@/components/admin/loading-boundary';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));

it('서버 Suspense가 중단되면 하이드레이션 전 HTML에 보이는 대체 화면을 포함한다', () => {
  const pending = new Promise<void>(() => {});

  function Suspended(): never {
    throw pending;
  }

  const html = renderToStaticMarkup(
    createElement(
      LoadingBoundary,
      {
        fallback: createElement(
          'p',
          { 'data-static-fallback': true },
          '서버 대체 화면',
        ),
      },
      createElement(Suspended),
    ),
  );

  expect(html).toContain('data-static-fallback="true"');
  expect(html).toContain('서버 대체 화면');
  expect(html).toContain('aria-busy="true"');
  expect(html).not.toContain('visibility:hidden');
});
it('Next 루트 loading도 경계 Context 없이 서버에서 스켈레톤을 바로 출력한다', () => {
  const html = renderToStaticMarkup(createElement(Loading));

  expect(html).toContain('data-slot="skeleton"');
  expect(html).toContain('데이터를 불러오는 중입니다…');
  expect(html).toContain('aria-busy="true"');
  expect(html).not.toContain('visibility:hidden');
});
