import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, expectTypeOf, it, vi } from 'vitest';
import type { ZodType } from 'zod';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import * as schemas from '@/api/generated/zod/admin';
import { GET } from '@/app/api/admin-upstream/[...path]/route';
import type { ChatOptionDay, SignupDay } from '@/features/analytics/types';
import { sessionCookie } from '@/features/auth/session';
import { metricFixture } from '@/fixtures/metrics';

const period = 'from=2026-10-21&to=2026-10-23';
const metrics: [string, ZodType, string][] = [
  [
    '/campaigns/funnels/activation',
    schemas.ActivationResponse,
    'steps.0.minTurnNumber',
  ],
  ['/campaigns/reach', schemas.Reach1Response, 'deepChatUsers.ads'],
  [
    '/campaigns/creatives',
    schemas.CreativesResponse,
    'daily.0.signups.0.users',
  ],
  [
    '/campaigns/app-transfer',
    schemas.AppTransferResponse,
    'daily.0.bannerClickRate',
  ],
  [
    '/users/app-activation',
    schemas.AppActivationResponse,
    'totals.activationRate',
  ],
  [
    '/campaigns/analytics',
    schemas.Analytics1Response,
    'daily.0.newVisitorsByDevice.ios',
  ],
  ['/users/sessions', schemas.SessionsResponse, 'daily.0.sessionsPerUser.web'],
  [
    '/users/session-lengths',
    schemas.SessionLengthsResponse,
    'daily.0.sessions.all',
  ],
  ['/users/signups', schemas.SignupsResponse, 'daily.0.signupRate.web'],
  [
    '/quality/client',
    schemas.QualityResponse,
    'daily.0.activity.coreActiveUsers',
  ],
  [
    '/quality/chat-options',
    schemas.OptionsResponse,
    'daily.0.chatStartersByPersonaType.persona.web',
  ],
  [
    '/conversion/funnels/web-to-android',
    schemas.FunnelResponse,
    'steps.0.platform',
  ],
];

it.each(metrics)(
  '%s의 새 응답 필드를 생성 Zod가 보존하고 잘못된 타입을 거부한다',
  (path, schema, field) => {
    const data = metricFixture(path, new URLSearchParams(period));

    expect(schema.safeParse(data).success).toBe(true);

    const invalid = structuredClone(data);
    const keys = field.split('.');
    let target = invalid as unknown as Record<string, unknown>;

    for (const key of keys.slice(0, -1))
      target = target[key] as Record<string, unknown>;

    target[keys.at(-1)!] = { invalid: true };
    expect(schema.safeParse(invalid).success).toBe(false);

    const parsed = schema.parse(data);
    let actual = parsed as Record<string, unknown>;

    for (const key of keys.slice(0, -1))
      actual = actual[key] as Record<string, unknown>;

    expect(actual).toHaveProperty(keys.at(-1)!);
  },
);

it('보완된 관리자 스냅샷은 세 PR의 출처를 보존하고 테스트 전용 경로를 제외한다', () => {
  const snapshot = JSON.parse(readFileSync('docs/openapi/admin.json', 'utf8'));

  expect(snapshot['x-source']).toMatchObject({
    input: '/private/tmp/knk-openapi/openapi-admin.json',
    revision: 'a19d1ad',
    description:
      '로컬 병합 #435 6811081 + #434 aeea52c + #436 394780c, foundation-probe 제외',
    receivedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
  });
  expect(
    Object.keys(snapshot.paths).some((path) =>
      path.includes('foundation-probe'),
    ),
  ).toBe(false);
});

const newPaths = [
  '/campaigns/funnels/activation',
  '/campaigns/reach',
  '/campaigns/creatives',
  '/campaigns/app-transfer',
  '/users/app-activation',
  ...[
    'first-visit-activation',
    'login-signup',
    'android-activation',
    'web-to-android',
    'creation-entry-chat',
  ].map((funnel) => `/conversion/funnels/${funnel}`),
];
const cookie = `${sessionCookie}=${Buffer.from(JSON.stringify({ accessToken: 'metrics-test-token', nickname: '테스트 관리자' })).toString('base64url')}`;

function invoke(path: string, query = period, authenticated = true) {
  return GET(
    new NextRequest(
      `https://admin.example/api/admin-upstream${path}?${query}`,
      {
        headers: {
          ...(authenticated ? { Cookie: cookie } : {}),
          'X-Manyak-Request-Id': 'metrics-openapi-test',
        },
      },
    ),
    { params: Promise.resolve({ path: path.slice(1).split('/') }) },
  );
}

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'server');
  vi.stubEnv('API_BASE_URL', 'https://upstream.example');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it.each(newPaths)(
  '%s를 서버 모드에서 생성 연산으로 검증하고 상태와 본문을 보존한다',
  async (path) => {
    expect(findAdminEndpoint(path, 'GET')).toMatchObject({
      implemented: true,
      serverPath: `/api/v1/admin${path}`,
      operation: expect.objectContaining({ method: 'GET' }),
    });

    const body = metricFixture(path, new URLSearchParams(period));

    for (const status of [200, 400, 401, 503]) {
      const fetchMock = vi.fn().mockResolvedValue(
        Response.json(body, {
          status,
          headers: { 'X-Manyak-Request-Id': 'upstream-test' },
        }),
      );

      vi.stubGlobal('fetch', fetchMock);

      const response = await invoke(path);

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual(body);
      expect(
        response.headers.get('Set-Cookie')?.includes('Max-Age=0') ?? false,
      ).toBe(status === 401);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toBe(
        `https://upstream.example/api/v1/admin${path}?${period}`,
      );
      expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe(
        'Bearer metrics-test-token',
      );
    }
  },
);

it.each(newPaths)(
  '%s의 미지원 및 중복 쿼리와 인증 누락은 서버 호출 전에 거부한다',
  async (path) => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    expect((await invoke(path, `${period}&unexpected=true`)).status).toBe(400);
    expect((await invoke(path, `${period}&from=2026-10-20`)).status).toBe(400);
    expect((await invoke(path, period, false)).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

it.each(metrics)(
  '%s의 부분 집계와 null을 생성 스키마로 확인하고 BFF가 그대로 전달한다',
  async (path, schema) => {
    const query = 'from=2026-10-20&to=2026-10-23';
    const body = metricFixture(path, new URLSearchParams(query));

    expect(schema.safeParse(body).success).toBe(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));

    const response = await invoke(path, query);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(body);
  },
);

it('가입과 채팅 시작의 플랫폼 타입은 전체, 웹, 앱만 요구한다', () => {
  type Keys = 'all' | 'web' | 'android';

  expectTypeOf<
    keyof NonNullable<SignupDay['signupsByPlatform']>
  >().toEqualTypeOf<Keys>();
  expectTypeOf<
    keyof NonNullable<SignupDay['newVisitorsByPlatform']>
  >().toEqualTypeOf<Keys>();
  expectTypeOf<
    keyof NonNullable<SignupDay['signupRate']>
  >().toEqualTypeOf<Keys>();
  expectTypeOf<
    keyof NonNullable<ChatOptionDay['chatStarters']>
  >().toEqualTypeOf<Keys>();
  expectTypeOf<
    keyof NonNullable<ChatOptionDay['chatStartersByPersonaType']>['persona']
  >().toEqualTypeOf<Keys>();
});

it('신규 가입과 채팅 시작 fixture의 플랫폼 묶음에는 unknown을 넣지 않는다', () => {
  const signup = metricFixture(
    '/users/signups',
    new URLSearchParams(period),
  ) as { daily: SignupDay[] };
  const chats = metricFixture(
    '/quality/chat-options',
    new URLSearchParams(period),
  ) as { daily: ChatOptionDay[] };
  const values = [
    signup.daily[0].signupsByPlatform,
    signup.daily[0].newVisitorsByPlatform,
    signup.daily[0].signupRate,
    chats.daily[0].chatStarters,
    ...Object.values(chats.daily[0].chatStartersByPersonaType!),
  ];

  for (const value of values)
    expect(Object.keys(value!).sort()).toEqual(['all', 'android', 'web']);
});
