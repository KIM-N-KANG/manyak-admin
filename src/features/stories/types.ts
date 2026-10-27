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
  deletedAt: string | null;
  takenDownAt: string | null;
  takedownReason: string | null;
  takedownReasonDetail: string | null;
};
export type StoryDetail = Story & {
  retention: { turn: number; rate: number }[];
  recentChats: ChatRoom[];
};
export type StorySettings = {
  deletedAt: string | null;
  title: string;
  oneLineIntro: string | null;
  description: string | null;
  protagonistName: string | null;
  genres: string[];
  storySettings: {
    worldSetting: string | null;
    characterSetting: string | null;
    userRoleSetting: string | null;
    ruleSetting: string | null;
  };
  startSettings: {
    id: string;
    name: string;
    prologue: string | null;
    startSituation: string | null;
    suggestedInputs: string[];
    endings: {
      name: string;
      requirement: { minTurns: number; achievementCondition: string };
      epilogue: string;
    }[];
  }[];
  mainEvents: {
    name: string;
    description: string;
    keySentence: string;
    sortOrder: number;
  }[];
  visibility: 'PUBLIC' | 'PRIVATE';
  thumbnailUrl: string | null;
  thumbnailModerationStatus: string;
  characters: {
    id: string;
    name: string;
    description: string | null;
    images: {
      id: string;
      imageName: string;
      imageUrl: string;
      moderationStatus: string;
    }[];
  }[];
};
