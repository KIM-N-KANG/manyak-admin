import { NextRequest } from 'next/server';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it, vi } from 'vitest';

import { forwardAdminRequest } from '@/api/admin-upstream';
import { getAdminDataMode } from '@/features/auth/preview';
import { sessionCookie } from '@/features/auth/session';
import * as originals from '@/fixtures/originals';
import { proxy } from '@/proxy';

const routeRoot = fileURLToPath(
  new URL('../../../src/app/api/', import.meta.url),
);

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? routeFiles(join(directory, entry.name))
      : entry.name === 'route.ts'
        ? [join(directory, entry.name)]
        : [],
  );
}

const routes = Object.fromEntries(
  await Promise.all(
    routeFiles(routeRoot).map(
      async (file) =>
        [
          file.replace(routeRoot, '/src/app/api/'),
          (await import(file)) as Record<string, unknown>,
        ] as const,
    ),
  ),
);
const handlers = Object.entries(routes)
  .filter(
    ([file]) => !file.includes('/auth/') && !file.includes('/admin-upstream/'),
  )
  .flatMap(([file, exports]) =>
    Object.entries(exports)
      .filter(([method]) =>
        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method),
      )
      .map(([method, handler]) => ({
        file,
        method,
        handler: handler as (
          request: NextRequest,
          context: { params: Promise<{ id: string; key: string }> },
        ) => Response | Promise<Response>,
      })),
  );
const cookie = `${sessionCookie}=${Buffer.from(JSON.stringify({ accessToken: 'forged-token', nickname: '위조 관리자' })).toString('base64url')}`;

function request(path: string, method = 'GET') {
  return new NextRequest(`https://admin.example${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(method === 'GET' ? {} : { body: '{"reason":"test"}' }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it.each(['fixture', '', undefined, 'invalid'])(
  '운영 %s 모드에서 위조 쿠키도 proxy가 데이터 접근 전에 거부한다',
  async (source) => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('ADMIN_DATA_SOURCE', source);
    expect(getAdminDataMode().requiresServerConfiguration).toBe(true);

    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = proxy(request('/api/members', method));

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ message: '서버 연결 설정 필요' });
      expect(response.headers.get('x-middleware-next')).toBeNull();
      expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    }

    expect(
      proxy(request('/api/auth/login', 'POST')).headers.get(
        'x-middleware-next',
      ),
    ).toBe('1');
  },
);

it.each(handlers)(
  '운영 fixture의 $method $file은 fixture 핸들러를 실행하지 않는다',
  async ({ file, method, handler }) => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');

    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    const reads = vi.spyOn(originals, 'listOriginals');
    const writes = vi.spyOn(originals, 'saveOriginal');
    const req = request(
      file.replace('/src/app', '').replace('/route.ts', ''),
      method,
    );
    const body = vi
      .spyOn(req, 'json')
      .mockRejectedValue(new Error('요청 본문을 읽어서는 안 된다.'));
    const response = await handler(req, {
      params: Promise.resolve({
        id: '00000001-0000-4000-8000-000000000001',
        key: 'ATTENDANCE_REMINDER',
      }),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: '서버 연결 설정 필요' });
    expect(reads).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
    expect(body).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

it('운영 server는 위조 토큰을 서버가 401로 거부하며 원문 오류와 쿠키 삭제를 전달한다', async () => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'server');
  vi.stubEnv('API_BASE_URL', 'https://server.example');

  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰' },
        { status: 401 },
      ),
    );

  vi.stubGlobal('fetch', fetchMock);

  const req = request('/api/members');

  expect(proxy(req).headers.get('x-middleware-rewrite')).toContain(
    '/api/admin-upstream/members',
  );

  const response = await forwardAdminRequest(req, '/api/v1/admin/members');

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({
    code: 'UNAUTHORIZED',
    message: '유효하지 않은 토큰',
  });
  expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe(
    'Bearer forged-token',
  );
});
