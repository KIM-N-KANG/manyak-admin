import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import {
  CampaignPushOpensResponse,
  PushOpensResponse,
} from '@/api/generated/zod/admin';
import { GET as upstream } from '@/app/api/admin-upstream/[...path]/route';
import { GET } from '@/app/api/campaigns/push-opens/[campaignId]/route';
import { analyticsRefetch } from '@/features/analytics/range';
import { sessionCookie } from '@/features/auth/session';
import { metricFixture } from '@/fixtures/metrics';
import { getCampaignOpens } from '@/fixtures/notification-opens';
import { listCampaigns } from '@/fixtures/notifications';

const id = 'c1000000-0000-4000-8000-000000000005';
const path = `/campaigns/push-opens/${id}`;
const fixture = (campaignId = id, query = '') =>
  GET(
    new Request(
      `https://admin.example/api/campaigns/push-opens/${campaignId}${query}`,
    ),
    { params: Promise.resolve({ campaignId }) },
  );

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('5-1-16 모든 고정 캠페인의 열람 응답은 생성 스키마와 일치한다', async () => {
  for (const campaign of listCampaigns()) {
    const response = await fixture(campaign.campaignId);

    expect(response.status).toBe(200);

    const value = await response.json();

    expect(CampaignPushOpensResponse.safeParse(value).success).toBe(true);
    expect(value.campaignId).toBe(campaign.campaignId);

    if (campaign.startedAt === null)
      expect(value).toMatchObject({
        from: null,
        to: null,
        openState: 'PENDING',
        pushOpens: null,
        inboxOpens: null,
      });
  }
});
it('경로의 UUID, 없는 캠페인, 쿼리를 생성 계약과 데이터에 따라 거절한다', async () => {
  expect((await fixture('bad-id')).status).toBe(400);
  expect((await fixture('c1000000-0000-4000-8000-999999999999')).status).toBe(
    404,
  );
  expect((await fixture(id, '?days=7')).status).toBe(400);
  vi.stubEnv('VERCEL_ENV', 'production');
  expect((await fixture()).status).toBe(503);
});
it('웹과 앱 및 알림함 신규 필드의 타입은 생성 응답 Zod로 검증한다', () => {
  const result = getCampaignOpens(id);

  for (const field of [
    'webPushOpens',
    'androidPushOpens',
    'inboxOpens',
    'webInboxOpens',
    'androidInboxOpens',
  ]) {
    expect(
      CampaignPushOpensResponse.safeParse({ ...result, [field]: 'invalid' })
        .success,
    ).toBe(false);
  }

  const overview = metricFixture(
    '/campaigns/push-opens',
    new URLSearchParams('from=2026-10-23&to=2026-10-30'),
  );

  expect(PushOpensResponse.safeParse(overview).success).toBe(true);
  expect(
    analyticsRefetch({ state: { data: { pendingDates: ['2026-10-29'] } } }),
  ).toBe(60000);
  expect(analyticsRefetch({ state: { data: { pendingDates: [] } } })).toBe(
    false,
  );
});
it('서버 모드는 쿼리 없이 새 생성 연산으로 전달하며 부분 집계, null, 100% 초과와 오류를 보존한다', async () => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'server');
  vi.stubEnv('API_BASE_URL', 'https://upstream.example');

  const token = Buffer.from(
    JSON.stringify({ accessToken: 'fixture-token', nickname: '테스트' }),
  ).toString('base64url');

  expect(findAdminEndpoint(path, 'GET')).toMatchObject({
    implemented: true,
    serverPath: `/api/v1/admin${path}`,
  });

  const invoke = (campaignId: string, query = '', authenticated = true) =>
    upstream(
      new NextRequest(
        `https://admin.example/api/admin-upstream/campaigns/push-opens/${campaignId}${query}`,
        {
          headers: authenticated ? { Cookie: `${sessionCookie}=${token}` } : {},
        },
      ),
      {
        params: Promise.resolve({
          path: ['campaigns', 'push-opens', campaignId],
        }),
      },
    );
  const body = {
    ...getCampaignOpens(id),
    pendingDates: ['2026-10-29'],
    pushOpenRate: 1.5,
    androidPushOpens: null,
    androidInboxOpens: null,
  };

  for (const status of [200, 404, 401, 503]) {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(body, { status }));

    vi.stubGlobal('fetch', fetchMock);

    const response = await invoke(id);

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(body);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://upstream.example/api/v1/admin${path}`,
    );
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe(
      'Bearer fixture-token',
    );
    expect(
      response.headers.get('Set-Cookie')?.includes('Max-Age=0') ?? false,
    ).toBe(status === 401);
  }

  const fetchMock = vi.fn();

  vi.stubGlobal('fetch', fetchMock);
  expect((await invoke('invalid')).status).toBe(400);
  expect((await invoke(id, '?from=2026-10-21')).status).toBe(400);
  expect((await invoke(id, '', false)).status).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
});
