export type OriginalImage = {
  id?: string;
  objectKey?: string;
  imageName: string;
  imageUrl?: string;
};
/** 화면 편집 상태이며 removeThumbnail은 API 본문으로 전송하지 않는다. */
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

export type OriginalRequestFields = Omit<
  OriginalPayload,
  'removeThumbnail' | 'characters'
> & {
  characters: {
    id?: string;
    name: string;
    description?: string | null;
    images?: (
      | { id: string; imageName?: string; objectKey?: never }
      | { id?: never; objectKey: string; imageName: string }
    )[];
  }[];
};

export type OriginalSaveRequest = {
  [K in keyof OriginalRequestFields]?: OriginalRequestFields[K] | null;
} & {
  status?: 'DRAFT' | 'PUBLISHED';
  visibility?: 'PUBLIC' | 'PRIVATE';
  reason: string;
};
export type OriginalListItem = {
  storyId: string;
  title: string;
  genres: string[];
  status: 'DRAFT' | 'PUBLISHED';
  visibility: 'PUBLIC' | 'PRIVATE';
  owner: { memberId: string; nickname: string };
  chatCount: number;
  totalTurns: number;
  thumbnailUrl: string | null;
  updatedAt: string;
};
export type OriginalDetail = OriginalListItem &
  Omit<
    OriginalPayload,
    | 'removeThumbnail'
    | 'thumbnailObjectKey'
    | 'description'
    | 'protagonistName'
    | 'characters'
    | 'storySettings'
    | 'startSettings'
    | 'mainEvents'
  > & {
    description: string | null;
    protagonistName: string | null;
    thumbnailModerationStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
    storySettings: {
      [K in keyof OriginalPayload['storySettings']]: string | null;
    };
    startSettings: (Omit<
      OriginalPayload['startSettings'][number],
      'id' | 'prologue' | 'startSituation'
    > & {
      id: string;
      prologue: string | null;
      startSituation: string | null;
    })[];
    mainEvents: (OriginalPayload['mainEvents'][number] & {
      sortOrder: number;
    })[];
    characters: {
      id: string;
      name: string;
      description: string | null;
      images: {
        id: string;
        imageName: string;
        imageUrl: string;
        moderationStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
        objectKey: string | null;
      }[];
    }[];
  };
/** 폼에서 업로드 미리보기를 전달하는 값이다. */
export type OriginalUpload = {
  objectKey: string;
  imageUrl: string;
  kind: 'COVER' | 'CHARACTER';
};
export type OriginalPresign = {
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
};
export type OriginalCatalog = {
  genres: { id: number; name: string }[];
  featuredGenres: { id: number; name: string }[];
};
