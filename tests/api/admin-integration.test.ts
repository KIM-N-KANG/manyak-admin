import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { adminEndpoints, findAdminEndpoint } from '@/api/admin-endpoints';
import { GET as handle } from '@/app/api/admin-upstream/[...path]/route';
import { sessionCookie } from '@/features/auth/session';
import { proxy } from '@/proxy';

const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const cookie = `${sessionCookie}=${Buffer.from(JSON.stringify({ accessToken: 'forged-test-token', nickname: '테스트 관리자' })).toString('base64url')}`;
const reason = { reason: '테스트 사유' };
const presign = { kind: 'COVER', contentType: 'image/png', contentLength: 32 };
const cases: [string, string, string, unknown?][] = [
  ...[
    '/campaigns/funnels/activation',
    '/campaigns/reach',
    '/campaigns/creatives',
    '/campaigns/app-transfer',
    '/users/app-activation',
  ].map((path): [string, string, string] => [
    'GET',
    `${path}?from=2026-10-21&to=2026-10-23`,
    `${path}?from=2026-10-21&to=2026-10-23`,
  ]),
  [
    'POST',
    `/moderation/stories/${id}/takedown`,
    `/moderation/stories/${id}/takedown`,
    { reasonCode: 'COPYRIGHT_INFRINGEMENT', memo: '신고 3건 확인' },
  ],
  [
    'POST',
    `/moderation/stories/${id}/takedown`,
    `/moderation/stories/${id}/takedown`,
    { reasonCode: 'ETC', reasonDetail: '실존 인물 비방' },
  ],
  ['GET', '/stories?deleted=include', '/stories?deleted=include'],
  [
    'GET',
    `/stories?memberId=${id}&deleted=only`,
    `/stories?memberId=${id}&deleted=only`,
  ],
  ['GET', '/chats?deleted=only', '/chats?deleted=only'],
  [
    'GET',
    `/chats?storyId=${id}&deleted=include`,
    `/chats?storyId=${id}&deleted=include`,
  ],
  [
    'GET',
    `/moderation/submissions?page=1&size=20&sort=decidedAt&order=desc&status=HELD&memberId=${id}&storyId=${id}&q=test&from=2026-10-01&to=2026-10-21`,
    `/moderation/submissions?page=1&size=20&sort=decidedAt&order=desc&status=HELD&memberId=${id}&storyId=${id}&q=test&from=2026-10-01&to=2026-10-21`,
  ],
  ['GET', `/moderation/submissions/${id}`, `/moderation/submissions/${id}`],
  [
    'GET',
    '/notices?status=DRAFT&size=10&sort=updatedAt&q=test',
    '/notices?status=DRAFT&size=10&sort=updatedAt&q=test',
  ],
  [
    'POST',
    '/notices',
    '/notices',
    {
      ...reason,
      title: '공지',
      body: '공지 본문',
      tag: 'MAINTENANCE',
    },
  ],
  ['GET', `/notices/${id}`, `/notices/${id}`],
  [
    'PATCH',
    `/notices/${id}`,
    `/notices/${id}`,
    {
      ...reason,
      title: '수정 공지',
      tag: 'EVENT',
    },
  ],
  ['DELETE', `/notices/${id}`, `/notices/${id}`, reason],
  ['POST', `/notices/${id}/publish`, `/notices/${id}/publish`, reason],
  ['POST', `/notices/${id}/unpublish`, `/notices/${id}/unpublish`, reason],
  [
    'GET',
    '/campaigns/push-opens?from=2026-10-18&to=2026-10-24',
    '/campaigns/push-opens?from=2026-10-18&to=2026-10-24',
  ],
  [
    'GET',
    '/users/session-lengths?segment=member',
    '/users/session-lengths?segment=member',
  ],
  ['GET', '/users/retention?cohort=signup', '/users/retention?cohort=signup'],
  ['GET', '/dashboard/summary', '/dashboard/summary'],
  [
    'GET',
    '/infra/metrics?from=2026-10-23&to=2026-10-23',
    '/infra/metrics?from=2026-10-23&to=2026-10-23',
  ],
  ['GET', '/infra/db-tables?limit=20', '/infra/db-tables?limit=20'],
  [
    'GET',
    '/users/activity?from=2026-10-01&to=2026-10-21',
    '/users/activity?from=2026-10-01&to=2026-10-21',
  ],
  [
    'GET',
    '/users/retention?from=2026-10-01&to=2026-10-20',
    '/users/retention?from=2026-10-01&to=2026-10-20',
  ],
  [
    'GET',
    '/users/sessions?from=2026-10-01&to=2026-10-21',
    '/users/sessions?from=2026-10-01&to=2026-10-21',
  ],
  [
    'GET',
    '/users/signups?from=2026-10-01&to=2026-10-21',
    '/users/signups?from=2026-10-01&to=2026-10-21',
  ],
  [
    'GET',
    '/conversion/funnels/web-first-visit?from=2026-10-01&to=2026-10-21',
    '/conversion/funnels/web-first-visit?from=2026-10-01&to=2026-10-21',
  ],
  [
    'GET',
    '/conversion/turn-reach?from=2026-10-01&to=2026-10-21',
    '/conversion/turn-reach?from=2026-10-01&to=2026-10-21',
  ],
  [
    'GET',
    '/quality/client?platform=web&from=2026-10-01&to=2026-10-21',
    '/quality/client?platform=web&from=2026-10-01&to=2026-10-21',
  ],
  [
    'GET',
    '/quality/chat-options?from=2026-10-01&to=2026-10-21',
    '/quality/chat-options?from=2026-10-01&to=2026-10-21',
  ],
  [
    'GET',
    '/quality/ai-cost?from=2026-10-01&to=2026-10-21',
    '/quality/ai-cost?from=2026-10-01&to=2026-10-21',
  ],
  ['GET', '/users/app-activation?days=7', '/users/app-activation?days=7'],
  [
    'GET',
    '/campaigns/reach?campaign=test&days=7',
    '/campaigns/reach?campaign=test&days=7',
  ],
  [
    'GET',
    '/campaigns/funnels/activation?campaign=test&days=7',
    '/campaigns/funnels/activation?campaign=test&days=7',
  ],
  [
    'GET',
    '/campaigns/creatives?campaign=test&days=7',
    '/campaigns/creatives?campaign=test&days=7',
  ],
  ['GET', '/campaigns/app-transfer?days=7', '/campaigns/app-transfer?days=7'],
  ['GET', '/campaigns', '/campaigns'],
  ['GET', '/campaigns/sources?days=7', '/campaigns/sources?days=7'],
  [
    'GET',
    '/campaigns/analytics?campaign=test&days=7',
    '/campaigns/analytics?campaign=test&days=7',
  ],
  [
    'GET',
    '/campaigns/funnels/creation?days=7',
    '/campaigns/funnels/creation?days=7',
  ],
  [
    'GET',
    `/campaigns/funnels/story-detail?storyId=${id}&days=7`,
    `/campaigns/funnels/story-detail?storyId=${id}&days=7`,
  ],
  ['GET', '/dashboard/play-installs', '/dashboard/play-installs'],
  ['GET', '/dashboard/charts?days=7', '/dashboard/charts?days=7'],
  ['GET', '/dashboard/analytics?days=30', '/dashboard/analytics?days=30'],
  [
    'GET',
    '/members?page=2&size=5&excludeDeleted=true&sort=paidKrw',
    '/members?page=2&size=5&excludeDeleted=true&sort=paidKrw',
  ],
  ['GET', `/members/${id}`, `/members/${id}`],
  [
    'GET',
    `/members/${id}/transactions?page=2`,
    `/members/${id}/transactions?page=2`,
  ],
  [
    'GET',
    `/members/${id}/attendance?sort=date`,
    `/members/${id}/attendance?sort=date`,
  ],
  ['POST', `/members/${id}/suspension`, `/members/${id}/suspension`, reason],
  ['DELETE', `/members/${id}/suspension`, `/members/${id}/suspension`, reason],
  [
    'GET',
    '/stories?scope=original&supportingCharacterCount=0&hasLatency=false',
    '/stories?scope=original&supportingCharacterCount=0&hasLatency=false',
  ],
  [
    'GET',
    '/stories?creationMode=SIMPLE&from=2026-10-01&to=2026-10-21',
    '/stories?creationMode=SIMPLE&from=2026-10-01&to=2026-10-21',
  ],
  ['GET', `/stories/${id}`, `/stories/${id}`],
  ['GET', `/stories/${id}/settings`, `/stories/${id}/settings`],
  [
    'GET',
    '/chats?turnBucket=10&hasFirstMessage=true',
    '/chats?turnBucket=10&hasFirstMessage=true',
  ],
  ['GET', `/chats/${id}`, `/chats/${id}`],
  [
    'GET',
    '/payments?status=REFUNDED&sort=completedAt',
    '/payments/orders?status=REFUNDED&sort=completedAt',
  ],
  ['GET', `/payments/${id}`, `/payments/orders/${id}`],
  [
    'GET',
    '/audit-logs?action=MEMBER_SEARCHED&category=ACCESS',
    '/audit-logs?action=MEMBER_SEARCHED&category=ACCESS',
  ],
  [
    'GET',
    '/credits/transactions?direction=spent&date=2026-10-21&page=2&size=5&sort=createdAt&order=asc',
    '/credits/transactions?direction=spent&date=2026-10-21&page=2&size=5&sort=createdAt&order=asc',
  ],
  ['GET', '/credits/policies', '/credits/policies'],
  [
    'PUT',
    '/credits/policies/attendance',
    '/credits/policies/attendance',
    { ...reason, amount: 250 },
  ],
  [
    'DELETE',
    '/credits/policies/attendance',
    '/credits/policies/attendance',
    reason,
  ],
  [
    'POST',
    '/credits/adjustments',
    '/credits/adjustments',
    {
      ...reason,
      memberId: id,
      type: 'GRANT',
      amount: 250,
      idempotencyKey: 'test-key',
    },
  ],
  ['GET', '/moderation/holds?size=10', '/moderation/holds?size=10'],
  [
    'POST',
    `/moderation/holds/${id}/release`,
    `/moderation/holds/${id}/release`,
    reason,
  ],
  ['GET', '/originals?status=DRAFT&page=1', '/originals?status=DRAFT&page=1'],
  [
    'POST',
    '/originals',
    '/originals',
    { ...reason, title: '테스트 초안', status: 'DRAFT' },
  ],
  ['GET', `/originals/${id}`, `/originals/${id}`],
  [
    'PATCH',
    `/originals/${id}`,
    `/originals/${id}`,
    { ...reason, protagonistName: null },
  ],
  [
    'DELETE',
    `/originals/${id}/thumbnail`,
    `/originals/${id}/thumbnail`,
    reason,
  ],
  ['POST', '/originals/images/presign', '/originals/images/presign', presign],
  [
    'POST',
    `/originals/${id}/images/presign`,
    `/originals/${id}/images/presign`,
    presign,
  ],
  [
    'GET',
    '/notifications/campaigns?status=SENT&page=2&size=10&q=test&kind=MARKETING&sort=deliveredMembers&order=asc',
    '/push/campaigns?status=SENT&page=2&size=10&q=test&kind=MARKETING&sort=deliveredMembers&order=asc',
  ],
  [
    'POST',
    '/notifications/campaigns',
    '/push/campaigns',
    {
      ...reason,
      title: '제목',
      body: '본문',
      storyId: id,
      scheduledAt: '2030-10-24T01:00:00Z',
    },
  ],
  ['GET', `/notifications/campaigns/${id}`, `/push/campaigns/${id}`],
  [
    'POST',
    `/notifications/campaigns/${id}/cancel`,
    `/push/campaigns/${id}/cancel`,
    reason,
  ],
  [
    'POST',
    `/notifications/campaigns/${id}/retry`,
    `/push/campaigns/${id}/retry`,
    reason,
  ],
  [
    'GET',
    '/notifications/campaigns/target-count?kind=SERVICE',
    '/push/campaigns/target-count?kind=SERVICE',
  ],
  [
    'GET',
    '/notifications/templates/attendance_reminder',
    '/push/templates/attendance_reminder',
  ],
  [
    'PUT',
    '/notifications/templates/attendance_reminder',
    '/push/templates/attendance_reminder',
    { ...reason, title: '제목', body: '본문', effectiveUntil: null },
  ],
  [
    'DELETE',
    '/notifications/templates/attendance_reminder',
    '/push/templates/attendance_reminder',
    reason,
  ],
  [
    'GET',
    '/notifications/templates/credit_expiry_reminder',
    '/push/templates/credit_expiry_reminder',
  ],
  [
    'PUT',
    '/notifications/templates/credit_expiry_reminder',
    '/push/templates/credit_expiry_reminder',
    {
      ...reason,
      title: '이프 만료 예정 안내',
      body: '곧 만료되는 이프가 있어요',
    },
  ],
  [
    'DELETE',
    '/notifications/templates/credit_expiry_reminder',
    '/push/templates/credit_expiry_reminder',
    reason,
  ],
  [
    'GET',
    '/notifications/delivery-stats?from=2026-10-01&kind=SERVICE&type=CREDIT_EXPIRY_REMINDER',
    '/push/delivery-stats?from=2026-10-01&kind=SERVICE&type=CREDIT_EXPIRY_REMINDER',
  ],
];

function request(method: string, path: string, body?: unknown) {
  return new NextRequest(`https://admin.example/api/admin-upstream${path}`, {
    method,
    headers: {
      Cookie: cookie,
      'X-Manyak-Request-Id': 'w8-test-request',
      Origin: 'https://admin.example',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function invoke(method: string, path: string, body?: unknown) {
  return handle(request(method, path, body), {
    params: Promise.resolve({ path: path.split('?')[0].slice(1).split('/') }),
  });
}

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'server');
  vi.stubEnv('API_BASE_URL', 'https://upstream.example/');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('로그인 외 모든 활성 HTTP 연산을 전달 표에서 검증한다', () => {
  const covered = new Set(
    cases.map(([method, browser]) => {
      const operation = findAdminEndpoint(
        browser.split('?')[0],
        method,
      )?.operation;

      return `${operation?.method} ${operation?.path}`;
    }),
  );
  const expected = new Set(
    adminEndpoints
      .filter((e) => e.implemented)
      .map((e) => `${e.operation?.method} ${e.operation?.path}`),
  );

  expect(covered).toEqual(expected);
});

it.each(cases)(
  '%s %s의 경로·쿼리·본문·인증·요청 ID와 성공/오류를 보존한다',
  async (method, browser, server, body) => {
    for (const status of [200, 400, 401, 403, 409, 503]) {
      const responseBody = JSON.stringify({
        status,
        code: status === 200 ? 'OK' : 'UPSTREAM_ERROR',
        details: [{ field: 'test', message: '원문' }],
      });
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(responseBody, {
          status,
          headers: {
            'Content-Type': 'application/json',
            'X-Manyak-Request-Id': 'upstream-id',
          },
        }),
      );

      vi.stubGlobal('fetch', fetchMock);

      const response = await invoke(method, browser, body);

      expect(response.status).toBe(status);
      expect(await response.text()).toBe(responseBody);
      expect(response.headers.get('X-Manyak-Request-Id')).toBe('upstream-id');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(
        response.headers.get('Set-Cookie')?.includes('Max-Age=0') ?? false,
      ).toBe(status === 401);
      expect(fetchMock).toHaveBeenCalledOnce();

      const [url, options] = fetchMock.mock.calls[0];

      expect(url).toBe(`https://upstream.example/api/v1/admin${server}`);
      expect(options.headers.get('Authorization')).toBe(
        'Bearer forged-test-token',
      );
      expect(options.headers.get('X-Manyak-Request-Id')).toBe(
        'w8-test-request',
      );
      expect(options.headers.has('Cookie')).toBe(false);
      expect(options.body).toBe(
        body === undefined ? undefined : JSON.stringify(body),
      );
    }
  },
);

it.each([
  ['POST', '/notices', { ...reason, title: [], body: '본문' }],
  ['POST', `/notices/${id}/publish`, { reason: [] }],
  ['POST', '/notices', { ...reason, title: '공지', body: '본문' }],
  ['POST', '/notices', { ...reason, title: '공지', body: '본문', tag: 'NEWS' }],
  ['PATCH', `/notices/${id}`, { ...reason, tag: 'NEWS' }],
  ['GET', '/members?page=0'],
  ['GET', '/infra/db-tables?limit=0'],
  ['GET', '/infra/db-tables?limit=101'],
  ['GET', '/infra/db-tables?limit=1.5'],
  ['GET', '/infra/db-tables?from=2026-10-23'],
  ['GET', '/members?page=1.5'],
  ['GET', '/members?page=0x10'],
  ['GET', '/members?page=1e2'],
  ['GET', '/members?size=101'],
  ['GET', '/members?excludeDeleted=maybe'],
  ['GET', '/members?status=UNKNOWN'],
  ['GET', '/members?size=2&size=3'],
  ['GET', '/members?unexpected=1'],
  ['GET', '/stories?memberId=invalid'],
  ['GET', '/stories?supportingCharacterCount=6'],
  ['GET', '/stories?creationMode=simple'],
  ['GET', '/users/retention?cohort=unknown'],
  ['GET', '/users/session-lengths?segment=unknown'],
  ['GET', '/chats?turnBucket=13'],
  ['GET', '/dashboard/analytics?days=abc'],
  ['GET', '/notifications/campaigns?status=UNKNOWN'],
  ['GET', '/notifications/delivery-stats?from=bad'],
  ['GET', '/members/invalid'],
  ['POST', `/members/${id}/suspension`, {}],
  [
    'POST',
    '/credits/adjustments',
    { ...reason, amount: 100001, idempotencyKey: 'key' },
  ],
  ['POST', '/originals/images/presign', { ...presign, contentLength: 5242881 }],
  ['POST', '/notifications/campaigns', { ...reason, title: '제목' }],
  [
    'PUT',
    '/notifications/templates/attendance_reminder',
    { ...reason, title: '제목', body: '본문', effectiveUntil: 'bad' },
  ],
  ['PATCH', `/originals/${id}`, { reason: [] }],
] as [string, string, unknown?][])(
  '잘못된 %s %s는 400이며 업스트림을 호출하지 않는다',
  async (method, path, body) => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    expect((await invoke(method, path, body)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

it('본문 없는 204 응답을 보존한다', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  );

  const response = await invoke('DELETE', `/originals/${id}/thumbnail`, reason);

  expect(response.status).toBe(204);
  expect(await response.text()).toBe('');
});

it('깨진 JSON과 JSON이 아닌 변경 요청은 전달하지 않는다', async () => {
  const fetchMock = vi.fn();

  vi.stubGlobal('fetch', fetchMock);

  for (const headers of [
    { 'Content-Type': 'application/json' },
    { 'Content-Type': 'text/plain' },
  ]) {
    const response = await handle(
      new NextRequest(
        'https://admin.example/api/admin-upstream/credits/adjustments',
        {
          method: 'POST',
          headers: { Cookie: cookie, ...headers },
          body: '{',
        },
      ),
      { params: Promise.resolve({ path: ['credits', 'adjustments'] }) },
    );

    expect(response.status).toBe(400);
  }

  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([' ', '\n\t', '\u0085', '\u00a0', '\u3000'])(
  '공지 PATCH의 Unicode 공백 %j를 생성 정규식이 거부한다',
  async (title) => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    expect(
      (await invoke('PATCH', `/notices/${id}`, { ...reason, title })).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

it('공지 PATCH는 줄바꿈과 Unicode 공백 사이의 실제 글자를 허용한다', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ title: '공지' })),
  );
  expect(
    (
      await invoke('PATCH', `/notices/${id}`, {
        ...reason,
        title: '\u0085\n공지\n\u3000',
      })
    ).status,
  ).toBe(200);
});

it('공개 이프 내역 경로를 server BFF로 rewrite하고 서버의 원장 페이지를 그대로 반환한다', async () => {
  const body = {
    items: [
      {
        amount: -30,
        reason: 'CHAT_TURN',
        createdAt: '2026-10-21T04:00:00Z',
        member: {
          memberId: id,
          nickname: '회원',
          status: 'ACTIVE',
          isAdmin: false,
          createdAt: '2026-10-01T00:00:00Z',
        },
      },
    ],
    page: 1,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  };
  const fetchMock = vi.fn().mockResolvedValue(Response.json(body));

  vi.stubGlobal('fetch', fetchMock);

  const incoming = new NextRequest(
    'https://admin.example/api/credits/transactions?page=1&size=20&order=desc',
    { headers: { Cookie: cookie } },
  );
  const rewritten = proxy(incoming).headers.get('x-middleware-rewrite');

  expect(rewritten).toBe(
    'https://admin.example/api/admin-upstream/credits/transactions?page=1&size=20&order=desc',
  );

  const response = await handle(
    new NextRequest(rewritten!, { headers: incoming.headers }),
    { params: Promise.resolve({ path: ['credits', 'transactions'] }) },
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(body);
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://upstream.example/api/v1/admin/credits/transactions?page=1&size=20&order=desc',
  );
});

it.each([
  '',
  'page=0&size=20&order=desc',
  'page=1&size=101&order=desc',
  'page=1&size=20&order=desc&direction=refund',
  'page=1&size=20&order=up',
  'page=1.5&size=20&order=desc',
  'page=1&size=20&size=30&order=desc',
  'page=1&size=20&order=desc&memberId=3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  'page=1&size=20&order=desc&unexpected=1',
  'size=20&order=desc',
  'page=1&order=desc',
  'page=1&size=20',
])(
  '이프 내역의 잘못된 생성 계약 쿼리 %s는 업스트림 호출 전에 400이다',
  async (query) => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    const response = await invoke(
      'GET',
      `/credits/transactions${query ? `?${query}` : ''}`,
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

it.each(['charts', 'analytics'])(
  '공개 대시보드 %s 경로의 from·to를 생성 계약 검증 후 그대로 전달한다',
  async (endpoint) => {
    const query = 'from=2026-10-01&to=2026-10-22';
    const body = { from: '2026-10-01', to: '2026-10-22', daily: [] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(body));

    vi.stubGlobal('fetch', fetchMock);

    const incoming = new NextRequest(
      `https://admin.example/api/dashboard/${endpoint}?${query}`,
      { headers: { Cookie: cookie } },
    );
    const rewritten = proxy(incoming).headers.get('x-middleware-rewrite');

    expect(rewritten).toBe(
      `https://admin.example/api/admin-upstream/dashboard/${endpoint}?${query}`,
    );

    const response = await handle(
      new NextRequest(rewritten!, { headers: incoming.headers }),
      { params: Promise.resolve({ path: ['dashboard', endpoint] }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(body);
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, options] = fetchMock.mock.calls[0];
    const upstream = new URL(url);

    expect(url).toBe(
      `https://upstream.example/api/v1/admin/dashboard/${endpoint}?${query}`,
    );
    expect(upstream.searchParams.has('days')).toBe(false);
    expect(options.headers.get('Authorization')).toBe(
      'Bearer forged-test-token',
    );
    expect(options.headers.has('Cookie')).toBe(false);
  },
);

it.each(['charts', 'analytics'])(
  '%s 범위의 서버 검증 오류와 서비스 실패를 그대로 반환한다',
  async (endpoint) => {
    for (const status of [400, 503]) {
      const body = {
        status,
        code: status === 400 ? 'BAD_REQUEST' : 'SERVICE_UNAVAILABLE',
        message: '서버 오류',
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValue(Response.json(body, { status }));

      vi.stubGlobal('fetch', fetchMock);

      const response = await invoke(
        'GET',
        `/dashboard/${endpoint}?from=2026-10-22&to=2026-10-01`,
      );

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual(body);
      expect(fetchMock).toHaveBeenCalledOnce();
    }
  },
);

it.each(['charts', 'analytics'])(
  '%s의 생성 days enum·중복·알 수 없는 범위 쿼리를 업스트림 전에 거부한다',
  async (endpoint) => {
    for (const query of [
      'days=14',
      'days=7.0',
      'from=2026-10-01&from=2026-10-02&to=2026-10-22',
      'range=last30d',
    ]) {
      const fetchMock = vi.fn();

      vi.stubGlobal('fetch', fetchMock);

      const response = await invoke('GET', `/dashboard/${endpoint}?${query}`);

      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  },
);

it('개요 분석의 플랫폼 객체·null·준비 중 날짜를 변환 없이 전달한다', async () => {
  for (const todayActiveUsers of [
    null,
    { total: 203, web: 186, android: 19 },
  ]) {
    const body = {
      asOf: '2026-10-23T05:00:00Z',
      from: '2026-10-20',
      to: '2026-10-22',
      todayActiveUsers,
      pendingDates: ['2026-10-21'],
      daily: [
        {
          date: '2026-10-20',
          activeUsers: { total: 198, web: 181, android: 19 },
          newUsers: { total: 27, web: 25, android: 2 },
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(body));

    vi.stubGlobal('fetch', fetchMock);

    const response = await invoke(
      'GET',
      '/dashboard/analytics?from=2026-10-20&to=2026-10-22',
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(body);
    expect(fetchMock).toHaveBeenCalledOnce();
  }
});

it.each(['deliveredMembers', 'deliveredDevices', 'failedDevices'])(
  '캠페인 %s 정렬·검색·종류는 생성 검증 후 rewrite와 인증을 거쳐 그대로 전달한다',
  async (sort) => {
    const query = new URLSearchParams({
      q: '주말 행사',
      kind: 'MARKETING',
      sort,
      order: 'desc',
      page: '2',
      size: '20',
    });
    const path = `/notifications/campaigns?${query}`;
    const incoming = new NextRequest(`https://admin.example/api${path}`, {
      headers: { Cookie: cookie },
    });
    const rewritten = proxy(incoming).headers.get('x-middleware-rewrite');

    expect(new URL(rewritten!).pathname).toBe(
      '/api/admin-upstream/notifications/campaigns',
    );

    const upstreamBody = {
      items: [
        {
          campaignId: id,
          storyId: id,
          deliveredMembers: 12,
          deliveredDevices: 15,
          failedDevices: 0,
        },
      ],
      page: 2,
      size: 20,
      totalElements: 21,
      totalPages: 2,
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(upstreamBody));

    vi.stubGlobal('fetch', fetchMock);

    const response = await handle(
      new NextRequest(rewritten!, { headers: { Cookie: cookie } }),
      { params: Promise.resolve({ path: ['notifications', 'campaigns'] }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(upstreamBody);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://upstream.example/api/v1/admin/push/campaigns?${query}`,
    );
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe(
      'Bearer forged-test-token',
    );
  },
);

it.each([
  ['GET', '/notifications/campaigns?kind=UNKNOWN', undefined],
  ['GET', '/notifications/campaigns?q=', undefined],
  ['GET', `/notifications/campaigns?q=${'a'.repeat(51)}`, undefined],
  ['GET', '/notifications/campaigns?kind=SERVICE&kind=MARKETING', undefined],
  [
    'POST',
    '/notifications/campaigns',
    { ...reason, title: '제목', body: '본문', storyId: 'invalid' },
  ],
])(
  '캠페인 정본 밖 %s %s는 업스트림 전에 400이다',
  async (method, path, body) => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    expect((await invoke(method, path, body)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

it.each([11, 12])(
  '갱신된 채팅 turnBucket %s는 생성 계약으로 검증해 전달한다',
  async (turnBucket) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ items: [] }));

    vi.stubGlobal('fetch', fetchMock);
    expect(
      (await invoke('GET', `/chats?turnBucket=${turnBucket}`)).status,
    ).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://upstream.example/api/v1/admin/chats?turnBucket=${turnBucket}`,
    );
  },
);

it('캠페인 sort는 실제 OpenAPI의 문자열 계약으로 전달하고 서버의 허용 값 오류를 보존한다', async () => {
  const body = { message: '지원하지 않는 정렬입니다.' };
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json(body, { status: 400 }));

  vi.stubGlobal('fetch', fetchMock);

  const response = await invoke('GET', '/notifications/campaigns?sort=unknown');

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual(body);
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://upstream.example/api/v1/admin/push/campaigns?sort=unknown',
  );
});

it('세션 없는 캠페인 요청은 지원 쿼리여도 전달 전에 401이다', async () => {
  const fetchMock = vi.fn();

  vi.stubGlobal('fetch', fetchMock);

  const request = new NextRequest(
    'https://admin.example/api/admin-upstream/notifications/campaigns?q=test&kind=MARKETING',
  );
  const response = await handle(request, {
    params: Promise.resolve({ path: ['notifications', 'campaigns'] }),
  });

  expect(response.status).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([
  'from=bad&to=2026-10-23',
  'from=2026-10-23',
  'from=2026-01-01&to=2026-10-23',
])(
  '인프라 기간 의미 검증 %s는 실제 문자열 계약으로 전달하고 서버 400을 보존한다',
  async (query) => {
    const body = { message: '기간이 올바르지 않습니다.' };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(body, { status: 400 }));

    vi.stubGlobal('fetch', fetchMock);

    const response = await invoke('GET', `/infra/metrics?${query}`);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(body);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://upstream.example/api/v1/admin/infra/metrics?${query}`,
    );
  },
);

it.each(['chat_image', 'chat_compact'])(
  '%s 채팅 필터를 생성 검증하고 인증과 호출일을 그대로 전달한다',
  async (feature) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ items: [] }));
    const query = `aiFeature=${feature}&aiStatus=FINISHED&aiFrom=2026-10-21&aiTo=2026-10-23`;

    vi.stubGlobal('fetch', fetchMock);
    expect((await invoke('GET', `/chats?${query}`)).status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://upstream.example/api/v1/admin/chats?${query}`,
    );
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe(
      'Bearer forged-test-token',
    );
  },
);

it.each(['x'.repeat(501), null])(
  '검수 보류 해제의 생성 계약을 벗어난 사유를 업스트림 전에 거부한다',
  async (value) => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    expect(
      (
        await invoke('POST', `/moderation/holds/${id}/release`, {
          reason: value,
        })
      ).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

it.each(['', '   '])(
  '검수 해제의 빈 사유는 실제 OpenAPI 허용 범위에서 전달하고 서버 400을 보존한다',
  async (reason) => {
    const body = { message: '처리 사유가 필요합니다.' };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(body, { status: 400 }));

    vi.stubGlobal('fetch', fetchMock);

    const response = await invoke('POST', `/moderation/holds/${id}/release`, {
      reason,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(body);
    expect(fetchMock).toHaveBeenCalledOnce();
  },
);

it('AI 비용의 Langfuse 필드·null·0·미연결 비용을 바꾸지 않고 전달한다', async () => {
  const body = {
    asOf: '2026-10-23T03:00:00Z',
    from: '2026-10-21',
    to: '2026-10-23',
    currency: 'KRW',
    usdKrwRate: 1400,
    chatImageUnitCostKrw: 48,
    pendingDates: ['2026-10-22'],
    daily: [
      {
        date: '2026-10-21',
        byFeature: [
          {
            feature: 'chat_response',
            model: 'AURORA',
            calls: 1,
            costKrw: null,
          },
          { feature: 'story_completion', model: 'ZERO', calls: 1, costKrw: 0 },
        ],
      },
    ],
    unmapped: [{ traceName: '새 기능', costKrw: 2.8 }],
    unpricedModels: ['ZERO'],
    totals: { costKrw: 2.8, costPerTurnKrw: 0, costPerStoryKrw: 0 },
  };
  const fetchMock = vi.fn().mockResolvedValue(Response.json(body));

  vi.stubGlobal('fetch', fetchMock);

  const response = await invoke(
    'GET',
    '/quality/ai-cost?from=2026-10-21&to=2026-10-23',
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(body);
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://upstream.example/api/v1/admin/quality/ai-cost?from=2026-10-21&to=2026-10-23',
  );
  expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe(
    'Bearer forged-test-token',
  );
});

it('공지 태그만 수정하는 PATCH도 생성 계약을 통과해 그대로 전달한다', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json({ tag: 'PROMOTION' }));

  vi.stubGlobal('fetch', fetchMock);

  const body = { ...reason, tag: 'PROMOTION' };

  expect((await invoke('PATCH', `/notices/${id}`, body)).status).toBe(200);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(body));
});

it.each([
  ['POST', { body: '본문', tag: 'SERVICE' }],
  ['POST', { title: '공지', tag: 'SERVICE' }],
  ['POST', { title: '공지', body: '본문' }],
  ['POST', { title: '가'.repeat(101), body: '본문', tag: 'SERVICE' }],
  ['POST', { title: '공지', body: '가'.repeat(5001), tag: 'SERVICE' }],
  ['POST', { title: '공지', body: '본문', tag: 'NEWS' }],
  ['PATCH', { title: ' ' }],
  ['PATCH', { body: '가'.repeat(5001) }],
] as const)(
  '공지의 새 필수·길이·태그 계약을 %s 업스트림 전에 검사한다',
  async (method, fields) => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    expect(
      (
        await invoke(
          method,
          method === 'POST' ? '/notices' : `/notices/${id}`,
          { ...reason, ...fields },
        )
      ).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

it('알림 문구 없는 공지 작성과 제목만 수정을 생성 계약으로 검증하고 전달한다', async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ noticeId: id }));

  vi.stubGlobal('fetch', fetchMock);

  for (const [method, path, body] of [
    [
      'POST',
      '/notices',
      { ...reason, title: '공지', body: '본문', tag: 'MAINTENANCE' },
    ],
    ['PATCH', `/notices/${id}`, { ...reason, title: '정정' }],
  ] as const) {
    expect((await invoke(method, path, body)).status).toBe(200);
    expect(fetchMock.mock.calls.at(-1)![1].body).toBe(JSON.stringify(body));
  }
});

it('공지를 연결한 캠페인 생성과 실패 사유 및 재실행 응답을 그대로 전달한다', async () => {
  const body = { ...reason, title: '점검 안내', body: '본문', noticeId: id };
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { campaignId: id, noticeId: id, kind: 'SERVICE', failureReason: null },
        { status: 201 },
      ),
    );

  vi.stubGlobal('fetch', fetchMock);

  const created = await invoke('POST', '/notifications/campaigns', body);

  expect(created.status).toBe(201);
  expect(await created.json()).toMatchObject({
    noticeId: id,
    kind: 'SERVICE',
    failureReason: null,
  });
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(body));
  fetchMock.mockResolvedValueOnce(
    Response.json({
      status: 'FAILED',
      failureReason: 'NOTICE_NOT_PUBLISHED',
      noticeId: id,
      kind: 'SERVICE',
    }),
  );
  expect(
    await (await invoke('GET', `/notifications/campaigns/${id}`)).json(),
  ).toMatchObject({ status: 'FAILED', failureReason: 'NOTICE_NOT_PUBLISHED' });
  fetchMock.mockResolvedValueOnce(
    Response.json({
      status: 'SCHEDULED',
      failureReason: null,
      noticeId: id,
      kind: 'SERVICE',
    }),
  );
  expect(
    await (
      await invoke('POST', `/notifications/campaigns/${id}/retry`, reason)
    ).json(),
  ).toMatchObject({ status: 'SCHEDULED', failureReason: null });
});

it('캠페인의 잘못된 noticeId는 업스트림 전에 거부한다', async () => {
  const fetchMock = vi.fn();

  vi.stubGlobal('fetch', fetchMock);
  expect(
    (
      await invoke('POST', '/notifications/campaigns', {
        ...reason,
        title: '알림',
        body: '본문',
        noticeId: 'bad',
      })
    ).status,
  ).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each(['days=14', 'days=no'])(
  '푸시 열람의 %s는 실제 문자열 계약으로 전달하고 서버 400을 보존한다',
  async (query) => {
    const body = { message: '기간이 올바르지 않습니다.' };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(body, { status: 400 }));

    vi.stubGlobal('fetch', fetchMock);

    const response = await invoke('GET', `/campaigns/push-opens?${query}`);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(body);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://upstream.example/api/v1/admin/campaigns/push-opens?${query}`,
    );
  },
);
it.each(['days=7&days=30', 'campaign=TEST'])(
  '푸시 열람의 지원하지 않는 %s 쿼리는 업스트림 전에 거부한다',
  async (query) => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    expect((await invoke('GET', `/campaigns/push-opens?${query}`)).status).toBe(
      400,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it('푸시 열람의 null 기준 시각·열람 수·측정 상태·100% 초과 비율을 그대로 반환한다', async () => {
  const data = {
    asOf: null,
    pendingDates: [],
    from: '2026-10-18',
    to: '2026-10-24',
    measuredFrom: null,
    activityFrom: null,
    campaigns: [{ openState: 'MEASURED', pushOpens: 3, pushOpenRate: 1.5 }],
    activityTypes: [
      { openState: 'BEFORE_MEASUREMENT', pushOpens: null, pushOpenRate: null },
    ],
  };

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(data)));
  expect(
    await (await invoke('GET', '/campaigns/push-opens?days=7')).json(),
  ).toEqual(data);
});

it('AI 비용의 보관 만료·null 받은 시각·서버 원가를 재계산 없이 전달한다', async () => {
  const data = {
    asOf: null,
    pendingDates: ['2026-10-22'],
    expiredDates: ['2026-10-21'],
    retentionDays: 30,
    retentionStartDate: '2026-10-23',
    daily: [
      {
        date: '2026-10-21',
        byFeature: [
          { feature: 'chat_image', costKrw: 96 },
          { feature: 'chat_response', costKrw: null },
        ],
      },
    ],
    totals: { costKrw: 777, costPerTurnKrw: null, costPerStoryKrw: 3.5 },
  };

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(data)));
  expect(
    await (
      await invoke('GET', '/quality/ai-cost?from=2026-10-21&to=2026-10-23')
    ).json(),
  ).toEqual(data);
});

it.each([
  '/stories?deleted=all',
  '/stories?deleted=exclude',
  '/chats?deleted=INCLUDE',
  '/chats?deleted=exclude',
])('%s의 잘못된 삭제 필터는 업스트림 전에 거부한다', async (path) => {
  const fetchMock = vi.fn();

  vi.stubGlobal('fetch', fetchMock);
  expect((await invoke('GET', path)).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([
  {},
  { reasonCode: 'UNKNOWN' },
  { reasonCode: 'ETC' },
  { reasonCode: 'ETC', reasonDetail: '   ' },
  { reasonCode: 'ETC', reasonDetail: 'x'.repeat(101) },
  { reasonCode: 'SEXUAL_CONTENT', reasonDetail: '사유' },
  { reasonCode: 'SEXUAL_CONTENT', memo: ' ' },
  { reasonCode: 'SEXUAL_CONTENT', memo: 'x'.repeat(501) },
])('공개 중단의 잘못된 본문 %j는 업스트림 호출 전에 거부한다', async (body) => {
  const fetchMock = vi.fn();

  vi.stubGlobal('fetch', fetchMock);
  expect(
    (await invoke('POST', `/moderation/stories/${id}/takedown`, body)).status,
  ).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('공지와 스토리 동시 지정의 서버 400을 원문대로 전달한다', async () => {
  const body = {
    ...reason,
    title: '알림',
    body: '본문',
    storyId: id,
    noticeId: id,
  };
  const error = {
    code: 'BAD_REQUEST',
    message: '공지와 스토리를 함께 지정할 수 없습니다.',
  };
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json(error, { status: 400 }));

  vi.stubGlobal('fetch', fetchMock);

  const response = await invoke('POST', '/notifications/campaigns', body);

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual(error);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(body));
});

it.each([20, 0, undefined])(
  '서버 채팅의 요약 끝 턴 %s를 목록과 상세에서 보존한다',
  async (summaryThroughTurn) => {
    const chat = {
      chatId: id,
      turnCount: 25,
      ...(summaryThroughTurn === undefined ? {} : { summaryThroughTurn }),
    };
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          Response.json(
            url.endsWith(`/chats/${id}`) ? chat : { items: [chat] },
          ),
        ),
      );

    vi.stubGlobal('fetch', fetchMock);
    expect(await (await invoke('GET', `/chats/${id}`)).json()).toEqual(chat);
    expect(
      await (await invoke('GET', '/chats?aiFeature=chat_compact')).json(),
    ).toEqual({ items: [chat] });
  },
);
