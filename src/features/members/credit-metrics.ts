import type { CreditTransaction } from '@/features/members/types';

export type CreditDirection = 'granted' | 'spent';

const grantReasons = [
  'SIGNUP_REWARD',
  'INVITE_REWARD',
  'ATTENDANCE_REWARD',
  'PURCHASE',
  'ADMIN_GRANT',
];
const spendReasons = ['STORY_CREATION', 'CHAT_TURN', 'CHAT_IMAGE'];

export function isCreditMetric(
  transaction: CreditTransaction,
  direction: CreditDirection,
) {
  return direction === 'granted'
    ? transaction.amount > 0 && grantReasons.includes(transaction.reason)
    : transaction.amount < 0 && spendReasons.includes(transaction.reason);
}
