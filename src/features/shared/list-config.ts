export const listSorts = {
  stories: ['chatCount', 'totalTurns', 'createdAt'],
  members: [
    'createdAt',
    'lastActiveAt',
    'creditsSpent',
    'paidKrw',
    'chatCount',
  ],
  payments: ['priceKrw', 'creditAmount', 'completedAt', 'refundedAt'],
  chats: ['turnCount', 'startedAt', 'lastActiveAt', 'creditsSpent'],
} as const;

export type ListDomain = keyof typeof listSorts;

export const defaultSort: Record<ListDomain, string> = {
  stories: 'createdAt',
  members: 'createdAt',
  payments: 'completedAt',
  chats: 'startedAt',
};
