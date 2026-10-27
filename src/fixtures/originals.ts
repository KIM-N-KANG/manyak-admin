import { OriginalFixtureError } from '@/features/originals/bff';
import {
  emptyOriginal,
  originalDraftSchema,
  originalPublishSchema,
} from '@/features/originals/form-schema';
import type {
  OriginalDetail,
  OriginalListItem,
  OriginalPayload,
  OriginalPresign,
  OriginalSaveRequest,
  OriginalUpload,
} from '@/features/originals/types';
import {
  chats,
  memberSummary,
  officialMember,
  stories,
} from '@/fixtures/entities';
import {
  checkFixtureId,
  readReason,
  requireFixture,
} from '@/fixtures/management-bff';
import { originalGenres } from '@/fixtures/original-genres';

type Asset = OriginalUpload & {
  id: string;
  bytes: Uint8Array | null;
  contentLength: number;
  expiresAt: number;
  contentType: string;
};

type StoredOriginal = Omit<OriginalListItem, 'thumbnailUrl'> & {
  payload: OriginalPayload;
  thumbnailUrl: string | null;
};

type State = {
  records: Map<string, StoredOriginal>;
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
              storyId: story.storyId,
              title: story.title,
              genres: [story.genre === '일상' ? '일상물' : story.genre],
              status: 'PUBLISHED',
              visibility: story.visibility,
              owner: { memberId: officialMember.memberId, nickname: '마냑' },
              chatCount: story.chatCount,
              totalTurns: story.totalTurns,
              updatedAt: story.createdAt,
              payload: initialPayload(story.title, story.genre),
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

export function listOriginals(): OriginalListItem[] {
  return [...state().records.values()].map(({ payload, ...item }) => {
    void payload;

    return structuredClone(item);
  });
}
export function getOriginal(id: string): OriginalDetail | null {
  const original = state().records.get(id);

  if (!original) return null;

  const { payload, ...item } = structuredClone(original);
  const { removeThumbnail, thumbnailObjectKey, ...fields } = payload;

  void removeThumbnail;
  void thumbnailObjectKey;

  return {
    ...fields,
    ...item,
    description: payload.description || null,
    protagonistName: payload.protagonistName ?? null,
    thumbnailModerationStatus: 'APPROVED',
    startSettings: payload.startSettings.map((start) => ({
      ...start,
      id: start.id!,
      prologue: start.prologue || null,
      startSituation: start.startSituation || null,
    })),
    mainEvents: payload.mainEvents.map((event, sortOrder) => ({
      ...event,
      sortOrder,
    })),
    characters: payload.characters.map((character) => ({
      id: character.id!,
      name: character.name,
      description: character.description || null,
      images: character.images.map((image) => ({
        id: image.id!,
        imageName: image.imageName,
        imageUrl: assetFor(image)?.imageUrl ?? '',
        moderationStatus: 'APPROVED',
        objectKey: null,
      })),
    })),
  };
}

function uploadedAsset(
  key: string,
  kind: 'COVER' | 'CHARACTER',
  storyId?: string,
) {
  const asset = state().assets.get(key);
  const prefix = kind === 'COVER' ? 'thumbnails' : 'characters';

  if (!asset?.bytes)
    throw new OriginalFixtureError(
      'UPLOAD_NOT_FOUND',
      '업로드를 완료한 객체 키를 지정하세요.',
    );

  if (
    asset.kind !== kind ||
    !(
      key.startsWith(`${prefix}/uploaded/drafts/${officialMember.memberId}/`) ||
      (storyId && key.startsWith(`${prefix}/uploaded/${storyId}/`))
    )
  )
    throw new Error('업로드를 완료한 올바른 객체 키를 지정하세요.');

  return asset;
}

function validateReferences(
  payload: OriginalPayload,
  previous?: StoredOriginal,
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

      if (image.objectKey)
        uploadedAsset(image.objectKey, 'CHARACTER', previous?.storyId);
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

  if (payload.thumbnailObjectKey)
    uploadedAsset(payload.thumbnailObjectKey, 'COVER', previous?.storyId);

  for (const genre of payload.genres)
    if (
      !originalGenres.includes(genre) &&
      !previous?.payload.genres.includes(genre)
    )
      throw new OriginalFixtureError(
        'INVALID_GENRE',
        '활성 제공 장르를 선택하세요.',
      );
}

function normalize(payload: OriginalPayload) {
  const result = structuredClone(payload);

  result.genres = [...new Set(result.genres)];
  result.characters.forEach((character) => {
    character.description = character.description.trim();

    {
      character.id ??= crypto.randomUUID();
      character.images = character.images.map((image) => {
        if (image.id) return image;

        const id = crypto.randomUUID();

        state().imageKeys.set(id, image.objectKey!);

        return { id, imageName: image.imageName };
      });
    }
  });

  result.startSettings.forEach((start) => {
    start.id ??= crypto.randomUUID();
  });

  return result;
}

function syncStory(record: StoredOriginal) {
  const index = stories.findIndex((story) => story.storyId === record.storyId);
  const story = {
    storyId: record.storyId,
    title: record.payload.title,
    description: record.payload.description,
    genre: record.payload.genres.join(', '),
    scope: 'original' as const,
    visibility: record.visibility,
    moderationStatus: 'APPROVED' as const,
    tags: index >= 0 ? stories[index].tags : [],
    supportingCharacterCount:
      index >= 0 ? stories[index].supportingCharacterCount : null,
    owner: memberSummary(officialMember),
    chatCount: record.chatCount,
    totalTurns: record.totalTurns,
    createdAt: index >= 0 ? stories[index].createdAt : record.updatedAt,
    deletedAt: null,
    takenDownAt: null,
    takedownReason: null,
    takedownReasonDetail: null,
  };

  if (index >= 0) stories[index] = story;
  else stories.push(story);

  chats.forEach((chat) => {
    if (chat.story.storyId === record.storyId)
      chat.story = {
        storyId: record.storyId,
        title: story.title,
        genre: story.genre,
      };
  });
}

export function saveOriginal(
  input: OriginalSaveRequest,
  id?: string,
): OriginalDetail {
  readReason(input as Record<string, unknown>);

  for (const key of [
    'payload',
    'draftPayload',
    'removeThumbnail',
    'draftId',
    'id',
  ])
    if (Object.hasOwn(input, key))
      throw new Error('일반 등록 필드와 상태·공개 범위·사유를 지정하세요.');

  const previous = id ? requireFixture(state().records.get(id)) : undefined;

  if (
    previous &&
    typeof input.protagonistName === 'string' &&
    !input.protagonistName.trim()
  )
    throw new Error(
      'protagonistName: 빈 문자열이나 공백으로 이름을 지울 수 없습니다.',
    );

  const status = input.status ?? previous?.status ?? 'DRAFT';
  const visibility = input.visibility ?? previous?.visibility ?? 'PRIVATE';

  if (
    !['DRAFT', 'PUBLISHED'].includes(status) ||
    !['PUBLIC', 'PRIVATE'].includes(visibility) ||
    (status === 'DRAFT' &&
      (visibility === 'PUBLIC' || previous?.status === 'PUBLISHED'))
  )
    throw new Error('발행 상태와 공개 범위를 확인하세요.');

  const merged: OriginalPayload = structuredClone(
    previous?.payload ?? { ...emptyOriginal(), startSettings: [] },
  );

  for (const key of [
    'title',
    'oneLineIntro',
    'description',
    'protagonistName',
    'genres',
    'storySettings',
    'startSettings',
    'mainEvents',
    'characters',
    'thumbnailObjectKey',
  ] as const)
    if (input[key] != null) Object.assign(merged, { [key]: input[key] });

  if (!previous) {
    merged.startSettings.forEach((start) => delete start.id);

    if (merged.characters.some((c) => c.id))
      throw new Error('등록에는 기존 인물 ID를 지정할 수 없습니다.');
  }

  if (previous && input.characters)
    merged.characters = merged.characters.map((c) => {
      const old = previous.payload.characters.find((o) => o.id === c.id);

      return {
        ...c,
        description:
          c.description == null ? (old?.description ?? '') : c.description,
        images: c.images ?? old?.images ?? [],
      };
    });

  merged.characters = merged.characters.map((c) => {
    const old = previous?.payload.characters.find((o) => o.id === c.id);

    return {
      ...c,
      description: c.description ?? old?.description ?? '',
      images: (c.images ?? old?.images ?? []).map((image) => ({
        ...image,
        imageName:
          image.imageName ??
          `${c.name}_${
            old?.images
              .find((i) => i.id === image.id)
              ?.imageName.split('_')
              .at(-1) ?? '기본'
          }`,
      })),
    };
  });

  for (const c of merged.characters) {
    const names = new Set<string>();

    for (const image of c.images) {
      if (names.has(image.imageName))
        throw new OriginalFixtureError(
          'CONFLICT',
          '같은 인물의 이미지 이름은 중복할 수 없습니다.',
        );

      names.add(image.imageName);
    }
  }

  const result = (
    status === 'PUBLISHED' ? originalPublishSchema : originalDraftSchema
  ).safeParse(merged);

  if (!result.success)
    throw new Error(
      result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('\n'),
    );

  validateReferences(result.data, previous);

  const payload = normalize(result.data);
  const now = new Date().toISOString();
  const storyId = id ?? crypto.randomUUID();
  const record: StoredOriginal = {
    storyId,
    title: payload.title,
    genres: payload.genres,
    status,
    visibility,
    owner: { memberId: officialMember.memberId, nickname: '마냑' },
    chatCount: previous?.chatCount ?? 0,
    totalTurns: previous?.totalTurns ?? 0,
    updatedAt: now,
    payload,
    thumbnailUrl: payload.thumbnailObjectKey
      ? uploadedAsset(payload.thumbnailObjectKey, 'COVER', id).imageUrl
      : (previous?.thumbnailUrl ?? null),
  };

  delete record.payload.thumbnailObjectKey;
  state().records.set(storyId, record);

  if (status === 'PUBLISHED') syncStory(record);

  return getOriginal(storyId)!;
}
export function deleteOriginalThumbnail(
  id: string,
  body: Record<string, unknown>,
) {
  checkFixtureId(id);
  readReason(body);

  const record = requireFixture(state().records.get(id));

  record.thumbnailUrl = null;
  record.updatedAt = new Date().toISOString();

  return getOriginal(id)!;
}
export function presignOriginal(
  body: Record<string, unknown>,
  storyId?: string,
): OriginalPresign {
  if (storyId) {
    checkFixtureId(storyId);
    requireFixture(state().records.get(storyId));
  }

  const { kind, contentType, contentLength } = body;

  if (
    (kind !== 'COVER' && kind !== 'CHARACTER') ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(String(contentType)) ||
    typeof contentLength !== 'number' ||
    !Number.isInteger(contentLength) ||
    contentLength < 1 ||
    contentLength > 5242880
  )
    throw new Error('이미지 종류·형식·크기를 확인하세요.');

  const id = crypto.randomUUID();
  const extension =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/jpeg'
        ? 'jpg'
        : 'webp';
  const objectKey = `${kind === 'COVER' ? 'thumbnails' : 'characters'}/uploaded/${storyId ?? `drafts/${officialMember.memberId}`}/${id}.${extension}`;
  const uploadUrl = `/api/originals/images/${id}`;

  state().assets.set(objectKey, {
    id,
    kind,
    objectKey,
    imageUrl: uploadUrl,
    bytes: null,
    contentType: String(contentType),
    contentLength,
    expiresAt: Date.now() + 600000,
  });

  return { uploadUrl, objectKey, expiresInSeconds: 600 };
}
export async function putOriginalAsset(id: string, request: Request) {
  const asset = requireFixture(originalAsset(id));

  if (asset.expiresAt < Date.now())
    throw new Error('업로드 시간이 만료되었습니다.');

  const bytes = new Uint8Array(await request.arrayBuffer());

  if (
    request.headers.get('Content-Type') !== asset.contentType ||
    bytes.length !== asset.contentLength
  )
    throw new Error('업로드 형식과 크기가 발급 조건과 다릅니다.');

  const valid =
    asset.contentType === 'image/png'
      ? bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
      : asset.contentType === 'image/jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
          new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';

  if (!valid) throw new Error('이미지 파일 형식이 올바르지 않습니다.');

  asset.bytes = bytes;
}
export function originalAsset(id: string) {
  return [...state().assets.values()].find((asset) => asset.id === id);
}
