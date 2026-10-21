import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import { forwardAdminRequest, isSameOrigin } from '@/api/admin-upstream';
import { GET as upstreamRoute } from '@/app/api/admin-upstream/[...path]/route';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import {
  readSession,
  sessionCookie,
  setSession,
} from '@/features/auth/session';
import { proxy } from '@/proxy';

const origin = 'https://admin.manyak.app';
const token = 'server-admin-access-token';

function cookie() {
  const response = new NextResponse();

  setSession(response, { accessToken: token, nickname: '운영자' }, 7200);

  return `${sessionCookie}=${response.cookies.get(sessionCookie)!.value}`;
}

function request(path: string, options: RequestInit = {}, signedIn = false) {
  const headers = new Headers(options.headers);

  if (signedIn) headers.set('Cookie', cookie());

  return new NextRequest(`${origin}${path}`, {
    ...options,
    headers,
    signal: options.signal ?? undefined,
  });
}

function loginRequest(body: unknown = { idToken: 'google-proof' }) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Manyak-Request-Id': 'login_123',
    },
    body: JSON.stringify(body),
  });
}

const success = {
  accessToken: token,
  expiresIn: 7200,
  tokenType: 'Bearer',
  admin: {
    nickname: '운영자',
    memberId: 'member',
    status: 'ACTIVE',
    isAdmin: true,
    createdAt: '2026-10-21T00:00:00Z',
  },
};

beforeEach(() => {
  vi.stubEnv('API_BASE_URL', 'https://server.example');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('로그인 BFF', () => {
  it('생성 Zod로 검증한 증명을 서버에 보내고 토큰은 호스트 전용 쿠키에만 저장한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(success, {
        headers: { 'X-Manyak-Request-Id': 'server_id' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await login(loginRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ admin: { nickname: '운영자' } });

    const saved = response.headers.get('Set-Cookie')!;

    expect(saved).toContain('HttpOnly');
    expect(saved).toContain('Secure');
    expect(saved).toContain('SameSite=lax');
    expect(saved).toContain('Path=/');
    expect(saved).toContain('Max-Age=7200');
    expect(saved).not.toMatch(/Domain=/i);
    expect(readSession(response.cookies.get(sessionCookie)?.value)).toEqual({
      accessToken: token,
      nickname: '운영자',
    });
    expect(response.headers.get('X-Manyak-Request-Id')).toBe('server_id');

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe('https://server.example/api/v1/admin/auth/login/google');
    expect(options.headers.get('Authorization')).toBeNull();
    expect(options.headers.get('X-Manyak-Request-Id')).toBe('login_123');
    expect(JSON.parse(options.body)).toEqual({ idToken: 'google-proof' });
    expect(options.redirect).toBe('manual');
    expect(options.cache).toBe('no-store');
  });
  it.each([401, 403, 500, 503])(
    '서버의 %s와 오류 본문을 보존한다',
    async (status) => {
      const error = { status, code: 'ERROR', message: '동일한 실패 안내' };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(Response.json(error, { status })),
      );

      const response = await login(loginRequest());

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual(error);

      if (status === 401 || status === 403)
        expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
    },
  );
  it.each([{}, { idToken: '' }, { idToken: 7 }, null])(
    '잘못된 본문 %j는 서버 호출 없이 400이다',
    async (body) => {
      const fetchMock = vi.fn();

      vi.stubGlobal('fetch', fetchMock);
      expect((await login(loginRequest(body))).status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it('다른 출처의 로그인과 쿼리는 서버로 전달하지 않는다', async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    const crossSite = loginRequest();

    crossSite.headers.set('Origin', 'https://other.example');
    expect((await login(crossSite)).status).toBe(403);
    expect(
      (
        await login(
          request('/api/auth/login?unexpected=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"idToken":"proof"}',
          }),
        )
      ).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    { ...success, expiresIn: 0 },
    { ...success, expiresIn: 7201 },
    { ...success, accessToken: '' },
    { ...success, admin: null },
  ])('잘못된 서버 성공 응답은 쿠키를 발급하지 않는다', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));

    const response = await login(loginRequest());

    expect(response.status).toBe(502);
    expect(response.cookies.get(sessionCookie)).toBeUndefined();
  });
  it('연결 오류와 미설정을 구분한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect((await login(loginRequest())).status).toBe(502);
    vi.stubEnv('API_BASE_URL', '');
    expect((await login(loginRequest())).status).toBe(503);
  });
  it('서버 만료 시간을 쿠키에 적용한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ ...success, expiresIn: 300 })),
    );
    expect((await login(loginRequest())).headers.get('Set-Cookie')).toContain(
      'Max-Age=300',
    );
  });
  it('로그아웃은 서버 호출 없이 같은 속성으로 쿠키를 삭제한다', async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    const response = await logout(
      request(
        '/api/auth/logout',
        { method: 'POST', headers: { Origin: origin } },
        true,
      ),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('보호와 서버 연동', () => {
  it('익명 페이지는 로그인으로, API는 401로 보낸다', () => {
    expect(proxy(request('/members')).headers.get('Location')).toBe(
      `${origin}/login`,
    );
    expect(proxy(request('/api/members')).status).toBe(401);
    expect(proxy(request('/login')).headers.get('x-middleware-next')).toBe('1');
    expect(
      proxy(request('/api/auth/login', { method: 'POST' })).headers.get(
        'x-middleware-next',
      ),
    ).toBe('1');

    const broken = request('/dashboard', {
      headers: { Cookie: `${sessionCookie}=not-a-session` },
    });

    expect(proxy(broken).headers.get('Location')).toBe(`${origin}/login`);
  });
  it('fixture가 기본이며 server만 공통 route handler로 rewrite한다', () => {
    vi.stubEnv('ADMIN_DATA_SOURCE', '');
    expect(
      proxy(request('/api/members?q=test', {}, true)).headers.get(
        'x-middleware-next',
      ),
    ).toBe('1');
    vi.stubEnv('ADMIN_DATA_SOURCE', 'server');
    expect(
      proxy(request('/api/members?q=test', {}, true)).headers.get(
        'x-middleware-rewrite',
      ),
    ).toBe(`${origin}/api/admin-upstream/members?q=test`);
    expect(
      proxy(request('/api/admin-upstream/members', {}, true)).headers.get(
        'x-middleware-next',
      ),
    ).toBe('1');
  });
  it('cross-site 변경 요청은 로그인 상태와 무관하게 거부한다', () => {
    expect(
      proxy(
        request(
          '/api/notices',
          { method: 'POST', headers: { Origin: 'https://evil.example' } },
          true,
        ),
      ).status,
    ).toBe(403);
  });
  it('쿠키의 토큰과 요청 ID만 서버에 전달하고 응답·오류는 보존한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { items: [] },
          { headers: { 'X-Manyak-Request-Id': 'returned' } },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const response = await forwardAdminRequest(
      request(
        '/api/members',
        {
          headers: {
            'X-Manyak-Request-Id': 'trace_1',
            Authorization: 'Bearer malicious',
            Cookie: 'other=secret',
          },
        },
        true,
      ),
      '/api/v1/admin/members',
    );

    expect(await response.json()).toEqual({ items: [] });

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe('https://server.example/api/v1/admin/members');
    expect(options.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(options.headers.get('Cookie')).toBeNull();
    expect(options.headers.get('X-Manyak-Request-Id')).toBe('trace_1');
    expect(response.headers.get('X-Manyak-Request-Id')).toBe('returned');
  });
  it('서버 401은 원문 오류와 함께 쿠키를 삭제한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ code: 'EXPIRED' }, { status: 401 })),
    );

    const response = await forwardAdminRequest(
      request('/api/members', {}, true),
      '/api/v1/admin/members',
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: 'EXPIRED' });
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
  it('미인증 업스트림 요청은 서버에 도달하지 않는다', async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    expect(
      (
        await forwardAdminRequest(
          request('/api/members'),
          '/api/v1/admin/members',
        )
      ).status,
    ).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('잘못된 요청 ID를 새 유효 ID로 대체한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({}));

    vi.stubGlobal('fetch', fetchMock);
    await forwardAdminRequest(
      request(
        '/api/members',
        { headers: { 'X-Manyak-Request-Id': 'bad id' } },
        true,
      ),
      '/api/v1/admin/members',
    );
    expect(
      fetchMock.mock.calls[0][1].headers.get('X-Manyak-Request-Id'),
    ).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });
  it('서버 미구현은 fixture로 후퇴하지 않고 503이다', async () => {
    vi.stubEnv('ADMIN_DATA_SOURCE', 'server');

    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    const response = await upstreamRoute(
      request('/api/admin-upstream/members', {}, true),
      { params: Promise.resolve({ path: ['members'] }) },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: '서버 미구현' });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
    expect(
      (
        await upstreamRoute(request('/api/admin-upstream/members', {}, true), {
          params: Promise.resolve({ path: ['members'] }),
        })
      ).status,
    ).toBe(404);
  });
  it('서버 경로 매핑과 미지원 경로를 고정한다', () => {
    expect(findAdminEndpoint('/payments/abc', 'GET')?.serverPath).toBe(
      '/api/v1/admin/payments/orders/abc',
    );
    expect(
      findAdminEndpoint('/notifications/templates/key', 'PUT')?.serverPath,
    ).toBe('/api/v1/admin/push/templates/key');
    expect(findAdminEndpoint('/evil', 'POST')).toBeNull();
    expect(
      findAdminEndpoint('/originals/catalog', 'GET')?.serverPath,
    ).toBeNull();
  });
});

it('Next 내부 URL이 localhost여도 외부 Host와 프로토콜로 동일 출처를 검증한다', () => {
  const req = new NextRequest('http://localhost:3000/api/auth/login', {
    headers: {
      Host: 'admin.manyak.app',
      'X-Forwarded-Proto': 'https',
      Origin: 'https://admin.manyak.app',
    },
  });

  expect(isSameOrigin(req)).toBe(true);
  req.headers.set('Origin', 'https://evil.example');
  expect(isSameOrigin(req)).toBe(false);
});
