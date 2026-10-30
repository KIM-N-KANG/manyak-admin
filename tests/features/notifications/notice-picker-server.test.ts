// @vitest-environment jsdom
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { NextRequest } from 'next/server';
import { afterEach, expect, it, vi } from 'vitest';

import { GET as handle } from '@/app/api/admin-upstream/[...path]/route';
import { sessionCookie } from '@/features/auth/session';
import { NoticePicker } from '@/features/notifications/notice-picker';
import type * as LoadingTiming from '@/features/shared/loading-timing';
import { proxy } from '@/proxy';

vi.mock('@/features/shared/loading-timing', async (importOriginal) => ({
  ...(await importOriginal<typeof LoadingTiming>()),
  finishInitialLoading: async () => {},
}));

let client: QueryClient;

afterEach(() => {
  cleanup();
  client?.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('서버 모드 공지 선택기는 빈 검색어를 생략하고 검색과 지우기도 생성 Zod를 통과한다', async () => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'server');
  vi.stubEnv('API_BASE_URL', 'https://upstream.example');
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const upstream: URL[] = [];
  const cookie = `${sessionCookie}=${Buffer.from(JSON.stringify({ accessToken: 'test-token', nickname: '테스트 관리자' })).toString('base64url')}`;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: RequestInit) => {
      if (url.startsWith('https://upstream.example')) {
        upstream.push(new URL(url));

        return Response.json({
          items: [],
          page: 1,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        });
      }

      const request = new NextRequest(`https://admin.example${url}`, {
        method: options?.method,
        body: options?.body,
        headers: { Cookie: cookie },
      });
      const rewrite = proxy(request).headers.get('x-middleware-rewrite');

      expect(rewrite).not.toBeNull();
      expect(new URL(rewrite!).pathname).toBe('/api/admin-upstream/notices');

      return handle(
        new NextRequest(rewrite!, { headers: { Cookie: cookie } }),
        { params: Promise.resolve({ path: ['notices'] }) },
      );
    }),
  );
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(NoticePicker, {
        notice: undefined,
        problem: '',
        pending: false,
        onRetry: vi.fn(),
        onChange: vi.fn(),
      }),
    ),
  );
  await waitFor(() =>
    expect(
      client.getQueryState(['/api/notices?status=PUBLISHED'])?.fetchStatus,
    ).toBe('idle'),
  );
  expect(
    client.getQueryState(['/api/notices?status=PUBLISHED'])?.error,
  ).toBeNull();
  await screen.findByText('게시된 공지가 없습니다.');
  expect(upstream[0].pathname).toBe('/api/v1/admin/notices');
  expect(upstream[0].searchParams.get('status')).toBe('PUBLISHED');
  expect(upstream[0].searchParams.has('q')).toBe(false);
  fireEvent.change(screen.getByLabelText('이동 대상 공지 검색'), {
    target: { value: '점검' },
  });
  await screen.findByText('검색 조건에 맞는 공지가 없습니다.');
  await waitFor(() =>
    expect(upstream.some((url) => url.searchParams.get('q') === '점검')).toBe(
      true,
    ),
  );
  fireEvent.change(screen.getByLabelText('이동 대상 공지 검색'), {
    target: { value: '' },
  });
  await screen.findByText('게시된 공지가 없습니다.');
  await waitFor(() => expect(upstream).toHaveLength(3));
  expect(upstream[2].searchParams.has('q')).toBe(false);
});
