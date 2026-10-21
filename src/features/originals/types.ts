export type OriginalImage = {
  id?: string;
  objectKey?: string;
  imageName: string;
  imageUrl?: string;
};
export type OriginalPayload = {
  title: string;
  oneLineIntro: string;
  description: string;
  protagonistName?: string;
  genres: string[];
  storySettings: {
    worldSetting: string;
    characterSetting: string;
    userRoleSetting: string;
    ruleSetting: string;
  };
  startSettings: {
    id?: string;
    name: string;
    prologue: string;
    startSituation: string;
    suggestedInputs: string[];
    endings: {
      name: string;
      requirement: { minTurns: number; achievementCondition: string };
      epilogue: string;
    }[];
  }[];
  mainEvents: { name: string; description: string; keySentence: string }[];
  characters: {
    id?: string;
    name: string;
    description: string;
    images: OriginalImage[];
  }[];
  thumbnailObjectKey?: string;
  removeThumbnail: boolean;
};
export type OriginalSaveRequest = {
  status: 'DRAFT' | 'PUBLISHED';
  payload: OriginalPayload;
};
export type OriginalListItem = {
  id: string;
  title: string;
  genres: string[];
  status: 'DRAFT' | 'PUBLISHED';
  visibility: 'PUBLIC' | 'PRIVATE';
  owner: { memberId: string; nickname: string };
  chatCount: number;
  totalTurns: number;
  updatedAt: string;
};
export type OriginalDetail = OriginalListItem & {
  payload: OriginalPayload;
  draftPayload: OriginalPayload | null;
  thumbnailUrl: string | null;
};
export type OriginalUpload = {
  objectKey: string;
  imageUrl: string;
  kind: 'COVER' | 'CHARACTER';
};
export type OriginalVisibilityRequest = { visibility: 'PUBLIC' | 'PRIVATE' };
export type OriginalCatalog = { genres: string[] };
