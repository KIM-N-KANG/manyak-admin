import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  customInstance,
  FetchError,
  resolveApiProxyUrl,
} from '@/api/mutator/custom-instance';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BFF mutator', () => {
  it.each([
    ['/admin/users', '/api/admin/users'],
    ['admin/users?page=2', '/api/admin/users?page=2'],
    ['/api/admin/users', '/api/admin/users'],
    ['/api?limit=1', '/api?limit=1'],
    ['https://backend.example/admin/users?page=2', '/api/admin/users?page=2'],
  ])('서버를 직접 호출하지 않도록 %s를 %s로 변환한다', (input, expected) => {
    expect(resolveApiProxyUrl(input)).toBe(expected);
  });

  it('동일 출처 쿠키와 취소 신호를 전달하고 응답 메타데이터를 보존한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"id":1}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const signal = new AbortController().signal;

    vi.stubGlobal('fetch', fetchMock);

    const result = await customInstance<{
      data: { id: number };
      status: number;
      headers: Headers;
    }>('/admin/users', { signal });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users',
      expect.objectContaining({ credentials: 'same-origin', signal }),
    );
    expect(result.data).toEqual({ id: 1 });
    expect(result.status).toBe(200);
    expect(result.headers.get('Content-Type')).toBe('application/json');
  });

  it('204 응답은 빈 데이터로 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(
      customInstance('/admin/users/1', { method: 'DELETE' }),
    ).resolves.toMatchObject({ status: 204, data: undefined });
  });

  it('실패 응답의 상태와 본문을 에러에 담는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"code":"UNAUTHORIZED"}', { status: 401 }),
        ),
    );

    const error = await customInstance('/admin/users').catch(
      (value: unknown) => value,
    );

    expect(error).toBeInstanceOf(FetchError);
    expect(error).toMatchObject({
      status: 401,
      data: { code: 'UNAUTHORIZED' },
    });
  });
});

it('만료 401은 로그인으로 이동하면서 오류 채널을 유지한다', async () => {
  const replace = vi.fn();

  vi.stubGlobal('window', { location: { pathname: '/dashboard', replace } });
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(Response.json({ code: 'EXPIRED' }, { status: 401 })),
  );
  await expect(customInstance('/api/members')).rejects.toMatchObject({
    status: 401,
  });
  expect(replace).toHaveBeenCalledWith('/login');
});
