import type { MemberSummary } from '@/features/shared/types';

/** 서버의 AdminCreditTransactionResponse와 공통 회원 요약 계약을 따른다. */
export type CreditTransactionItem = {
  amount: number;
  reason: string;
  createdAt: string;
  member: MemberSummary;
};
