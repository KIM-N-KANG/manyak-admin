import type { MemberSummary } from '@/features/shared/types';

export type ChatRoom = {
  chatId: string;
  story: { storyId: string; title: string; genre: string };
  member: MemberSummary | null;
  startedAs: 'GUEST' | 'MEMBER';
  turnCount: number;
  startedAt: string;
  lastActiveAt: string;
  creditsSpent: number;
  firstMessageSeconds: number | null;
  deletedAt: string | null;
};
