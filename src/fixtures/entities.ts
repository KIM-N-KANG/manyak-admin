import type { ChatRoom } from '@/features/chats/types';
import type {
  CreditTransaction,
  MemberDetail,
  MemberListItem,
} from '@/features/members/types';
import type { PaymentDetail } from '@/features/payments/types';
import type { Story, StoryDetail } from '@/features/stories/types';
import { originalGenres } from '@/fixtures/original-genres';
import { kstDate } from '@/fixtures/query';

function id(group: number, index: number) {
  return `0000000${group}-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
}

const names = [
  '차분한 등대',
  '푸른 고래',
  '느긋한 구름',
  '달빛 서재',
  '작은 우주',
  '고요한 파도',
  '오후의 산책',
  '은빛 여우',
];
const titles = [
  '별이 잠든 도서관',
  '마지막 용의 계약',
  '비 오는 날의 카페',
  '사라진 도시의 기록',
  '궤도 밖의 우리',
  '여름 끝의 약속',
  '마법사의 작은 가게',
  '한밤의 탐정 사무소',
];

export const members: MemberListItem[] = Array.from(
  { length: 1240 },
  (_, i) => ({
    memberId: id(1, i),
    nickname:
      i === 4 ? '탈퇴한 회원' : names[i % 8] + (i >= 8 ? ` ${i + 1}` : ''),
    status: i === 4 ? 'DELETED' : i % 7 === 0 ? 'SUSPENDED' : 'ACTIVE',
    isAdmin: false,
    createdAt: new Date(Date.UTC(2026, 9, 21 - (i % 90))).toISOString(),
    lastActiveAt: new Date(Date.UTC(2026, 9, 21 - (i % 10), 8)).toISOString(),
    creditsSpent: 1200 + i * 320,
    paidKrw: 4800 * (i % 6),
    chatCount: 0,
    periodChatCount: null,
  }),
);

members[0].nickname = '마냑';

export const officialMember = members[0];

export function memberSummary(member: MemberListItem) {
  const { memberId, nickname, status, isAdmin, createdAt } = member;

  return { memberId, nickname, status, isAdmin, createdAt };
}

// 상위 30개 제한을 미리보기에서 확인할 수 있도록 35개 장르를 사용한다.
const storyGenres = [
  ...new Set(['로맨스', '판타지', '일상', '미스터리', 'SF', ...originalGenres]),
].slice(0, 35);

export const stories: Story[] = Array.from({ length: 36 }, (_, i) => ({
  storyId: id(2, i),
  title: titles[i % 8] + (i >= 8 ? ` ${i + 1}` : ''),
  description: '선택에 따라 새로운 이야기가 펼쳐지는 인터랙티브 스토리입니다.',
  genre: storyGenres[i % storyGenres.length],
  scope: i % 3 === 0 ? 'original' : 'user',
  visibility: i % 5 === 0 ? 'PRIVATE' : 'PUBLIC',
  moderationStatus: i % 6 === 0 ? 'HELD' : 'APPROVED',
  supportingCharacterCount: i % 7 === 0 ? null : i % 6,
  tags: i % 7 === 0 ? [] : ['성장', '모험', i % 2 ? '동료' : '비밀'],
  owner:
    i % 3 === 0
      ? memberSummary(officialMember)
      : i % 8 === 0
        ? null
        : memberSummary(members[i % members.length]),
  chatCount: 126 + i * 19,
  totalTurns: 1200 + i * 147,
  createdAt: new Date(Date.UTC(2026, 9, 21 - (i % 20), 6)).toISOString(),
}));
export const chats: ChatRoom[] = Array.from({ length: 8210 }, (_, i) => ({
  chatId: id(3, i),
  story: {
    storyId: stories[i % 36].storyId,
    title: stories[i % 36].title,
    genre: stories[i % 36].genre,
  },
  member: i % 4 === 0 ? null : memberSummary(members[i % members.length]),
  startedAs: i % 4 === 0 ? 'GUEST' : 'MEMBER',
  turnCount: (i * 7) % 63,
  startedAt: new Date(Date.UTC(2026, 9, 21 - (i % 28), 2)).toISOString(),
  lastActiveAt: new Date(Date.UTC(2026, 9, 21 - (i % 28), 7)).toISOString(),
  creditsSpent: ((i * 7) % 63) * 30,
  firstMessageSeconds: i % 7 === 0 ? null : 12 + i * 3,
}));
export const payments: PaymentDetail[] = Array.from({ length: 32 }, (_, i) => ({
  orderId: id(4, i),
  member: memberSummary(members[i % members.length]),
  productId: i % 2 ? 'if_10000' : 'if_5000',
  status: i % 6 === 0 ? 'REFUNDED' : 'COMPLETED',
  priceKrw: i % 2 ? 9600 : 4800,
  creditAmount: i % 2 ? 10000 : 5000,
  completedAt: new Date(Date.UTC(2026, 9, 21 - (i % 28), 1)).toISOString(),
  refundedAt:
    i % 6 === 0
      ? new Date(Date.UTC(2026, 9, 21 - (i % 28), 3)).toISOString()
      : null,
  reversalShortfall: i % 6 === 0 ? 150 : null,
  firstPaidAt: '2026-09-01T03:00:00Z',
  before: { turns: 12 + i, stories: i % 3, creditsSpent: 1200 + i * 30 },
  after: {
    turns: 89 + i * 5,
    stories: 3 + (i % 4),
    creditsSpent: 8000 + i * 200,
  },
}));
export function getMemberDetail(memberId: string): MemberDetail | null {
  const member = members.find((m) => m.memberId === memberId);

  if (!member) return null;

  const ownedStories = stories.filter((s) => s.owner?.memberId === memberId);

  return {
    ...member,
    creditBalance: getMemberTransactions(memberId).reduce(
      (sum, t) => sum + t.amount,
      0,
    ),
    storyCount: ownedStories.length,
    chatCount: member.chatCount,
    deletedAt: member.status === 'DELETED' ? '2026-10-20T05:00:00Z' : null,
    periodChatCount: null,
  };
}

export const memberEmails = new Map(
  members.map((member, index) => [
    member.memberId,
    `member${index + 1}@example.com`,
  ]),
);

export function getStoryDetail(storyId: string): StoryDetail | null {
  const story = stories.find((s) => s.storyId === storyId);

  return story
    ? {
        ...story,
        retention: [1, 3, 5, 10, 20].map((turn) => {
          const rooms = chats.filter((c) => c.story.storyId === storyId);

          return {
            turn,
            rate: rooms.length
              ? rooms.filter((c) => c.turnCount >= turn).length / rooms.length
              : 0,
          };
        }),
        recentChats: chats
          .filter((c) => c.story.storyId === storyId)
          .toSorted(
            (a, b) =>
              b.startedAt.localeCompare(a.startedAt) ||
              a.chatId.localeCompare(b.chatId),
          )
          .slice(0, 5),
      }
    : null;
}

export const memberTransactions = new Map<string, CreditTransaction[]>(
  members.map((member, index) => {
    const direction = index % 3;
    const rows: CreditTransaction[] = [
      {
        amount: 5000,
        reason: 'PURCHASE',
        balanceAfter: 5000,
        createdAt: '2026-10-20T03:00:00Z',
      },
      {
        amount: -30,
        reason: 'CHAT_TURN',
        balanceAfter: 4970,
        createdAt:
          direction === 0 ? '2026-10-21T04:00:00Z' : '2026-10-20T14:59:59Z',
      },
      {
        amount: 250,
        reason: 'ATTENDANCE_REWARD',
        balanceAfter: 5220,
        createdAt:
          direction === 1 ? '2026-10-20T15:00:00Z' : '2026-10-19T15:00:00Z',
      },
      {
        amount: 30,
        reason: 'REFUND',
        balanceAfter: 5250,
        createdAt: '2026-10-21T02:00:00Z',
      },
      {
        amount: -10,
        reason: 'EXPIRE',
        balanceAfter: 5240,
        createdAt: '2026-10-21T02:00:00Z',
      },
    ];

    return [
      member.memberId,
      rows.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ];
  }),
);
export function getMemberTransactions(memberId: string): CreditTransaction[] {
  return memberTransactions.get(memberId) ?? [];
}

export function getChatCounts(from?: string | null, to?: string | null) {
  const counts = new Map<string, number>();

  for (const chat of chats) {
    const date = kstDate(chat.startedAt);

    if (chat.member && (!from || date >= from) && (!to || date <= to))
      counts.set(
        chat.member.memberId,
        (counts.get(chat.member.memberId) ?? 0) + 1,
      );
  }

  return counts;
}

const counts = getChatCounts();

for (const member of members)
  member.chatCount = counts.get(member.memberId) ?? 0;

for (const member of members) {
  member.creditsSpent = getMemberTransactions(member.memberId)
    .filter(
      (t) =>
        t.amount < 0 &&
        ['STORY_CREATION', 'CHAT_TURN', 'CHAT_IMAGE'].includes(t.reason),
    )
    .reduce((sum, t) => sum - t.amount, 0);
  member.paidKrw = payments
    .filter(
      (p) => p.member.memberId === member.memberId && p.status === 'COMPLETED',
    )
    .reduce((sum, p) => sum + p.priceKrw, 0);
}

export const creationSessions = stories
  .filter((s) => s.supportingCharacterCount !== null)
  .map((story) => ({
    storyId: story.storyId,
    createdAt: story.createdAt,
    supportingCharacterCount: story.supportingCharacterCount,
  }));
export const aiCalls = [
  ...chats.map((chat, index) => ({
    chatId: chat.chatId,
    storyId: chat.story.storyId,
    feature: ['chat_response', 'choice_generation', 'chat_image'][index % 3],
    createdAt: chat.lastActiveAt,
    status:
      index % 17 === 0 ? 'FAILED' : index % 19 === 0 ? 'STARTED' : 'SUCCEEDED',
    latencySeconds: index % 13 === 0 ? null : 2 + (index % 80) / 10,
  })),
  ...stories.map((story, index) => ({
    chatId: null,
    storyId: story.storyId,
    feature: index % 2 ? 'storyline_generation' : 'story_completion',
    createdAt: story.createdAt,
    status: index % 11 === 0 ? 'FAILED' : 'SUCCEEDED',
    latencySeconds: 8 + (index % 50) / 10,
  })),
];

for (const story of stories) {
  const rooms = chats.filter((c) => c.story.storyId === story.storyId);

  story.chatCount = rooms.length;
  story.totalTurns = rooms.reduce((sum, c) => sum + c.turnCount, 0);
}
