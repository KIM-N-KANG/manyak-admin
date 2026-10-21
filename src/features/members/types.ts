import type { ChatRoom } from '@/features/chats/types';
import type { PaymentOrder } from '@/features/payments/types';
import type { MemberSummary } from '@/features/shared/types';
import type { Story } from '@/features/stories/types';

export type MemberListItem = MemberSummary & {
  lastActiveAt: string;
  creditsSpent: number;
  paidKrw: number;
  chatCount: number;
  periodChatCount?: number;
};
export type CreditTransaction = {
  amount: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
};
export type MemberDetail = MemberListItem & {
  creditBalance: number;
  storyCount: number;
  deletedAt: string | null;
  transactions: CreditTransaction[];
  payments: PaymentOrder[];
  chats: ChatRoom[];
  stories: Story[];
  attendance: { date: string; creditAmount: number }[];
};
