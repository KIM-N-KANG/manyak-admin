import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { adminEndpoints } from '@/api/admin-endpoints';
import { GET as handle } from '@/app/api/admin-upstream/[...path]/route';
import { sessionCookie } from '@/features/auth/session';
import { proxy } from '@/proxy';

const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const cookie = `${sessionCookie}=${Buffer.from(JSON.stringify({ accessToken: 'forged-test-token', nickname: '테스트 관리자' })).toString('base64url')}`;
const reason = { reason: '테스트 사유' };
const presign = { kind: 'COVER', contentType: 'image/png', contentLength: 32 };
const cases: [string, string, string, unknown?][] = [
  [
    'GET',
    '/notices?status=DRAFT&size=10&sort=updatedAt&q=test',
    '/notices?status=DRAFT&size=10&sort=updatedAt&q=test',
  ],
  [
    'POST',
    '/notices',
    '/notices',
    { ...reason, title: '공지', body: '공지 본문' },
  ],
  ['GET', `/notices/${id}`, `/notices/${id}`],
  [
    'PATCH',
    `/notices/${id}`,
    `/notices/${id}`,
    { ...reason, title: '수정 공지' },
  ],
  ['DELETE', `/notices/${id}`, `/notices/${id}`, reason],
  [
    'POST',
    `/notices/${id}/publish`,
    `/notices/${id}/publish`,
    { ...reason, notify: true, notificationKind: 'SERVICE' },
  ],
  ['POST', `/notices/${id}/unpublish`, `/notices/${id}/unpublish`, reason],
  ['GET', '/dashboard/summary', '/dashboard/summary'],
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
  ['GET', `/stories/${id}`, `/stories/${id}`],
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
    '/notifications/campaigns?status=SENT&page=2&size=10',
    '/push/campaigns?status=SENT&page=2&size=10',
  ],
  [
    'POST',
    '/notifications/campaigns',
    '/push/campaigns',
    { ...reason, title: '제목', body: '본문' },
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
    '/notifications/delivery-stats?from=2026-10-01&kind=SERVICE',
    '/push/delivery-stats?from=2026-10-01&kind=SERVICE',
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
  expect(cases).toHaveLength(
    adminEndpoints.filter((e) => e.implemented).length,
  );
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
  ['POST', `/notices/${id}/publish`, { ...reason, notify: 'true' }],
  ['GET', '/members?page=0'],
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
  ['GET', '/chats?turnBucket=11'],
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
