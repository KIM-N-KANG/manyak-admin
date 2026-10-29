import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
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
import type {
  AiCostResponse,
  SignupResponse,
} from '@/features/analytics/types';
import { summary } from '@/fixtures/dashboard';
import { members } from '@/fixtures/entities';
import { campaignCatalog, metricFixture } from '@/fixtures/metrics';
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
  expect(defaultPeriod('sessions', undefined, today).from).toBe('2026-09-24');

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
    ['all', 'var(--chart-1)', undefined],
    ['web', 'var(--chart-2)', '6 3'],
    ['android', 'var(--chart-3)', '2 3'],
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
it('15개 fixture BFF는 생성 스키마로 요청을 받고 실제 응답 계약 구조를 반환한다', async () => {
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
    'campaigns/push-opens',
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

it('가입 fixture는 탈퇴를 포함하고 기간을 바꿔도 같은 날의 서비스 누계가 일치한다', () => {
  const query = new URLSearchParams('from=2026-10-15&to=2026-10-23');
  const seven = metricFixture('/users/signups', query) as SignupResponse;
  const single = metricFixture(
    '/users/signups',
    new URLSearchParams('from=2026-10-23&to=2026-10-23'),
  ) as SignupResponse;

  expect(summary.members.total).toBe(members.length);
  expect(summary.members.total).toBe(
    summary.members.active + summary.members.withdrawn,
  );
  expect(summary.members.withdrawn).toBeGreaterThan(0);
  expect(seven.daily[0].cumulativeSignups).toBeGreaterThan(
    seven.daily[0].signups.total,
  );
  expect(seven.daily.at(-1)?.cumulativeSignups).toBe(summary.members.total);
  expect(single.daily[0].cumulativeSignups).toBe(summary.members.total);
  expect(single.daily[0].signups.total).toBe(0);
});

it('범주색 다섯 개는 정본의 서로 다른 색상이며 UI 토큰과 구분된다', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');

  ['#01A76B', '#3B6FD4', '#E07A1F', '#8B5CD6', '#D9467A'].forEach(
    (color, index) => {
      expect(css.toLowerCase()).toContain(
        `--chart-${index + 1}: ${color.toLowerCase()};`,
      );
    },
  );
});

it('AI 비용 fixture는 Langfuse 출처 필드·준비 중·0원·미연결 비용을 제공한다', () => {
  const data = metricFixture(
    '/quality/ai-cost',
    new URLSearchParams('from=2026-10-21&to=2026-10-23'),
  ) as AiCostResponse;

  expect(data.usdKrwRate).toBe(1400);
  expect(data.unmapped).toEqual([{ traceName: '새 기능', costKrw: 2.8 }]);
  expect(data.pendingDates).toEqual([]);
  expect(data.daily[0].byFeature.some((item) => item.costKrw === 0)).toBe(true);
  expect(data.daily[0].byFeature.some((item) => item.costKrw === null)).toBe(
    true,
  );

  const pending = metricFixture(
    '/quality/ai-cost',
    new URLSearchParams('from=2026-10-20&to=2026-10-23'),
  ) as AiCostResponse;

  expect(pending.pendingDates).toEqual(['2026-10-22']);
  expect(
    pending.daily[2].byFeature.find((item) => item.feature === 'chat_response')
      ?.costKrw,
  ).toBeNull();
});

it('보관 기간 만료만으로 재요청하지 않으며 준비 중과 함께면 60초를 유지한다', () => {
  const data = {
    asOf: null,
    expiredDates: ['2026-09-01'],
    pendingDates: [] as string[],
  };

  expect(analyticsRefetch({ state: { data } })).toBe(false);
  data.pendingDates.push('2026-10-22');
  expect(analyticsRefetch({ state: { data } })).toBe(60000);
  expect(seriesGroups.platform.map((s) => s.label)).toEqual([
    '전체',
    '웹',
    '앱',
  ]);
});

it('AI 비용 fixture는 보관 기간 밖 날짜에도 이미지 비용을 남기며 받은 시각은 null이다', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));

  const data = metricFixture(
    '/quality/ai-cost',
    new URLSearchParams('from=2026-09-01&to=2026-09-02'),
  ) as AiCostResponse;

  expect(data.expiredDates).toEqual(['2026-09-01', '2026-09-02']);
  expect(data.pendingDates).toEqual([]);
  expect(data.asOf).toBeNull();
  expect(data.retentionDays).toBe(30);
  expect(data.retentionStartDate).toBe('2026-09-25');
  expect(
    data.daily[0].byFeature.find((item) => item.feature === 'chat_image')
      ?.costKrw,
  ).toBe(144);
  expect(
    data.daily[0].byFeature.find((item) => item.feature === 'chat_response')
      ?.costKrw,
  ).toBeNull();
});

it.each(['visitor', 'signup', 'first-chat'])(
  '리텐션 cohort=%s는 생성 검증 뒤 fixture와 upstream 경로에 반영한다',
  async (cohort) => {
    const response = await metricsRoute(
      new Request(
        `http://localhost/api/users/retention?from=2026-10-01&to=2026-10-02&cohort=${cohort}`,
      ),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).cohort).toBe(cohort);
  },
);
it('지원하지 않는 시작 집단은 fixture BFF에서 400이다', async () => {
  const response = await metricsRoute(
    new Request(
      'http://localhost/api/users/retention?from=2026-10-01&to=2026-10-02&cohort=unknown',
    ),
  );

  expect(response.status).toBe(400);
});
it.each(['all', 'guest', 'member'])(
  '세션 길이 분포 segment=%s 경로는 생성 검증과 구간 순서를 따른다',
  async (segment) => {
    const response = await metricsRoute(
      new Request(
        `http://localhost/api/users/session-lengths?from=2026-10-01&to=2026-10-02&segment=${segment}`,
      ),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.segment).toBe(segment);
    expect(body.bins).toHaveLength(9);
    expect(body.bins[0]).toEqual({ fromSeconds: 0, toSeconds: 3 });
    expect(body.bins.at(-1)).toEqual({ fromSeconds: 3600, toSeconds: 86400 });
    expect(body.platforms.map((p: { platform: string }) => p.platform)).toEqual(
      ['all', 'web', 'android'],
    );
  },
);
it.each([
  'segment=unknown',
  'from=2026-10-01',
  'from=2026-10-02&to=2026-10-01',
])('세션 길이 분포의 잘못된 조건 %s는 400이다', async (query) => {
  expect(
    (
      await metricsRoute(
        new Request(`http://localhost/api/users/session-lengths?${query}`),
      )
    ).status,
  ).toBe(400);
});
it('새 퍼널 단계 이름은 홈 진입과 간편 제작 진입이다', () => {
  expect(eventLabel('client_storyList_viewed')).toBe('홈 진입');
  expect(eventLabel('client_storyCreate_viewed')).toBe('간편 제작 진입');
});

it('대화 요약 fixture는 모델 없는 호출과 Langfuse 모델 비용을 나누고 총 비용과 턴당 원가에 포함한다', () => {
  const data = metricFixture(
    '/quality/ai-cost',
    new URLSearchParams('from=2026-10-21&to=2026-10-21'),
  ) as AiCostResponse;

  expect(
    data.daily[0].byFeature.filter((item) => item.feature === 'chat_compact'),
  ).toEqual([
    {
      feature: 'chat_compact',
      model: null,
      calls: 2,
      callsWithoutTokens: 2,
      inputTokens: 0,
      outputTokens: 0,
      costKrw: null,
    },
    {
      feature: 'chat_compact',
      model: 'claude-x',
      calls: 0,
      callsWithoutTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      costKrw: 14,
    },
  ]);
  expect(data.totals.costKrw).toBe(166.8);
  expect(data.totals.costPerTurnKrw).toBe(10);
});
