import type { MemberSummary } from '@/features/shared/types';

/** 전체 원장 목록 계약이다. 서버 OpenAPI 반영 후 생성 타입과 맞춘다. */
export type CreditTransactionItem = {
  amount: number;
  reason: string;
  createdAt: string;
  member: MemberSummary;
};
