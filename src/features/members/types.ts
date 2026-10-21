import type { MemberSummary } from '@/features/shared/types';

export type MemberListItem = MemberSummary & {
  lastActiveAt: string | null;
  creditsSpent: number;
  paidKrw: number;
  chatCount: number;
  periodChatCount: number | null;
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
};

export type AttendanceRecord = { date: string; creditAmount: number };
