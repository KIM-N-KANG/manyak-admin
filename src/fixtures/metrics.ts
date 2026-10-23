import { chartDates, shiftDate } from '@/features/analytics/range';
import { TURN_THRESHOLDS } from '@/features/analytics/turn-thresholds';
import type * as T from '@/features/analytics/types';
import { kstToday } from '@/features/dashboard/date-range';
import { members } from '@/fixtures/entities';
import { kstDate } from '@/fixtures/query';

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
const segment = (all: number): T.CampaignSegments => ({
  all,
  ads: Math.round(all * 0.7),
  nonAds: all - Math.round(all * 0.7),
});
const events = [
  'client_onboarding_viewed',
  'client_onboarding_createButton_clicked',
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
      ...base,
      pendingDates,
      platforms: ['all', 'web', 'android'].map((name, j) => ({
        platform: name,
        summary: { d1: 0.25 + j * 0.03, d7: 0.12, d30: null },
        cohorts: ready.map((date, i) => ({
          date,
          users: 50 + i,
          d1:
            Date.parse(date) < Date.parse(kstToday()) - 86400000
              ? 0.22 + i * 0.01
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

  if (path === '/users/sessions')
    return {
      ...base,
      pendingDates,
      daily: ready.map((date, i) => ({
        date,
        averageSessionSeconds: {
          all: 180 + i * 3,
          web: 200 + i * 3,
          android: 140 + i * 2,
          unknown: null,
        },
      })),
    } satisfies T.SessionResponse;

  if (path === '/users/signups')
    return {
      ...base,
      daily: dates.map((date, i) => {
        const joined = members.filter(
          (member) => kstDate(member.createdAt) === date,
        );
        const google = Math.floor(joined.length * 0.6);
        const kakao = Math.floor(joined.length * 0.3);

        return {
          date,
          signups: {
            total: joined.length,
            google,
            kakao,
            other: joined.length - google - kakao,
          },
          cumulativeSignups: members.filter(
            (member) => kstDate(member.createdAt) <= date,
          ).length,
          migratedFromGuest: Math.min(joined.length, i % 3),
        };
      }),
    } satisfies T.SignupResponse;

  if (path === '/quality/client')
    return {
      ...base,
      pendingDates,
      platform: query.get('platform') ?? 'all',
      daily: ready.map((date, i) => ({
        date,
        messagesByInputMode:
          i === 0
            ? { block: 0, plain: 0, choice: 0, unknown: 0 }
            : { block: 10 + i, plain: 25 + i, choice: 60 + i, unknown: 5 },
        streamErrors: i === 0 ? 0 : 3,
        streamErrorRate: i === 0 ? null : i === 1 ? 1.5 : 0.03,
        users: {
          chatLoadError: i % 4,
          storyListLoadError: 2,
          storyCompleteError: 1,
          creditShortage: 10,
          creditChargeViewed: 8,
          attendanceClicked: 4,
          inviteSucceeded: 3,
        },
      })),
    } satisfies T.QualityResponse;

  if (path === '/quality/chat-options')
    return {
      ...base,
      daily: dates.map((date) => ({
        date,
        chats: 4,
        withPersona: 2,
        byModel: { AURORA: 1, LITE: 3, NOVA: 0 },
        turnsByModel: { AURORA: 2, LITE: 4 },
      })),
    } satisfies T.ChatOptionResponse;

  if (path === '/quality/ai-cost')
    return {
      ...base,
      currency: 'KRW',
      pendingDates,
      usdKrwRate: 1400,
      unmapped: [{ traceName: '새 기능', costKrw: 2.8 }],
      chatImageUnitCostKrw: 48,
      unpricedModels: ['UNPRICED'],
      totals: {
        costKrw: dates.length * 144 + ready.length * 6 + 2.8,
        costPerTurnKrw: 3,
        costPerStoryKrw: null,
      },
      daily: dates.map((date) => ({
        date,
        byFeature: [
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
            costKrw: pendingDates.includes(date) ? null : 6,
          },
          {
            feature: 'story_completion',
            model: 'UNPRICED',
            calls: 1,
            callsWithoutTokens: 0,
            inputTokens: 100,
            outputTokens: 30,
            costKrw: pendingDates.includes(date) ? null : 0,
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
    } satisfies T.TurnReachResponse;

  if (path.startsWith('/conversion/funnels/')) {
    const funnel = path.split('/').at(-1)!;
    const names =
      funnel === 'android-first-visit'
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
              : events;

    return {
      ...base,
      funnel,
      platform:
        funnel === 'web-first-visit'
          ? 'web'
          : funnel === 'android-first-visit'
            ? 'android'
            : (query.get('platform') ?? 'web'),
      storyId: query.get('storyId'),
      steps: names.map((event, i) => ({
        event,
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
      newVisitorsBySource: {
        ads: 35,
        instagram: 5,
        threads: 4,
        dcinside: 3,
        other: 3,
      },
      signups: segment(10),
      cumulativeSignups: segment((i + 1) * 10),
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
        activeUsersAverage: 210,
        newVisitors: segment(daily.reduce((s, d) => s + d.newVisitors.all, 0)),
        signups: segment(daily.length * 10),
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
