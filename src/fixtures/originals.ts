import type {
  OriginalDetail,
  OriginalPayload,
  OriginalSaveRequest,
  OriginalUpload,
} from '@/features/originals/types';
import { chats, officialMember, stories } from '@/fixtures/entities';
import { originalGenres } from '@/fixtures/original-genres';

type Asset = OriginalUpload & {
  id: string;
  bytes: Uint8Array;
  contentType: string;
};

type State = {
  records: Map<string, OriginalDetail>;
  assets: Map<string, Asset>;
  imageKeys: Map<string, string>;
};

const shared = globalThis as typeof globalThis & {
  manyakOriginalFixture?: State;
};

function initialPayload(title: string, genre: string): OriginalPayload {
  return {
    title,
    oneLineIntro: '선택에 따라 새로운 이야기가 펼쳐집니다.',
    description: '마냑이 선보이는 공식 오리지널 스토리입니다.',
    protagonistName: '서린',
    genres: [genre === '일상' ? '일상물' : genre],
    storySettings: {
      worldSetting: '기억을 보관하는 도서관.',
      characterSetting: '사서 도윤이 도서관을 지킨다.',
      userRoleSetting: '잃어버린 기억을 찾는 방문자.',
      ruleSetting: '선택에 따라 단서를 공개한다.',
    },
    startSettings: [
      {
        id: crypto.randomUUID(),
        name: '도서관의 문',
        prologue: '문 너머에서 빛이 새어 나온다.',
        startSituation: '도서관 입구에서 사서를 만난다.',
        suggestedInputs: [
          '문을 열어 본다.',
          '사서에게 인사한다.',
          '주변을 살펴본다.',
        ],
        endings: [],
      },
    ],
    mainEvents: [],
    characters: [
      {
        id: crypto.randomUUID(),
        name: '도윤',
        description: '기록을 지키는 사서.',
        images: [],
      },
    ],
    removeThumbnail: false,
  };
}

function state(): State {
  if (!shared.manyakOriginalFixture) {
    shared.manyakOriginalFixture = {
      records: new Map(
        stories
          .filter((story) => story.scope === 'original')
          .map((story) => [
            story.storyId,
            {
              id: story.storyId,
              title: story.title,
              genres: [story.genre === '일상' ? '일상물' : story.genre],
              status: 'PUBLISHED',
              visibility: story.visibility,
              owner: { memberId: officialMember.memberId, nickname: '마냑' },
              chatCount: story.chatCount,
              totalTurns: story.totalTurns,
              updatedAt: story.createdAt,
              payload: initialPayload(story.title, story.genre),
              draftPayload: null,
              thumbnailUrl: null,
            },
          ]),
      ),
      assets: new Map(),
      imageKeys: new Map(),
    };
  }

  return shared.manyakOriginalFixture;
}

function assetFor(image: { id?: string; objectKey?: string }) {
  const store = state();
  const key =
    image.objectKey ?? (image.id ? store.imageKeys.get(image.id) : undefined);

  return key ? store.assets.get(key) : undefined;
}

function decorate(payload: OriginalPayload): OriginalPayload {
  const result = structuredClone(payload);

  result.characters.forEach((character) =>
    character.images.forEach((image) => {
      image.imageUrl = assetFor(image)?.imageUrl;
    }),
  );

  return result;
}

export function listOriginals() {
  return [...state().records.values()].map(
    ({ payload, draftPayload, thumbnailUrl, ...item }) => {
      void payload;
      void draftPayload;
      void thumbnailUrl;

      return structuredClone(item);
    },
  );
}
export function getOriginal(id: string): OriginalDetail | null {
  const original = state().records.get(id);

  if (!original) return null;

  return {
    ...structuredClone(original),
    payload: decorate(original.payload),
    draftPayload: original.draftPayload
      ? decorate(original.draftPayload)
      : null,
  };
}

function validateReferences(
  payload: OriginalPayload,
  previous?: OriginalDetail,
) {
  const oldCharacters = new Map(
    previous?.payload.characters.map((character) => [character.id, character]),
  );
  const seen = new Set<string>();

  for (const character of payload.characters) {
    const old = character.id ? oldCharacters.get(character.id) : undefined;

    if (character.id && (!old || seen.has(character.id)))
      throw new Error(
        '인물 식별자가 이 스토리에 속하지 않거나 중복되었습니다.',
      );

    if (character.id) seen.add(character.id);

    const images = new Set<string>();

    for (const image of character.images) {
      if (
        image.id &&
        (!old?.images.some((entry) => entry.id === image.id) ||
          images.has(image.id))
      )
        throw new Error('기존 이미지 식별자가 올바르지 않습니다.');

      if (image.id) images.add(image.id);

      if (
        image.objectKey &&
        state().assets.get(image.objectKey)?.kind !== 'CHARACTER'
      )
        throw new Error('인물 이미지 업로드를 찾을 수 없습니다.');
    }
  }

  const starts = new Set<string>();

  for (const start of payload.startSettings) {
    if (
      start.id &&
      (!previous?.payload.startSettings.some(
        (entry) => entry.id === start.id,
      ) ||
        starts.has(start.id))
    )
      throw new Error('시작 설정 식별자가 올바르지 않습니다.');

    if (start.id) starts.add(start.id);
  }

  if (
    payload.thumbnailObjectKey &&
    state().assets.get(payload.thumbnailObjectKey)?.kind !== 'COVER'
  )
    throw new Error('표지 업로드를 찾을 수 없습니다.');

  for (const genre of payload.genres)
    if (
      !originalGenres.includes(genre) &&
      !previous?.payload.genres.includes(genre)
    )
      throw new Error('활성 제공 장르를 선택하세요.');
}

function normalize(payload: OriginalPayload, published: boolean) {
  const result = structuredClone(payload);

  result.genres = [...new Set(result.genres)];
  result.characters.forEach((character) => {
    character.description = character.description.trim();

    if (published) {
      character.id ??= crypto.randomUUID();
      character.images = character.images.map((image) => {
        if (image.id) return image;

        const id = crypto.randomUUID();

        state().imageKeys.set(id, image.objectKey!);

        return { id, imageName: image.imageName };
      });
    }
  });

  if (published)
    result.startSettings.forEach((start) => {
      start.id ??= crypto.randomUUID();
    });

  return result;
}

function syncStory(record: OriginalDetail) {
  const index = stories.findIndex((story) => story.storyId === record.id);
  const story = {
    storyId: record.id,
    title: record.payload.title,
    description: record.payload.description,
    genre: record.payload.genres.join(', '),
    scope: 'original' as const,
    visibility: record.visibility,
    moderationStatus: 'APPROVED' as const,
    tags: record.payload.genres,
    supportingCharacterCount:
      index >= 0 ? stories[index].supportingCharacterCount : 0,
    owner: officialMember,
    chatCount: record.chatCount,
    totalTurns: record.totalTurns,
    createdAt: index >= 0 ? stories[index].createdAt : record.updatedAt,
  };

  if (index >= 0) stories[index] = story;
  else stories.push(story);

  chats.forEach((chat) => {
    if (chat.story.storyId === record.id)
      chat.story = {
        storyId: record.id,
        title: story.title,
        genre: story.genre,
      };
  });
}

export function saveOriginal(
  input: OriginalSaveRequest,
  id?: string,
): OriginalDetail {
  const previous = id ? state().records.get(id) : undefined;

  validateReferences(input.payload, previous);

  const published = input.status === 'PUBLISHED';
  const payload = normalize(input.payload, published);

  payload.protagonistName ??= previous?.payload.protagonistName;

  const now = new Date().toISOString();
  const identifier = id ?? crypto.randomUUID();
  let record: OriginalDetail;

  if (previous && !published && previous.status === 'PUBLISHED') {
    record = { ...previous, draftPayload: payload, updatedAt: now };
  } else {
    record = {
      id: identifier,
      title: payload.title,
      genres: payload.genres,
      status: published ? 'PUBLISHED' : 'DRAFT',
      visibility: published ? 'PUBLIC' : 'PRIVATE',
      owner: { memberId: officialMember.memberId, nickname: '마냑' },
      chatCount: previous?.chatCount ?? 0,
      totalTurns: previous?.totalTurns ?? 0,
      updatedAt: now,
      payload,
      draftPayload: null,
      thumbnailUrl: payload.removeThumbnail
        ? null
        : payload.thumbnailObjectKey
          ? state().assets.get(payload.thumbnailObjectKey)!.imageUrl
          : (previous?.thumbnailUrl ?? null),
    };

    if (published) syncStory(record);
  }

  state().records.set(identifier, record);

  return getOriginal(identifier)!;
}
export function setOriginalVisibility(
  id: string,
  visibility: 'PUBLIC' | 'PRIVATE',
) {
  const record = state().records.get(id)!;

  if (record.status !== 'PUBLISHED' && visibility === 'PUBLIC')
    throw new Error('초안은 공개 폼 검증과 공개 저장을 먼저 완료하세요.');

  record.visibility = visibility;
  record.updatedAt = new Date().toISOString();

  if (record.status === 'PUBLISHED') syncStory(record);

  return getOriginal(id)!;
}
export async function uploadOriginal(
  file: File,
  kind: 'COVER' | 'CHARACTER',
): Promise<OriginalUpload> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const valid =
    file.type === 'image/png'
      ? bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
      : file.type === 'image/jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : file.type === 'image/webp' &&
          new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
          new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';

  if (!valid) throw new Error('이미지 파일 형식이 올바르지 않습니다.');

  const id = crypto.randomUUID();
  const extension = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }[file.type]!;
  const objectKey = `${kind === 'COVER' ? 'thumbnails' : 'characters'}/uploaded/drafts/${officialMember.memberId}/${id}.${extension}`;
  const imageUrl = `/api/originals/images/${id}`;

  state().assets.set(objectKey, {
    id,
    objectKey,
    imageUrl,
    kind,
    bytes,
    contentType: file.type,
  });

  return { objectKey, imageUrl, kind };
}
export function originalAsset(id: string) {
  return [...state().assets.values()].find((asset) => asset.id === id);
}
