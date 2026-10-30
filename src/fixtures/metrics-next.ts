import type * as T from '@/features/analytics/types';

/** 새 관리자 계약의 고정 데이터를 반환한다. */
export function newMetricFixture(
  path: string,
  base: Omit<T.MetricPeriod, 'pendingDates'>,
  ready: string[],
  pendingDates: string[],
  campaign: string,
) {
  const period = { ...base, pendingDates };
  const segments = (all: number) => ({
    all,
    ads: Math.floor(all * 0.8),
    nonAds: all - Math.floor(all * 0.8),
  });

  if (path === '/campaigns/funnels/activation')
    return {
      ...base,
      campaign,
      steps: [
        '_active',
        'client_chat_messageInput_submitted',
        'client_chat_messageInput_submitted',
        'signup_succeeded',
      ].map((event, i) => ({
        event,
        minTurnNumber: i === 2 ? 5 : null,
        users: segments([1520, 402, 133, 21][i]),
      })),
    } satisfies T.CampaignActivationResponse;

  if (path === '/campaigns/reach')
    return {
      ...base,
      campaign,
      chatUsers: segments(610),
      deepChatUsers: segments(230),
    } satisfies T.CampaignReachResponse;

  if (path === '/campaigns/creatives') {
    const rows = (factor: number) => [
      { content: 'ORIGINAL_0HOSUN_VIDEO', users: 9 * factor },
      { content: 'COMMUNITY_POST_IMAGE', users: 6 * factor },
      { content: null, users: factor },
    ];

    return {
      ...period,
      campaign,
      daily: ready.map((date) => ({
        date,
        signups: rows(1),
        deepChatUsers: rows(3),
      })),
      totals: { signups: rows(ready.length) },
    } satisfies T.CampaignCreativesResponse;
  }

  if (path === '/campaigns/app-transfer')
    return {
      ...period,
      daily: ready.map((date, i) => ({
        date,
        bannerShown: i ? 140 : 0,
        bannerClicked: i ? 21 : 0,
        bannerClickRate: i ? 0.15 : null,
        bannerNewUsers: 4,
        newUsersBySource: [
          { source: 'google-play', users: 12 },
          { source: 'manyak_web', users: 5 },
          { source: null, users: 3 },
        ],
      })),
      totals: {
        bannerNewUsers: ready.length * 4,
        newUsersBySource: [
          { source: 'google-play', users: ready.length * 12 },
          { source: 'manyak_web', users: ready.length * 5 },
          { source: null, users: ready.length * 3 },
        ],
      },
    } satisfies T.AppTransferResponse;

  if (path === '/users/app-activation')
    return {
      ...period,
      daily: ready.map((date) => ({
        date,
        newUsers: 20,
        activeUsers: 8,
        activationRate: 0.4,
      })),
      totals: {
        newUsers: ready.length * 20,
        activeUsers: ready.length * 8,
        activationRate: ready.length ? 0.4 : null,
      },
    } satisfies T.AppActivationResponse;

  return null;
}
