import type {
  ChatEngagement,
  CreditMetrics,
  ModerationMetrics,
  PaymentMetrics,
  StoryConsumption,
} from '@/features/analytics/new-metrics-types';
import { chartDates } from '@/features/analytics/range';
import { deletedStories, stories } from '@/fixtures/entities';

const payments: PaymentMetrics = {
  asOf: '2026-11-02T02:10:00Z',
  from: '2026-10-01',
  to: '2026-10-31',
  activeMembers: 412,
  payingMembers: 23,
  conversionRate: 0.0558,
  orders: 31,
  amountKrw: 190000,
  arppu: 8260.9,
  firstTime: {
    orders: 18,
    amountKrw: 86000,
  },
  repeat: {
    orders: 13,
    amountKrw: 104000,
  },
  products: [
    {
      productId: 'if_10000',
      orders: 12,
      amountKrw: 112800,
      creditAmount: 120000,
    },
    {
      productId: 'if_5000',
      orders: 14,
      amountKrw: 67200,
      creditAmount: 70000,
    },
    {
      productId: 'if_2000',
      orders: 5,
      amountKrw: 10000,
      creditAmount: 10000,
    },
  ],
  refundedOrders: 1,
  refundRate: 0.0323,
  daysToFirstPayment: [
    {
      bucket: '0',
      members: 6,
    },
    {
      bucket: '1~3',
      members: 4,
    },
    {
      bucket: '4~7',
      members: 3,
    },
    {
      bucket: '8~30',
      members: 3,
    },
    {
      bucket: '31+',
      members: 2,
    },
  ],
};
const credits: CreditMetrics = {
  asOf: '2026-11-02T02:10:00Z',
  from: '2026-10-04',
  to: '2026-11-02',
  granted: 412500,
  spent: 268400,
  sinkRate: 0.6507,
  grantedByReason: [
    {
      reason: 'SIGNUP_REWARD',
      amount: 71000,
    },
    {
      reason: 'INVITE_REWARD',
      amount: 12000,
    },
    {
      reason: 'ATTENDANCE_REWARD',
      amount: 98500,
    },
    {
      reason: 'PURCHASE',
      amount: 215000,
    },
    {
      reason: 'ADMIN_GRANT',
      amount: 16000,
    },
  ],
  spentByReason: [
    {
      reason: 'STORY_CREATION',
      amount: 41750,
    },
    {
      reason: 'CHAT_TURN',
      amount: 213480,
    },
    {
      reason: 'CHAT_IMAGE',
      amount: 13170,
    },
  ],
  balances: {
    members: 1240,
    total: 1388200,
    buckets: [
      {
        bucket: '0',
        members: 318,
      },
      {
        bucket: '1~99',
        members: 402,
      },
      {
        bucket: '100~499',
        members: 361,
      },
      {
        bucket: '500~1999',
        members: 128,
      },
      {
        bucket: '2000+',
        members: 31,
      },
    ],
    purchased: 612000,
    rewarded: 540200,
    legacy: 236000,
    expiringIn30Days: 182300,
  },
};
const consumption: StoryConsumption = {
  asOf: '2026-11-02T02:10:00Z',
  from: '2026-10-04',
  to: '2026-11-02',
  publicStories: 486,
  officialStories: 8,
  playedStories: 97,
  playedRate: 0.1996,
  otherMemberChats: 1532,
  topConcentration: 0.6214,
  ranking: [
    {
      storyId: '6f0c2d1e-3b4a-4c5d-8e9f-0a1b2c3d4e5f',
      title: '던전의 밤',
      official: true,
      deleted: false,
      chats: 412,
      players: 301,
      turns: 4120,
    },
    {
      storyId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      title: '편의점 야간 알바',
      official: false,
      deleted: false,
      chats: 188,
      players: 142,
      turns: 1510,
    },
    {
      storyId: '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b',
      title: '졸업식 전날',
      official: true,
      deleted: false,
      chats: 131,
      players: 97,
      turns: 902,
    },
  ],
  creators: {
    activeMembers: 412,
    members: 58,
    rate: 0.1408,
    previousMembers: 51,
    retained: 19,
    retentionRate: 0.3725,
  },
};
const depth: ChatEngagement = {
  asOf: '2026-11-02T02:10:00Z',
  from: '2026-10-26',
  to: '2026-11-01',
  activeMembers: 188,
  monthlyActiveMembers: 412,
  turnsPerActiveMember: 26.4,
  daily: [
    {
      date: '2026-10-26',
      activeMembers: 61,
      turns: 702,
      turnsPerActiveMember: 11.5,
      continuedMembers: 24,
      continuationRate: 0.4138,
      regenerations: 31,
      regenerationRate: 0.0442,
      stickiness: 0.1481,
    },
    {
      date: '2026-10-27',
      activeMembers: 58,
      turns: 640,
      turnsPerActiveMember: 11.0,
      continuedMembers: 27,
      continuationRate: 0.4426,
      regenerations: 22,
      regenerationRate: 0.0344,
      stickiness: 0.1408,
    },
  ],
};
const moderation: ModerationMetrics = {
  asOf: '2026-11-02T02:10:00Z',
  from: '2026-10-27',
  to: '2026-11-02',
  decided: 46,
  approved: 39,
  rejected: 7,
  rejectionRate: 0.1522,
  failed: 2,
  held: 1,
  pending: 3,
  daily: [
    {
      date: '2026-10-27',
      submitted: 8,
      approved: 6,
      rejected: 1,
      failed: 0,
    },
    {
      date: '2026-10-28',
      submitted: 5,
      approved: 5,
      rejected: 2,
      failed: 1,
    },
  ],
  rejectionRules: [
    {
      rule: 'EXPLICIT_SEXUAL_CONTENT',
      type: 'TEXT',
      submissions: 4,
    },
    {
      rule: 'EXPLICIT_SEXUAL_CONTENT',
      type: 'IMAGE',
      submissions: 2,
    },
    {
      rule: 'HATE_VIOLENCE_INCITEMENT',
      type: 'TEXT',
      submissions: 1,
    },
  ],
};

export const newMetricPaths = [
  '/users/activity-hours',
  '/payments/metrics',
  '/credits/metrics',
  '/stories/consumption',
  '/chats/engagement',
  '/moderation/metrics',
];

/** 신규 지표의 예시 값에 요청 기간과 실제 고정 데이터 링크를 적용한다. */
export function newMetricsFixture(path: string, query: URLSearchParams) {
  const from = query.get('from')!;
  const to = query.get('to')!;
  const period = { from, to };

  if (path === '/payments/metrics') return { ...payments, ...period };

  if (path === '/credits/metrics') return { ...credits, ...period };

  if (path === '/stories/consumption')
    return {
      ...consumption,
      ...period,
      ranking: consumption.ranking
        .slice(0, Number(query.get('limit') ?? 20))
        .map((row, i) => {
          const story = i === 2 ? deletedStories[0] : stories[i];

          return {
            ...row,
            storyId: story.storyId,
            title: story.title,
            official: story.scope === 'original',
            deleted: story.deletedAt !== null,
          };
        }),
    };

  if (path === '/chats/engagement')
    return {
      ...depth,
      ...period,
      daily: chartDates(from, to).map((date, i) => ({
        ...depth.daily[i % depth.daily.length],
        date,
      })),
    };

  if (path === '/moderation/metrics')
    return {
      ...moderation,
      ...period,
      daily: chartDates(from, to).map((date, i) => ({
        ...moderation.daily[i % moderation.daily.length],
        date,
      })),
    };

  return null;
}
