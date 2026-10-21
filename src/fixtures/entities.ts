import type { ChatRoom } from '@/features/chats/types';
import type { MemberDetail, MemberListItem } from '@/features/members/types';
import type { PaymentDetail } from '@/features/payments/types';
import type { Story, StoryDetail } from '@/features/stories/types';

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

export const members: MemberListItem[] = Array.from({ length: 32 }, (_, i) => ({
  memberId: id(1, i),
  nickname:
    i === 4 ? '탈퇴한 회원' : names[i % 8] + (i >= 8 ? ` ${i + 1}` : ''),
  status: i === 4 ? 'DELETED' : i % 7 === 0 ? 'SUSPENDED' : 'ACTIVE',
  isAdmin: false,
  createdAt: new Date(Date.UTC(2026, 9, 21 - i)).toISOString(),
  lastActiveAt: new Date(Date.UTC(2026, 9, 21 - (i % 10), 8)).toISOString(),
  creditsSpent: 1200 + i * 320,
  paidKrw: 4800 * (i % 6),
  chatCount: 1 + ((i * 3) % 16),
}));
export const stories: Story[] = Array.from({ length: 36 }, (_, i) => ({
  storyId: id(2, i),
  title: titles[i % 8] + (i >= 8 ? ` ${i + 1}` : ''),
  description: '선택에 따라 새로운 이야기가 펼쳐지는 인터랙티브 스토리입니다.',
  genre: ['로맨스', '판타지', '일상', '미스터리', 'SF'][i % 5],
  scope: i % 3 === 0 ? 'original' : 'user',
  visibility: i % 5 === 0 ? 'PRIVATE' : 'PUBLIC',
  moderationStatus: i % 6 === 0 ? 'HELD' : 'APPROVED',
  supportingCharacterCount: i % 6,
  tags: ['성장', '모험', i % 2 ? '동료' : '비밀'],
  owner: members[i % members.length],
  chatCount: 126 + i * 19,
  totalTurns: 1200 + i * 147,
  createdAt: new Date(Date.UTC(2026, 9, 21 - (i % 20), 6)).toISOString(),
}));
export const chats: ChatRoom[] = Array.from({ length: 64 }, (_, i) => ({
  chatId: id(3, i),
  story: {
    storyId: stories[i % 36].storyId,
    title: stories[i % 36].title,
    genre: stories[i % 36].genre,
  },
  member: i % 4 === 0 ? null : members[i % 32],
  startedAs: i % 3 === 0 || i % 4 === 0 ? 'GUEST' : 'MEMBER',
  turnCount: (i * 7) % 63,
  startedAt: new Date(Date.UTC(2026, 9, 21 - (i % 28), 2)).toISOString(),
  lastActiveAt: new Date(Date.UTC(2026, 9, 21 - (i % 28), 7)).toISOString(),
  creditsSpent: ((i * 7) % 63) * 30,
  firstMessageSeconds: i % 7 === 0 ? null : 12 + i * 3,
  aiFeature: i % 5 === 0 ? 'chat_image' : 'chat_response',
}));
export const payments: PaymentDetail[] = Array.from({ length: 32 }, (_, i) => ({
  orderId: id(4, i),
  member: members[i % 32],
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

  const ownedStories = stories.filter((s) => s.owner.memberId === memberId);
  const ownedChats = chats.filter((c) => c.member?.memberId === memberId);

  return {
    ...member,
    creditBalance: 1230,
    storyCount: ownedStories.length,
    chatCount: ownedChats.length,
    deletedAt: member.status === 'DELETED' ? '2026-10-20T05:00:00Z' : null,
    transactions: [
      {
        transactionId: id(5, 0),
        amount: 5000,
        reason: 'PURCHASE',
        balanceAfter: 5000,
        createdAt: '2026-10-20T03:00:00Z',
      },
      {
        transactionId: id(5, 1),
        amount: -3770,
        reason: 'CHAT_TURN',
        balanceAfter: 1230,
        createdAt: '2026-10-21T04:00:00Z',
      },
    ].reverse(),
    payments: payments.filter((p) => p.member.memberId === memberId),
    chats: ownedChats,
    stories: ownedStories,
    attendance: [
      { date: '2026-10-21', creditAmount: 250 },
      { date: '2026-10-20', creditAmount: 250 },
      { date: '2026-10-18', creditAmount: 250 },
    ],
  };
}

export const memberEmails = new Map(
  members.map((member, index) => [
    member.memberId,
    `member${index + 1}@example.com`,
  ]),
);
export const attendanceDates = ['2026-10-21', '2026-10-20', '2026-10-18'];
export const creditDates = ['2026-10-20', '2026-10-21'];
export function getStoryDetail(storyId: string): StoryDetail | null {
  const story = stories.find((s) => s.storyId === storyId);

  return story
    ? {
        ...story,
        retention: [
          { turn: 1, rate: 0.86 },
          { turn: 3, rate: 0.67 },
          { turn: 5, rate: 0.52 },
          { turn: 10, rate: 0.34 },
          { turn: 20, rate: 0.18 },
        ],
        recentChats: chats
          .filter((c) => c.story.storyId === storyId)
          .slice(0, 5),
      }
    : null;
}
