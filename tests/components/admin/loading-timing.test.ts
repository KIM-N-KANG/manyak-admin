// @vitest-environment jsdom
import { createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { QueryState } from '@/components/admin/data-ui';
import {
  LoadingBoundary,
  RouteLoadingMarker,
} from '@/components/admin/loading-boundary';
import { useApi } from '@/features/shared/use-api';

let client: QueryClient;
let delay = 0;
let value = '첫 값';
let fail = false;

function Probe() {
  const query = useApi<{ value: string }>('/api/probe');

  return createElement(
    'div',
    null,
    createElement(QueryState, {
      pending: query.isPending,
      error: query.error,
      retry: query.refetch,
    }),
    query.data ? createElement('p', null, query.data.value) : null,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false },
    },
  });
  delay = 1000;
  value = '첫 값';
  fail = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve) =>
          setTimeout(
            () =>
              resolve(
                Response.json(fail ? { message: '실패' } : { value }, {
                  status: fail ? 500 : 200,
                }),
              ),
            delay,
          ),
        ),
    ),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const tick = async (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

function draw() {
  return render(
    createElement(QueryClientProvider, { client }, createElement(Probe)),
  );
}

const visible = () =>
  screen
    .getByRole('status')
    .lastElementChild?.getAttribute('style')
    ?.includes('visibility: visible');

it('1초 응답은 199ms까지 숨기고 200ms부터 실제 데이터까지 표시한다', async () => {
  draw();
  await tick(199);
  expect(visible()).toBe(false);
  await tick(1);
  expect(visible()).toBe(true);
  await tick(802);
  expect(screen.getByText('첫 값')).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
});
it('100ms 응답은 스켈레톤을 표시하지 않는다', async () => {
  delay = 100;
  draw();
  await tick(102);
  expect(screen.getByText('첫 값')).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
});
it('250ms 응답은 200ms부터 500ms까지 스켈레톤을 유지한다', async () => {
  delay = 250;
  draw();
  await tick(200);
  expect(visible()).toBe(true);
  await tick(299);
  expect(visible()).toBe(true);
  expect(screen.queryByText('첫 값')).toBeNull();
  await tick(3);
  expect(screen.getByText('첫 값')).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
});
it('초기 오류도 최소 표시 시간이 지난 뒤 오류 상자로 전환한다', async () => {
  delay = 250;
  fail = true;
  draw();
  await tick(499);
  expect(visible()).toBe(true);
  expect(screen.queryByRole('alert')).toBeNull();
  await tick(3);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
});
it('같은 요청의 갱신은 이전 값을 유지하며 스켈레톤이나 최소 시간 지연을 추가하지 않는다', async () => {
  delay = 100;
  draw();
  await tick(102);
  value = '새 값';
  delay = 250;
  await act(async () => {
    void client.invalidateQueries({ queryKey: ['/api/probe'] });
  });
  await tick(200);
  expect(screen.getByText('첫 값')).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
  await tick(52);
  expect(screen.getByText('새 값')).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
});
it('Suspense도 200ms 지연과 최소 300ms 표시 뒤 실제 자식을 공개한다', async () => {
  let ready = false;
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = () => {
      ready = true;
      done();
    };
  });

  function Content() {
    if (!ready) throw promise;

    return createElement('p', null, '완료');
  }

  render(
    createElement(
      LoadingBoundary,
      { fallback: createElement('p', null, '자리') },
      createElement(Content),
    ),
  );
  await tick(199);
  expect(screen.getByText('자리').parentElement!.style.visibility).toBe(
    'hidden',
  );
  await tick(1);
  expect(screen.getByText('자리').parentElement!.style.visibility).toBe(
    'visible',
  );
  await tick(50);
  await act(async () => resolve());
  await tick(249);
  expect(screen.getByText('자리')).toBeTruthy();
  expect(screen.getByText('완료').closest('[hidden]')).toBeTruthy();
  await tick(2);
  expect(screen.queryByText('자리')).toBeNull();
  expect(screen.getByText('완료').closest('[hidden]')).toBeNull();
});

it.each([100, 250])(
  'Next 루트 로딩 마커도 %ims 응답의 지연·최소 표시를 지속 경계에서 처리한다',
  async (responseMs) => {
    const drawRoute = (pending: boolean) =>
      createElement(
        LoadingBoundary,
        { fallback: createElement('p', null, '루트 자리') },
        pending
          ? createElement(RouteLoadingMarker)
          : createElement('p', null, '루트 완료'),
      );
    const view = render(drawRoute(true));

    await tick(responseMs);
    view.rerender(drawRoute(false));
    await tick(1);

    if (responseMs === 100) {
      expect(screen.queryByText('루트 자리')).toBeNull();
      expect(screen.getByText('루트 완료').closest('[hidden]')).toBeNull();
    } else {
      expect(
        screen.getByText('루트 자리').parentElement!.style.visibility,
      ).toBe('visible');
      expect(screen.getByText('루트 완료').closest('[hidden]')).toBeTruthy();
      await tick(250);
      expect(screen.queryByText('루트 자리')).toBeNull();
      expect(screen.getByText('루트 완료').closest('[hidden]')).toBeNull();
    }
  },
);

it('서버에서 보인 루트 스켈레톤은 하이드레이션 직후에도 지연 없이 이어진다', async () => {
  const route = (pending: boolean) =>
    createElement(
      LoadingBoundary,
      { fallback: createElement('p', null, '서버 자리') },
      pending
        ? createElement(RouteLoadingMarker)
        : createElement('p', null, '서버 완료'),
    );
  const container = document.createElement('div');

  container.innerHTML = renderToString(route(true));
  document.body.append(container);
  expect(container.textContent).toContain('서버 자리');

  let root!: ReturnType<typeof hydrateRoot>;

  await act(async () => {
    root = hydrateRoot(container, route(true));
  });
  expect(screen.getByText('서버 자리').parentElement!.style.visibility).toBe(
    'visible',
  );
  await tick(1);
  await act(async () => root.render(route(false)));
  await tick(100);
  expect(screen.getByText('서버 자리')).toBeTruthy();
  await tick(201);
  expect(screen.queryByText('서버 자리')).toBeNull();
  expect(screen.getByText('서버 완료').closest('[hidden]')).toBeNull();
  await act(async () => root.unmount());
  container.remove();
});
