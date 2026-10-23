import { NextRequest } from 'next/server';
import { afterEach, expect, it, vi } from 'vitest';

import {
  eventLabel,
  modelLabel,
  percent,
  ratio,
} from '@/features/analytics/config';
import {
  analyticsRange,
  analyticsRefetch,
  defaultPeriod,
} from '@/features/analytics/range';
import { seriesGroups } from '@/features/analytics/series';
import { campaignCatalog } from '@/fixtures/metrics';
import { metricsRoute } from '@/fixtures/metrics-route';

const today = '2026-10-23';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it('5-1 공통: 기간 상한은 선택을 보존하고 끝 날짜를 유지한 조정 범위를 반환한다', () => {
  const params = new URLSearchParams('from=2026-09-24&to=2026-10-23');
  const value = analyticsRange(params, 'creation', undefined, today);

  expect(value.error).toBe('limit');
  expect(value.from).toBe('2026-09-24');
  expect(value.adjusted).toEqual({ from: '2026-10-04', to: today });
  expect(params.toString()).toBe('from=2026-09-24&to=2026-10-23');
  expect(
    analyticsRange(
      new URLSearchParams('range=last7d'),
      'retention',
      undefined,
      today,
    ).adjusted,
  ).toEqual({ from: '2026-10-17', to: '2026-10-22' });
  expect(defaultPeriod('retention', undefined, today)).toEqual({
    from: '2026-10-16',
    to: '2026-10-22',
  });
  expect(defaultPeriod('sources', undefined, today)).toEqual({
    from: '2026-10-17',
    to: today,
  });
  expect(defaultPeriod('sessions', undefined, today).from).toBe('2026-10-10');

  const third = campaignCatalog(today).items[2];

  expect(
    analyticsRange(new URLSearchParams(), 'story-detail', third, today).error,
  ).toBe('limit');
});
it('5-1 비율·표시 이름은 0과 null, 100% 초과와 새 코드를 구분한다', () => {
  expect(percent(ratio(7, 6))).toBe('116.7%');
  expect(percent(ratio(0, 10))).toBe('0.0%');
  expect(percent(ratio(0, 0))).toBe('계산할 수 없음');
  expect(eventLabel('client_onboarding_viewed')).toBe('환영 다이얼로그 조회');
  expect(eventLabel('client_chat_messageInput_submitted', 3)).toBe(
    '턴 3 채팅 메시지 전송',
  );
  expect(eventLabel('new_event')).toBe('new_event');
  expect(modelLabel('AURORA')).toBe('오로라');
  expect(modelLabel('LITE')).toBe('라이트');
  expect(modelLabel('NOVA')).toBe('NOVA');
  expect(seriesGroups.input.map((s) => s.key)).toEqual([
    'block',
    'plain',
    'choice',
    'unknown',
  ]);
  expect(seriesGroups.platform.map((s) => [s.key, s.color, s.dash])).toEqual([
    ['all', 'var(--primary)', undefined],
    ['web', 'var(--muted-foreground)', '6 3'],
    ['android', 'var(--primary-text)', '2 3'],
    ['unknown', 'var(--chart-3)', '8 3 2 3'],
  ]);
});
it('5-1 준비 중 재요청은 날짜 또는 MAU null이 남을 때만 60초이다', () => {
  expect(
    analyticsRefetch({
      state: { data: { pendingDates: [], monthlyActiveUsers: null } },
    }),
  ).toBe(60000);
  expect(
    analyticsRefetch({ state: { data: { pendingDates: ['2026-10-21'] } } }),
  ).toBe(60000);
  expect(
    analyticsRefetch({
      state: { data: { pendingDates: [], monthlyActiveUsers: 0 } },
    }),
  ).toBe(false);
});
it('14개 fixture BFF는 생성 스키마로 요청을 받고 실제 응답 계약 구조를 반환한다', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  vi.stubEnv('VERCEL_ENV', 'preview');

  for (const path of [
    'campaigns',
    'campaigns/analytics',
    'campaigns/funnels/creation',
    'campaigns/funnels/story-detail',
    'campaigns/sources',
    'users/activity',
    'users/retention',
    'users/sessions',
    'users/signups',
    'conversion/funnels/web-first-visit',
    'conversion/turn-reach',
    'quality/client',
    'quality/chat-options',
    'quality/ai-cost',
  ]) {
    const query = path === 'campaigns' ? '' : '?from=2026-10-17&to=2026-10-22';
    const response = await metricsRoute(
      new NextRequest(`http://localhost/api/${path}${query}`),
    );

    expect(response.status, path).toBe(200);

    const data = await response.json();

    expect(path === 'campaigns' ? data.items : data.asOf).toBeTruthy();
  }

  for (const query of [
    'from=2026-10-01&to=2026-10-23',
    'from=2026-10-01',
    'from=2026-10-20&to=2026-10-23&segment=ads',
  ])
    expect(
      (
        await metricsRoute(
          new NextRequest(
            `http://localhost/api/campaigns/funnels/creation?${query}`,
          ),
        )
      ).status,
    ).toBe(400);

  expect(
    (
      await metricsRoute(
        new NextRequest(
          'http://localhost/api/users/retention?from=2026-10-17&to=2026-10-23',
        ),
      )
    ).status,
  ).toBe(400);
  vi.stubEnv('ADMIN_ANALYTICS_FIXTURE_SCENARIO', 'unavailable');
  expect(
    (
      await metricsRoute(
        new NextRequest(
          'http://localhost/api/users/activity?from=2026-10-17&to=2026-10-22',
        ),
      )
    ).status,
  ).toBe(503);
});
