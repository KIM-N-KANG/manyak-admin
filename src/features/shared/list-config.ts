export const listSorts = {
  originals: ['chatCount', 'totalTurns', 'updatedAt'],
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

export type SortDomain = keyof typeof listSorts;
export type ListDomain = Exclude<SortDomain, 'originals'>;

export const defaultSort: Record<SortDomain, string> = {
  originals: 'updatedAt',
  stories: 'createdAt',
  members: 'createdAt',
  payments: 'completedAt',
  chats: 'startedAt',
};
