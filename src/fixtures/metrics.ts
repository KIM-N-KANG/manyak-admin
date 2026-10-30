import { chartDates, shiftDate } from '@/features/analytics/range';
import { TURN_THRESHOLDS } from '@/features/analytics/turn-thresholds';
import type * as T from '@/features/analytics/types';
import { kstToday } from '@/features/dashboard/date-range';
import { members } from '@/fixtures/entities';
import { kstDate } from '@/fixtures/query';

import { newMetricFixture } from './metrics-next';

const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

export function campaignCatalog(today = kstToday()): {
  items: T.CampaignDefinition[];
} {
  return {
    items: [
      {
        key: 'first',
        name: '1차',
        campaign: 'FIRST_2026',
        startDate: shiftDate(today, -100),
        endDate: shiftDate(today, -80),
        storyId: id,
      },
      {
        key: 'second',
        name: '2차',
        campaign: 'SECOND_2026',
        startDate: shiftDate(today, -79),
        endDate: shiftDate(today, -60),
        storyId: null,
      },
      {
        key: 'third',
        name: '3차',
        campaign: 'THIRD_2026',
        startDate: shiftDate(today, -59),
        endDate: shiftDate(today, -25),
        storyId: id,
      },
      {
        key: 'fourth',
        name: '4차',
        campaign: 'FOURTH_2026',
        startDate: shiftDate(today, -6),
        endDate: null,
        storyId: id,
      },
    ],
  };
}

const platform = (i: number): T.PlatformCounts => ({
  all: i,
  web: Math.round(i * 0.78),
  android: Math.round(i * 0.25),
  unknown: Math.round(i * 0.08),
});
const metricPlatform = (i: number): T.MetricPlatformCounts => {
  const { all, web, android } = platform(i);

  return { all, web, android };
};
const segment = (all: number): T.CampaignSegments => ({
  all,
  ads: Math.round(all * 0.7),
  nonAds: all - Math.round(all * 0.7),
});
const events = [
  'client_storyCreate_viewed',
  'client_storyCreate_tagCategory_selected',
  'client_storyCreate_storyGeneration_requested',
  'client_storyCreate_storylineOption_selected',
  'client_storyCreate_storyCompletion_requested',
  'client_chat_messageInput_submitted',
];

export function metricFixture(path: string, query: URLSearchParams) {
  if (path === '/campaigns') return campaignCatalog();

  const from = query.get('from')!,
    to = query.get('to')!;
  const dates = chartDates(from, to);
  const base = { asOf: `${to}T03:00:00Z`, from, to };
  const pendingDates = dates.length > 3 ? [dates[dates.length - 2]] : [];
  const ready = dates.filter((date) => !pendingDates.includes(date));
  const campaign = query.get('campaign') ?? 'FOURTH_2026';
  const audience = query.get('segment') ?? 'all';
  const sessionOffset = { guest: -90, member: 60 }[audience] ?? 0;

  const next = newMetricFixture(path, base, ready, pendingDates, campaign);

  if (next) return next;

  if (path === '/campaigns/push-opens') {
    const measuredFrom = '2026-10-21';
    const activityFrom =
      to < measuredFrom ? null : from > measuredFrom ? from : measuredFrom;
    const campaigns: T.PushOpensResponse['campaigns'] = [
      {
        campaignId: id,
        title: '점검 알림',
        kind: 'SERVICE',
        noticeId: id,
        startedAt: `${to}T02:00:31Z`,
        deliveredMembers: 412,
        openState: 'MEASURED',
        pushOpens: 58,
        pushOpenRate: 0.1408,
      },
      {
        campaignId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
        title: '가을 이벤트 안내',
        kind: 'MARKETING',
        noticeId: null,
        startedAt: `${shiftDate(to, -1)}T02:00:00Z`,
        deliveredMembers: 230,
        openState: 'NO_LINK',
        pushOpens: null,
        pushOpenRate: null,
      },
      {
        campaignId: '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b',
        title: '발송 준비 알림',
        kind: 'MARKETING',
        noticeId: null,
        startedAt: `${shiftDate(to, -2)}T02:00:00Z`,
        deliveredMembers: 0,
        openState: 'PENDING',
        pushOpens: null,
        pushOpenRate: null,
      },
      {
        campaignId: '4b7f0c2a-9d1e-4f3a-8c5b-6e2d1a0f9b37',
        title: '측정 전 알림',
        kind: 'SERVICE',
        noticeId: null,
        startedAt: `${from}T01:00:00Z`,
        deliveredMembers: 198,
        openState: 'BEFORE_MEASUREMENT',
        pushOpens: null,
        pushOpenRate: null,
      },
    ];

    return {
      ...base,
      asOf: activityFrom ? base.asOf : null,
      pendingDates: activityFrom
        ? pendingDates.filter((date) => date >= measuredFrom)
        : [],
      measuredFrom,
      campaigns: campaigns
        .filter(
          (row) =>
            row.startedAt.slice(0, 10) >= from &&
            row.startedAt.slice(0, 10) <= to,
        )
        .map((row) =>
          row.startedAt.slice(0, 10) < measuredFrom
            ? {
                ...row,
                openState: 'BEFORE_MEASUREMENT' as const,
                pushOpens: null,
                pushOpenRate: null,
              }
            : row,
        ),
      activityFrom,
      activityTypes: (
        [
          'STORY_COMPLETED',
          'STORY_MODERATION_COMPLETED',
          'ATTENDANCE_REMINDER',
          'CREDIT_EXPIRY_REMINDER',
        ] as const
      ).map((type, i) => ({
        type,
        deliveredMembers: [61, 11, 1206, 80][i],
        openState: activityFrom
          ? ('MEASURED' as const)
          : ('BEFORE_MEASUREMENT' as const),
        pushOpens: activityFrom ? [27, 4, 104, 12][i] : null,
        pushOpenRate: activityFrom ? [0.4426, 0.3636, 0.0862, 0.15][i] : null,
      })),
    } satisfies T.PushOpensResponse;
  }

  if (path === '/users/activity')
    return {
      ...base,
      pendingDates,
      monthlyActiveUsers: null,
      daily: ready.map((date, i) => ({
        date,
        activeUsers: platform(i === 0 ? 0 : 120 + i * 9),
        newVisitors: platform(20 + i),
        cumulativeNewVisitors: platform(20 * (i + 1) + (i * (i + 1)) / 2),
        messagesPerUser: {
          all: null,
          web: 4.5 + i / 10,
          android: 3.2 + i / 10,
          unknown: null,
        },
      })),
    } satisfies T.ActivityResponse;

  if (path === '/users/retention')
    return {
      cohort: (query.get('cohort') ??
        'visitor') as T.RetentionResponse['cohort'],
      ...base,
      pendingDates,
      platforms: ['all', 'web', 'android'].map((name, j) => ({
        platform: name,
        summary: {
          d1: 0.25 + j * 0.03,
          d2: 0.23,
          d3: 0.21,
          d4: 0.19,
          d5: 0.17,
          d6: 0.15,
          d7: 0.12,
          d30: null,
        },
        cohorts: ready.map((date, i) => ({
          date,
          users: 50 + i,
          d1:
            Date.parse(date) < Date.parse(kstToday()) - 86400000
              ? 0.22 + i * 0.01
              : null,
          d2:
            Date.parse(date) < Date.parse(kstToday()) - 2 * 86400000
              ? 0.19
              : null,
          d3:
            Date.parse(date) < Date.parse(kstToday()) - 3 * 86400000
              ? 0.175
              : null,
          d4:
            Date.parse(date) < Date.parse(kstToday()) - 4 * 86400000
              ? 0.16
              : null,
          d5:
            Date.parse(date) < Date.parse(kstToday()) - 5 * 86400000
              ? 0.145
              : null,
          d6:
            Date.parse(date) < Date.parse(kstToday()) - 6 * 86400000
              ? 0.13
              : null,
          d7:
            Date.parse(date) < Date.parse(kstToday()) - 7 * 86400000
              ? 0.1
              : null,
          d30:
            Date.parse(date) < Date.parse(kstToday()) - 30 * 86400000
              ? 0.05
              : null,
        })),
      })),
    } satisfies T.RetentionResponse;

  if (path === '/users/session-lengths') {
    const edges = [0, 3, 10, 30, 60, 180, 600, 1800, 3600, 86400];

    return {
      ...base,
      segment: query.get('segment') ?? 'all',
      pendingDates,
      daily: ready.map((date, i) => ({
        date,
        sessions: { all: 342 + i, web: 301 + i, android: 45 + i },
      })),
      bins: edges
        .slice(0, -1)
        .map((fromSeconds, i) => ({ fromSeconds, toSeconds: edges[i + 1] })),
      platforms: ['all', 'web', 'android'].map((platform, i) => {
        const sessions = [973, 211, 187, 164, 290, 247, 158, 52, 35].map((n) =>
          Math.round(n / (i + 1)),
        );

        return {
          platform,
          sessions,
          totalSessions: sessions.reduce((a, b) => a + b, 0),
          medianBin: 1,
        };
      }),
    } satisfies T.SessionLengthResponse;
  }

  if (path === '/users/sessions')
    return {
      ...base,
      pendingDates,
      segment: audience,
      daily: ready.map((date, i) => ({
        date,
        // 대상마다 값이 달라 대상 선택이 차트 전체에 적용되는 것을 미리보기에서 볼 수 있다.
        sessionsPerUser: { all: 1.6, web: 1.8, android: 1.3, unknown: null },
        averageSessionSeconds: {
          all: 180 + i * 3 + sessionOffset,
          web: 200 + i * 3 + sessionOffset,
          android: 140 + i * 2 + sessionOffset,
          unknown: null,
        },
      })),
    } satisfies T.SessionResponse;

  const platformMeta = {
    platformAsOf: ready.length ? `${to}T02:55:00Z` : null,
    pendingDates,
  };

  if (path === '/users/signups')
    return {
      ...base,
      ...platformMeta,
      daily: dates.map((date, i) => {
        const joined = members.filter(
          (member) => kstDate(member.createdAt) === date,
        );
        const google = Math.ceil(joined.length * 0.6);

        return {
          date,
          signups: {
            total: joined.length,
            google,
            kakao: joined.length - google,
          },
          cumulativeSignups: members.filter(
            (member) => kstDate(member.createdAt) <= date,
          ).length,
          migratedFromGuest: Math.min(joined.length, i % 3),
          newVisitorsByPlatform: pendingDates.includes(date)
            ? null
            : metricPlatform(100 + i),
          signupRate: pendingDates.includes(date)
            ? null
            : { all: 0.03, web: 0.02, android: 0.08 },
          signupsByPlatform: pendingDates.includes(date)
            ? null
            : {
                all: 3 + (i % 4),
                web: 1 + (i % 2),
                android: 2,
              },
        };
      }),
    } satisfies T.SignupResponse;

  if (path === '/quality/client')
    return {
      storyCompletion: dates.map((date, i) => ({
        date,
        requests: i % 3 ? 20 : 0,
        failed: i % 3 ? 5 : 0,
        failureRate: i % 3 ? 0.25 : null,
      })),
      ...base,
      pendingDates,
      platform: query.get('platform') ?? 'all',
      segment: audience,
      daily: ready.map((date, i) => ({
        date,
        activity: {
          aiResponses: 110 + i,
          simpleCompletions: 6,
          generalSubmissions: 2,
          coreActiveUsers: 40,
          messagesPerCoreUser: i === 0 ? null : (100 + i * 3) / 40,
          simpleCompletionsPerCoreUser: i === 0 ? null : 0.15,
        },
        messagesByInputMode:
          i === 0
            ? { block: 0, plain: 0, choice: 0, unknown: 0 }
            : { block: 10 + i, plain: 25 + i, choice: 60 + i, unknown: 5 },
        streamErrors: i === 0 ? 0 : 3,
        streamErrorRate: i === 0 ? null : i === 1 ? 1.5 : 0.03,
        users: {
          chatLoadError: i % 4,
          storyListLoadError: 2,
          creditShortage: 10,
          creditChargeViewed: 8,
          attendanceClicked: 4,
          inviteSucceeded: 3,
        },
      })),
    } satisfies T.QualityResponse;

  if (path === '/quality/chat-options') {
    // 게스트 대상이면 회원 전용 모델(오로라) 턴과 페르소나 클릭이 없다.
    const guest = audience === 'guest';

    return {
      ...base,
      ...platformMeta,
      segment: audience,
      daily: dates.map((date) => {
        const pending = pendingDates.includes(date);

        return {
          date,
          chats: 4,
          withPersona: 2,
          byModel: { AURORA: 1, LITE: 3, NOVA: 0 },
          turnsByModel: { AURORA: 2, LITE: 4 },
          chatStarters: pending ? null : metricPlatform(10),
          chatStartersByPersonaType: pending
            ? null
            : {
                default: metricPlatform(8),
                persona: metricPlatform(guest ? 0 : 2),
                none: metricPlatform(0),
              },
          chatStarts: pending
            ? null
            : { all: 5, web: 3, android: 2, unknown: 0 },
          personaChatStarts: pending
            ? null
            : guest
              ? { all: 0, web: 0, android: 0, unknown: 0 }
              : { all: 2, web: 1, android: 1, unknown: 0 },
          platformTurnsByModel: pending
            ? null
            : {
                AURORA: guest
                  ? { all: 0, web: 0, android: 0 }
                  : { all: 2, web: 1, android: 1 },
                LITE: { all: 5, web: 3, android: 1 },
              },
        };
      }),
    } satisfies T.ChatOptionResponse;
  }

  if (path === '/quality/ai-cost') {
    const retentionStartDate = shiftDate(kstToday(), -28);
    const expiredDates = dates.filter((date) => date < retentionStartDate);
    const costPendingDates = pendingDates.filter(
      (date) => date >= retentionStartDate,
    );
    const availableDates = dates.filter(
      (date) =>
        !expiredDates.includes(date) && !costPendingDates.includes(date),
    );

    return {
      ...base,
      currency: 'KRW',
      pendingDates: costPendingDates,
      expiredDates,
      retentionDays: 30,
      retentionStartDate,
      asOf: availableDates.length ? base.asOf : null,
      usdKrwRate: 1400,
      unmapped: availableDates.length
        ? [{ traceName: '새 기능', costKrw: 2.8 }]
        : [],
      chatImageUnitCostKrw: 48,
      unpricedModels: availableDates.length ? ['UNPRICED'] : [],
      totals: {
        costKrw:
          dates.length * 144 +
          availableDates.length * 20 +
          (availableDates.length ? 2.8 : 0),
        costPerTurnKrw: availableDates.length ? 10 : null,
        costPerStoryKrw: null,
      },
      daily: dates.map((date) => ({
        date,
        byFeature: [
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
            costKrw:
              costPendingDates.includes(date) || expiredDates.includes(date)
                ? null
                : 14,
          },
          {
            feature: 'chat_image',
            model: null,
            calls: 3,
            callsWithoutTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            costKrw: 144,
          },
          {
            feature: 'chat_response',
            model: 'AURORA',
            calls: 2,
            callsWithoutTokens: 1,
            inputTokens: 1000,
            outputTokens: 500,
            costKrw:
              costPendingDates.includes(date) || expiredDates.includes(date)
                ? null
                : 6,
          },
          {
            feature: 'story_completion',
            model: 'UNPRICED',
            calls: 1,
            callsWithoutTokens: 0,
            inputTokens: 100,
            outputTokens: 30,
            costKrw:
              costPendingDates.includes(date) || expiredDates.includes(date)
                ? null
                : 0,
          },
          {
            feature: 'choice_generation',
            model: null,
            calls: 1,
            callsWithoutTokens: 0,
            inputTokens: 100,
            outputTokens: 10,
            costKrw: null,
          },
        ],
      })),
    } satisfies T.AiCostResponse;
  }

  if (path === '/conversion/turn-reach')
    return {
      ...base,
      segments: ['all', 'guest', 'member'].map((name, j) => ({
        segment: name,
        chats: j === 1 ? 0 : 100,
        reached: TURN_THRESHOLDS.map((turn, i) => ({
          turn,
          chats: j === 1 ? 0 : Math.max(0, 80 - i * 7),
          rate: j === 1 ? 0 : Math.max(0, 0.8 - i * 0.07),
        })),
      })),
      guestToMember: { chatsReached5: 0, chatsReached6: 0, rate: 0 },
      ...platformMeta,
      segment: audience,
      platforms: ready.length
        ? (['all', 'web', 'android', 'unknown'] as const).map((name, j) => {
            const chats =
              [40, 25, 15, 0][j] *
              ({ all: 3, guest: 1, member: 2 } as Record<string, number>)[
                audience
              ]!;

            return {
              platform: name,
              chats,
              reached: TURN_THRESHOLDS.map((turn, i) => {
                // 기간 전에 시작한 채팅 때문에 2턴은 1턴보다 많을 수 있다.
                const rate = chats
                  ? i === 1
                    ? 1.1
                    : Math.max(0, 1 - i * (0.06 + j * 0.02))
                  : 0;

                return { turn, chats: Math.round(chats * rate), rate };
              }),
            };
          })
        : null,
    } satisfies T.TurnReachResponse;

  if (path.startsWith('/conversion/funnels/')) {
    const funnel = path.split('/').at(-1)!;
    const additional: Record<string, string[]> = {
      'first-visit-activation': [
        '_active',
        'client_chat_messageInput_submitted',
        'client_chat_messageInput_submitted',
      ],
      'login-signup': ['client_login_viewed', 'signup_succeeded'],
      'android-activation': ['_active', 'signup_succeeded', 'core_activity'],
      'web-to-android': ['_active', '_active'],
      'creation-entry-chat': events,
    };
    const names =
      additional[funnel] ??
      (funnel === 'android-first-visit'
        ? ['client_login_viewed', 'client_chat_messageInput_submitted']
        : funnel === 'guest-limit-login'
          ? [
              'client_guestLimitDialog_shown',
              'client_guestLimitDialog_loginButton_clicked',
              'login_succeeded',
            ]
          : funnel === 'story-creation'
            ? [...events.slice(2, 5), 'client_storyCreate_completed']
            : funnel === 'story-detail-chat'
              ? [
                  'client_storyDetail_viewed',
                  'client_storyDetail_chatStartButton_clicked',
                  ...(Array(5).fill(
                    'client_chat_messageInput_submitted',
                  ) as string[]),
                ]
              : events);

    return {
      ...base,
      funnel,
      platform:
        funnel === 'web-first-visit'
          ? 'web'
          : funnel === 'web-to-android'
            ? null
            : ['android-first-visit', 'android-activation'].includes(funnel)
              ? 'android'
              : (query.get('platform') ?? 'web'),
      storyId: query.get('storyId'),
      steps: names.map((event, i) => ({
        event,
        platform:
          funnel === 'web-to-android' ? (i === 0 ? 'web' : 'android') : null,
        minTurnNumber:
          funnel === 'first-visit-activation' && i === 2 ? 5 : null,
        turnNumber: funnel === 'story-detail-chat' && i >= 2 ? i - 1 : null,
        users: funnel === 'guest-limit-login' ? [10, 6, 7][i] : 100 - i * 12,
      })),
    } satisfies T.ConversionResponse;
  }

  if (path === '/campaigns/analytics') {
    const daily = ready.map((date, i) => ({
      date,
      activeUsers: 200 + i * 5,
      newVisitors: segment(50 + i),
      newVisitorsByDevice: { ios: 20, android: 25, other: 5 + i },
      newVisitorsBySource: {
        ads: 35,
        instagram: 5,
        threads: 4,
        dcinside: 3,
        other: 3,
      },
      signups: segment(10),
      cumulativeSignups: segment((i + 1) * 10),
      androidSignups: 6,
      storylineRequests: 20,
      completionRequests: 12,
      chatMessages: 180,
    }));

    return {
      ...base,
      campaign,
      pendingDates,
      daily,
      totals: {
        newVisitorsByDevice: {
          ios: daily.length * 20,
          android: daily.length * 25,
          other: daily.reduce((s, d) => s + d.newVisitorsByDevice.other, 0),
        },
        activeUsersAverage: 210,
        newVisitors: segment(daily.reduce((s, d) => s + d.newVisitors.all, 0)),
        signups: segment(daily.length * 10),
        androidSignups: daily.length * 6,
        adsShare: 0.7,
        storylineRequests: daily.length * 20,
        completionRequests: daily.length * 12,
        chatMessages: daily.length * 180,
      },
    } satisfies T.CampaignAnalyticsResponse;
  }

  if (path === '/campaigns/funnels/creation')
    return {
      ...base,
      campaign,
      steps: events.map((event, i) => ({
        event,
        users: segment(100 - i * 15),
      })),
    } satisfies T.CampaignCreationResponse;

  if (path === '/campaigns/funnels/story-detail')
    return {
      ...base,
      campaign,
      storyId: query.get('storyId') ?? id,
      steps: [
        'client_storyDetail_viewed',
        'client_storyDetail_chatStartButton_clicked',
        ...(Array(5).fill('client_chat_messageInput_submitted') as string[]),
      ].map((event, i) => ({
        event,
        turnNumber: i >= 2 ? i - 1 : null,
        users: 100 - i * 12,
      })),
    } satisfies T.CampaignStoryResponse;

  return {
    ...base,
    sources: Array.from({ length: 30 }, (_, i) => ({
      source: i === 0 ? null : `유입 소스 ${i}`,
      newVisitors: 100 - i * 3,
    })),
    posts: Array.from({ length: 25 }, (_, i) => ({
      content: i === 0 ? null : `게시글 ${i}`,
      visitors: 80 - i * 2,
    })),
  } satisfies T.CampaignSourceResponse;
}
