import { expect, it } from 'vitest';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import { eventLabel, funnels } from '@/features/analytics/config';
import { analyticsRange } from '@/features/analytics/range';
import type * as T from '@/features/analytics/types';
import { metricFixture } from '@/fixtures/metrics';
import { metricsRoute } from '@/fixtures/metrics-route';

const query = new URLSearchParams('from=2026-10-21&to=2026-10-23');

type Responses = {
  '/users/sessions': T.SessionResponse;
  '/users/session-lengths': T.SessionLengthResponse;
  '/quality/client': T.QualityResponse;
  '/users/signups': T.SignupResponse;
  '/quality/chat-options': T.ChatOptionResponse;
  '/campaigns/analytics': T.CampaignAnalyticsResponse;
  '/campaigns/funnels/activation': T.CampaignActivationResponse;
  '/campaigns/reach': T.CampaignReachResponse;
  '/campaigns/creatives': T.CampaignCreativesResponse;
  '/campaigns/app-transfer': T.AppTransferResponse;
  '/users/app-activation': T.AppActivationResponse;
};

const fixture = <P extends keyof Responses>(path: P) =>
  metricFixture(path, query) as unknown as Responses[P];

it('5-1 성장 신규 지표는 서버 계약 필드와 준비 중 날짜를 유지한다', () => {
  expect(fixture('/users/sessions').daily[0].sessionsPerUser!.web).toBeTypeOf(
    'number',
  );
  expect(fixture('/users/session-lengths').daily![0].sessions.all).toBeTypeOf(
    'number',
  );
  expect(
    fixture('/quality/client').daily[0].activity!.coreActiveUsers,
  ).toBeTypeOf('number');
  expect(fixture('/users/signups').daily[0].signupRate!.web).toBeTypeOf(
    'number',
  );
  expect(
    fixture('/quality/chat-options').daily[0].chatStartersByPersonaType!.persona
      .web,
  ).toBeTypeOf('number');
  expect(
    fixture('/campaigns/analytics').daily[0].newVisitorsByDevice!.ios,
  ).toBeTypeOf('number');
});

it('5-1 신규 유입과 앱 활성화는 계약의 응답 구조를 제공한다', () => {
  expect(fixture('/campaigns/funnels/activation').steps).toHaveLength(4);
  expect(fixture('/campaigns/reach').deepChatUsers.ads).toBeTypeOf('number');
  expect(
    fixture('/campaigns/creatives').totals.signups.at(-1)!.content,
  ).toBeNull();
  expect(
    fixture('/campaigns/app-transfer').daily[0].bannerClickRate,
  ).toBeNull();
  expect(fixture('/users/app-activation').totals.activationRate).toBeTypeOf(
    'number',
  );
});

it('5-1 새 퍼널 표시 이름과 플랫폼 고정 키를 지원한다', () => {
  expect(eventLabel('client_storyCreate_tagCategory_selected')).toBe(
    '장르 선택 완료',
  );
  expect(eventLabel('login_succeeded')).toBe('로그인 성공');
  expect(funnels.map(([key]) => key)).toEqual(
    expect.arrayContaining([
      'first-visit-activation',
      'login-signup',
      'android-activation',
      'web-to-android',
      'creation-entry-chat',
    ]),
  );
  expect(
    analyticsRange(
      new URLSearchParams('from=2026-09-01&to=2026-10-23'),
      'activation',
    ).maxDays,
  ).toBe(31);
});

it.each([
  '/campaigns/funnels/activation',
  '/campaigns/reach',
  '/campaigns/creatives',
  '/campaigns/app-transfer',
  '/users/app-activation',
])('새 경로 %s는 생성 연산으로 fixture와 서버 모드에서 연다', async (path) => {
  expect(findAdminEndpoint(path, 'GET')?.implemented).toBe(true);

  const response = await metricsRoute(
    new Request(`http://localhost/api${path}?${query}`),
  );

  expect(response.status).toBe(200);
  expect((await response.json()).from).toBe('2026-10-21');

  const invalid = await metricsRoute(
    new Request(`http://localhost/api${path}?from=invalid&to=2026-10-23`),
  );

  expect(invalid.status).toBe(400);
});

it('새 퍼널은 생성 연산과 서버 지원에 따라 전달 가능하다', () => {
  for (const funnel of [
    'first-visit-activation',
    'login-signup',
    'android-activation',
    'web-to-android',
    'creation-entry-chat',
  ]) {
    expect(
      findAdminEndpoint(`/conversion/funnels/${funnel}`, 'GET')?.implemented,
    ).toBe(true);
  }

  expect(
    findAdminEndpoint('/conversion/funnels/story-creation', 'GET')?.implemented,
  ).toBe(true);
});
