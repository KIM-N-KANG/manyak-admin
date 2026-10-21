import type { MemberSummary } from '@/features/shared/types';

export type PaymentOrder = {
  orderId: string;
  member: MemberSummary;
  productCode: string;
  status: 'COMPLETED' | 'REFUNDED';
  priceKrw: number;
  creditAmount: number;
  completedAt: string;
  refundedAt: string | null;
  reversalShortfall: number | null;
};
export type PaymentDetail = PaymentOrder & {
  firstPaidAt: string;
  before: { turns: number; stories: number; creditsSpent: number };
  after: { turns: number; stories: number; creditsSpent: number };
};
