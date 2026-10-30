import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import {
  Delete3Body,
  List8Response,
  Upsert2Body,
} from '@/api/generated/zod/admin';
import { GET as handle } from '@/app/api/admin-upstream/[...path]/route';
import { sessionCookie } from '@/features/auth/session';
import { proxy } from '@/proxy';

const base = 'https://admin.example';
const cookie = `${sessionCookie}=${Buffer.from(JSON.stringify({ accessToken: 'promotion-test-token', nickname: '테스트 관리자' })).toString('base64url')}`;
const promotion = {
  turnCost: 0,
  startsAt: '2026-10-31T01:00:00Z',
  endsAt: '2026-11-05T15:00:00Z',
  status: 'SCHEDULED',
};
const model = {
  code: 'LITE',
  name: '라이트',
  turnCost: 20,
  isActive: true,
  isDefault: false,
  promotion,
};
const body = {
  turnCost: 0,
  startsAt: promotion.startsAt,
  endsAt: promotion.endsAt,
  reason: '이벤트 설정',
};

function request(
  method: string,
  path: string,
  value?: unknown,
  authenticated = true,
  contentType = 'application/json',
) {
  return new NextRequest(`${base}/api${path}`, {
    method,
    headers: {
      ...(authenticated ? { Cookie: cookie } : {}),
      Origin: base,
      'Content-Type': contentType,
    },
    ...(value === undefined ? {} : { body: JSON.stringify(value) }),
  });
}

async function invoke(method: string, path: string, value?: unknown) {
  const incoming = request(method, path, value);
  const rewrite = proxy(incoming).headers.get('x-middleware-rewrite');

  expect(rewrite).toBe(`${base}/api/admin-upstream${path}`);

  return handle(
    new NextRequest(rewrite!, {
      method,
      headers: incoming.headers,
      ...(value === undefined ? {} : { body: await incoming.text() }),
    }),
    {
      params: Promise.resolve({ path: path.split('?')[0].slice(1).split('/') }),
    },
  );
}

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'server');
  vi.stubEnv('API_BASE_URL', 'https://upstream.example');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('설정과 해제는 실제 생성 본문 스키마를 사용한다', () => {
  expect(
    findAdminEndpoint('/credits/promotions/LITE', 'PUT')?.operation?.body,
  ).toBe(Upsert2Body);
  expect(
    findAdminEndpoint('/credits/promotions/LITE', 'DELETE')?.operation?.body,
  ).toBe(Delete3Body);
  expect(List8Response.safeParse({ items: [model] }).success).toBe(true);
  expect(
    List8Response.safeParse({
      items: [{ ...model, promotion: { ...promotion, status: 'WRONG' } }],
    }).success,
  ).toBe(false);
});
it.each([
  [
    'GET',
    '/credits/promotions',
    '/chat-models',
    undefined,
    { items: [model, { ...model, code: 'AURORA', promotion: null }] },
  ],
  [
    'PUT',
    '/credits/promotions/LITE',
    '/chat-models/LITE/promotion',
    body,
    model,
  ],
  [
    'DELETE',
    '/credits/promotions/LITE',
    '/chat-models/LITE/promotion',
    { reason: '이벤트 종료' },
    { ...model, promotion: null },
  ],
] as const)(
  '%s는 proxy rewrite와 쿠키 인증을 거쳐 본문과 응답을 보존한다',
  async (method, browser, server, value, data) => {
    const fetch = vi.fn().mockResolvedValue(Response.json(data));

    vi.stubGlobal('fetch', fetch);

    const response = await invoke(method, browser, value);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(data);
    expect(fetch).toHaveBeenCalledOnce();

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe(`https://upstream.example/api/v1/admin${server}`);
    expect(options.method).toBe(method);
    expect(options.body).toBe(
      value === undefined ? undefined : JSON.stringify(value),
    );
    expect(options.headers.get('Authorization')).toBe(
      'Bearer promotion-test-token',
    );
    expect(options.headers.has('Cookie')).toBe(false);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  },
);
it.each([
  ['PUT', { ...body, turnCost: -1 }],
  ['PUT', { ...body, turnCost: 10001 }],
  ['PUT', { ...body, turnCost: '0' }],
  ['PUT', { ...body, startsAt: 'bad' }],
  ['PUT', { ...body, endsAt: '2026-11-06T00:00:00' }],
  ['PUT', { ...body, reason: 'x'.repeat(501) }],
  ['PUT', { ...body, reason: null }],
  ['DELETE', {}],
  ['DELETE', { reason: 123 }],
  ['DELETE', { reason: 'x'.repeat(501) }],
] as const)(
  '%s의 생성 스키마 위반은 400이며 업스트림을 호출하지 않는다',
  async (method, value) => {
    const fetch = vi.fn();

    vi.stubGlobal('fetch', fetch);
    expect(
      (await invoke(method, '/credits/promotions/LITE', value)).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  },
);
it.each(['GET', 'PUT', 'DELETE'])(
  '%s의 지원하지 않는 쿼리를 생성 연산 검증에서 거절한다',
  async (method) => {
    const fetch = vi.fn();

    vi.stubGlobal('fetch', fetch);
    expect(
      (
        await invoke(
          method,
          `/credits/promotions${method === 'GET' ? '' : '/LITE'}?unexpected=1`,
          method === 'GET' ? undefined : body,
        )
      ).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  },
);
it.each(['GET', 'PUT', 'DELETE'])(
  '%s는 세션이 없으면 proxy와 공통 핸들러에서 401이다',
  async (method) => {
    const fetch = vi.fn();

    vi.stubGlobal('fetch', fetch);

    const path = `/credits/promotions${method === 'GET' ? '' : '/LITE'}`;
    const incoming = request(
      method,
      path,
      method === 'GET' ? undefined : body,
      false,
    );

    expect(proxy(incoming).status).toBe(401);
    expect(
      (
        await handle(incoming, {
          params: Promise.resolve({ path: path.slice(1).split('/') }),
        })
      ).status,
    ).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  },
);
it.each(['PUT', 'DELETE'])(
  '%s는 업스트림 400 message를 그대로 보존한다',
  async (method) => {
    const error = {
      status: 400,
      code: 'BAD_REQUEST',
      message: '종료 시각은 시작 시각 이후여야 합니다.',
      details: [],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json(error, { status: 400 })),
    );

    const result = await invoke(
      method,
      '/credits/promotions/LITE',
      method === 'PUT'
        ? { ...body, endsAt: body.startsAt }
        : { reason: '종료' },
    );

    expect(result.status).toBe(400);
    expect(await result.json()).toEqual(error);
  },
);
it.each(['GET', 'PUT', 'DELETE'])(
  '%s의 업스트림 401은 관리자 쿠키를 삭제한다',
  async (method) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ message: '인증 만료' }, { status: 401 }),
        ),
    );

    const result = await invoke(
      method,
      `/credits/promotions${method === 'GET' ? '' : '/LITE'}`,
      method === 'GET'
        ? undefined
        : method === 'PUT'
          ? body
          : { reason: '종료' },
    );

    expect(result.status).toBe(401);
    expect(result.headers.get('Set-Cookie')).toContain(`${sessionCookie}=`);
    expect(result.headers.get('Set-Cookie')).toContain('Max-Age=0');
  },
);
it.each([
  { reason: '사유' },
  { ...body, turnCost: 0.5 },
  { ...body, reason: '   ' },
])(
  '현재 OpenAPI가 표현하지 못하는 제약 %j는 서버 400으로 판정한다',
  async (value) => {
    expect(Upsert2Body.safeParse(value).success).toBe(true);

    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { message: '요청 값이 올바르지 않습니다.' },
          { status: 400 },
        ),
      );

    vi.stubGlobal('fetch', fetch);
    expect(
      (await invoke('PUT', '/credits/promotions/LITE', value)).status,
    ).toBe(400);
    expect(fetch).toHaveBeenCalledOnce();
  },
);
