import type { ChatRoom } from '@/features/chats/types';
import type { MemberSummary } from '@/features/shared/types';

export type Story = {
  storyId: string;
  title: string;
  description: string | null;
  genre: string;
  scope: 'original' | 'user';
  visibility: 'PUBLIC' | 'PRIVATE';
  moderationStatus: 'APPROVED' | 'HELD';
  tags: string[];
  supportingCharacterCount: number | null;
  owner: MemberSummary | null;
  chatCount: number;
  totalTurns: number;
  createdAt: string;
};
export type StoryDetail = Story & {
  retention: { turn: number; rate: number }[];
  recentChats: ChatRoom[];
};
