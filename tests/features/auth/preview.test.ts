import { NextRequest } from 'next/server';
import { afterEach, expect, it, vi } from 'vitest';

import { forwardAdminRequest } from '@/api/admin-upstream';
import AdminLayout from '@/app/(admin)/layout';
import { GET as internal } from '@/app/api/admin-upstream/[...path]/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as members } from '@/app/api/members/route';
import { isFixturePreview } from '@/features/auth/preview';
import { proxy } from '@/proxy';

const auth = vi.hoisted(() => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

vi.mock('next/headers', () => ({ cookies: auth.cookies }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  auth.cookies.mockClear();
});

it.each([
  ['preview', 'fixture', true],
  ['production', 'fixture', false],
  ['preview', 'server', false],
  ['production', 'server', false],
  [undefined, 'fixture', true],
  ['preview', '', true],
  [undefined, '', true],
  ['production', '', false],
  [undefined, 'server', false],
  ['preview', 'unknown', false],
] as const)(
  '%s + %s의 미리보기 허용은 %s이다',
  async (environment, source, allowed) => {
    vi.stubEnv('VERCEL_ENV', environment);
    vi.stubEnv('ADMIN_DATA_SOURCE', source);
    expect(isFixturePreview()).toBe(allowed);

    const page = proxy(new NextRequest('https://admin.example/members'));
    const api = proxy(new NextRequest('https://admin.example/api/members'));
    const entry = proxy(new NextRequest('https://admin.example/login'));

    if (allowed) {
      expect(page.headers.get('x-middleware-next')).toBe('1');
      expect(api.headers.get('x-middleware-next')).toBe('1');
      expect(entry.headers.get('Location')).toBe(
        'https://admin.example/dashboard',
      );

      const layout = await AdminLayout({ children: '본문' });

      expect(layout.props.nickname).toBe('미리보기');
      expect(layout.props.preview).toBe(true);
      expect(auth.cookies).not.toHaveBeenCalled();
    } else {
      expect(page.headers.get('Location')).toBe('https://admin.example/login');
      expect(api.status).toBe(401);
      expect(entry.headers.get('x-middleware-next')).toBe('1');
      await expect(AdminLayout({ children: '본문' })).rejects.toThrow(
        'redirect:/login',
      );
    }
  },
);

it('우회 상태에서는 로그인·조회·공통 업스트림이 세션 없이도 실제 서버를 전혀 부르지 않는다', async () => {
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  vi.stubEnv('API_BASE_URL', 'https://real-server.example');

  const fetchMock = vi.fn();

  vi.stubGlobal('fetch', fetchMock);

  const loggedIn = await login(
    new NextRequest('https://admin.example/api/auth/login', { method: 'POST' }),
  );

  expect(await loggedIn.json()).toEqual({ admin: { nickname: '미리보기' } });
  expect(loggedIn.headers.get('Set-Cookie')).toBeNull();

  const response = members(new Request('https://admin.example/api/members'));

  expect(response.status).toBe(200);
  expect((await response.json()).items.length).toBeGreaterThan(0);

  const request = new NextRequest('https://admin.example/api/members');

  expect(
    (await forwardAdminRequest(request, '/api/v1/admin/members')).status,
  ).toBe(503);
  expect(
    (
      await forwardAdminRequest(
        request,
        '/api/v1/admin/auth/login/google',
        '{}',
        false,
      )
    ).status,
  ).toBe(503);
  expect(
    (
      await internal(
        new NextRequest('https://admin.example/api/admin-upstream/members'),
        { params: Promise.resolve({ path: ['members'] }) },
      )
    ).status,
  ).toBe(404);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('로컬 프로덕션 빌드도 VERCEL_ENV가 없고 fixture이면 미리보기를 허용한다', () => {
  vi.stubEnv('VERCEL_ENV', undefined);
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  vi.stubEnv('NODE_ENV', 'production');
  expect(isFixturePreview()).toBe(true);
});
