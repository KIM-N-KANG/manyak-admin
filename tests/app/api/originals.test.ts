import { beforeEach, describe, expect, it } from 'vitest';

import { GET as charts } from '@/app/api/dashboard/charts/route';
import { POST as scopedPresign } from '@/app/api/originals/[id]/images/presign/route';
import { GET as detail, PATCH } from '@/app/api/originals/[id]/route';
import { DELETE as deleteThumbnail } from '@/app/api/originals/[id]/thumbnail/route';
import { GET as image, PUT } from '@/app/api/originals/images/[id]/route';
import { POST as presign } from '@/app/api/originals/images/presign/route';
import { GET as list, POST } from '@/app/api/originals/route';
import { GET as storyList } from '@/app/api/stories/route';
import { getDistributionHref } from '@/features/dashboard/links';
import { originalFormValues } from '@/features/originals/form-values';
import type {
  OriginalDetail,
  OriginalListItem,
  OriginalPresign,
} from '@/features/originals/types';
import type { Page } from '@/features/shared/types';
import { chats, officialMember, stories } from '@/fixtures/entities';

import { originalPayload, png } from '../../helpers/originals';

const baseStories = structuredClone(stories);
const baseChats = structuredClone(chats);

beforeEach(() => {
  delete (globalThis as typeof globalThis & { manyakOriginalFixture?: unknown })
    .manyakOriginalFixture;
  stories.splice(0, stories.length, ...structuredClone(baseStories));
  chats.splice(0, chats.length, ...structuredClone(baseChats));
});

const req = (body?: unknown, query = '') =>
  new Request(
    `http://localhost/api/originals${query}`,
    body === undefined
      ? undefined
      : {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        },
  );
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function payload() {
  const { removeThumbnail, ...fields } = originalPayload();

  void removeThumbnail;

  return fields;
}

async function create(status = 'PUBLISHED'): Promise<OriginalDetail> {
  const response = await POST(
    req({
      ...payload(),
      status,
      visibility: status === 'PUBLISHED' ? 'PUBLIC' : 'PRIVATE',
      reason: '작성',
    }),
  );

  expect(response.status).toBe(201);

  return response.json();
}

async function upload(kind = 'COVER', storyId?: string) {
  const body = { kind, contentType: 'image/png', contentLength: png.length };
  const response = storyId
    ? await scopedPresign(req(body), ctx(storyId))
    : await presign(req(body));

  expect(response.status).toBe(201);

  const data: OriginalPresign = await response.json();
  const id = data.uploadUrl.split('/').at(-1)!;
  const result = await PUT(
    new Request(`http://localhost${data.uploadUrl}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: new Uint8Array(png),
    }),
    ctx(id),
  );

  expect(result.status).toBe(200);

  return { ...data, id };
}

describe('최신 오리지널 계약', () => {
  it('공식 계정 목록과 숫자 페이지·정렬·표지 필드를 제공한다', async () => {
    const page: Page<OriginalListItem> = await list(req()).json();

    expect(page.totalElements).toBe(12);
    expect(
      page.items.every((i) => i.owner.memberId === officialMember.memberId),
    ).toBe(true);
    expect(page.items[0]).toHaveProperty('storyId');
    expect(page.items[0]).toHaveProperty('thumbnailUrl', null);
    expect(page.items[0]).not.toHaveProperty('id');
    expect((await list(req(undefined, '?page=4&size=5')).json()).items).toEqual(
      [],
    );

    const asc: Page<OriginalListItem> = await list(
      req(undefined, '?sort=chatCount&order=asc&size=100'),
    ).json();

    expect(asc.items[0].chatCount <= asc.items.at(-1)!.chatCount).toBe(true);
  });
  it.each([
    'page=0',
    'size=101',
    'sort=unknown',
    'cursor=x',
    'q=',
    'status=BAD',
  ])('목록 쿼리 %s를 거절한다', (q) => {
    expect(list(req(undefined, `?${q}`)).status).toBe(400);
  });
  it('제목만으로 초안을 만들고 기본값과 평탄한 응답을 반환한다', async () => {
    const response = await POST(req({ title: '새 초안', reason: '작성' }));

    expect(response.status).toBe(201);

    const item = await response.json();

    expect(item).toMatchObject({
      status: 'DRAFT',
      visibility: 'PRIVATE',
      startSettings: [],
      thumbnailModerationStatus: 'APPROVED',
    });

    for (const key of [
      'id',
      'payload',
      'draftPayload',
      'removeThumbnail',
      'thumbnailObjectKey',
      'submission',
    ])
      expect(item).not.toHaveProperty(key);
  });
  it.each([
    { reason: '사유' },
    { title: ' ', reason: '사유' },
    { title: '초안' },
    { title: '초안', reason: '사유', draftId: 'x' },
    { title: '초안', reason: '사유', visibility: 'PUBLIC' },
    { status: 'DRAFT', payload: { title: '봉투' }, reason: '사유' },
  ])('필수값과 이전 봉투 및 잘못된 등록을 거절한다', async (body) => {
    expect((await POST(req(body))).status).toBe(400);
  });
  it('발행 검증 후 공개하며 부분 수정·null 유지·사유를 적용한다', async () => {
    const item = await create();
    const response = await PATCH(
      req({
        title: '수정 제목',
        description: null,
        visibility: 'PRIVATE',
        reason: '수정',
      }),
      ctx(item.storyId),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      title: '수정 제목',
      description: item.description,
      status: 'PUBLISHED',
      visibility: 'PRIVATE',
    });
    expect(
      (
        await PATCH(
          req({ status: 'DRAFT', reason: '되돌림' }),
          ctx(item.storyId),
        )
      ).status,
    ).toBe(400);
    expect(
      (await PATCH(req({ visibility: 'PUBLIC' }), ctx(item.storyId))).status,
    ).toBe(400);
  });
  it('초안에서 발행할 때 전체 등록 필드를 검증한다', async () => {
    const draft = await create('DRAFT');

    expect(
      (
        await PATCH(
          req({ status: 'PUBLISHED', visibility: 'PUBLIC', reason: '발행' }),
          ctx(draft.storyId),
        )
      ).status,
    ).toBe(200);

    const bad = await (
      await POST(req({ title: '미완성', reason: '작성' }))
    ).json();

    expect(
      (
        await PATCH(
          req({ status: 'PUBLISHED', reason: '발행' }),
          ctx(bad.storyId),
        )
      ).status,
    ).toBe(400);
  });
  it('공식 소유 외 스토리와 잘못된 ID를 구분한다', async () => {
    expect((await detail(req(), ctx('bad'))).status).toBe(400);
    expect(
      (
        await detail(
          req(),
          ctx(stories.find((s) => s.scope === 'user')!.storyId),
        )
      ).status,
    ).toBe(404);
  });
  it('타 스토리 인물·시작 ID와 미업로드 객체 키·장르를 거절한다', async () => {
    const one = await create();
    const other = await create();

    for (const fields of [
      { characters: originalFormValues(other).characters },
      { startSettings: other.startSettings },
      { thumbnailObjectKey: 'missing' },
      { genres: ['없는장르'] },
    ])
      expect(
        (await PATCH(req({ ...fields, reason: '수정' }), ctx(one.storyId)))
          .status,
      ).toBe(400);
  });
  it('presign 예약만으로는 저장할 수 없고 PUT 후 키로 표지·이미지를 등록한다', async () => {
    const reservation = await (
      await presign(
        req({
          kind: 'COVER',
          contentType: 'image/png',
          contentLength: png.length,
        }),
      )
    ).json();

    expect(
      (
        await POST(
          req({
            title: '미업로드',
            reason: '작성',
            thumbnailObjectKey: reservation.objectKey,
          }),
        )
      ).status,
    ).toBe(400);

    const cover = await upload();
    const character = await upload('CHARACTER');
    const response = await POST(
      req({
        ...payload(),
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        reason: '작성',
        thumbnailObjectKey: cover.objectKey,
        characters: [
          {
            name: '도윤',
            images: [
              { objectKey: character.objectKey, imageName: '도윤_기본' },
            ],
          },
        ],
      }),
    );

    expect(response.status).toBe(201);

    const item: OriginalDetail = await response.json();

    expect(item.thumbnailUrl).toBe(cover.uploadUrl);
    expect(item.characters[0].images[0]).toMatchObject({
      imageUrl: character.uploadUrl,
      objectKey: null,
      moderationStatus: 'APPROVED',
    });
    expect(item.characters[0].images[0].id).toBeTruthy();
    expect(
      (await image(req(), ctx(cover.id))).headers.get('Content-Type'),
    ).toBe('image/png');

    const kept = await PATCH(
      req({
        reason: '유지',
        characters: [
          {
            id: item.characters[0].id,
            name: '도윤',
            images: [{ id: item.characters[0].images[0].id }],
          },
        ],
      }),
      ctx(item.storyId),
    );

    expect(kept.status).toBe(200);
  });
  it('스토리별 presign 키 범위를 검증하고 표지는 DELETE로만 제거한다', async () => {
    const one = await create();
    const other = await create();
    const cover = await upload('COVER', one.storyId);

    expect(cover.objectKey).toContain(`/uploaded/${one.storyId}/`);
    expect(
      (
        await PATCH(
          req({ thumbnailObjectKey: cover.objectKey, reason: '교체' }),
          ctx(other.storyId),
        )
      ).status,
    ).toBe(400);
    await PATCH(
      req({ thumbnailObjectKey: cover.objectKey, reason: '교체' }),
      ctx(one.storyId),
    );
    expect(
      (await deleteThumbnail(req({ reason: '제거' }), ctx(one.storyId))).status,
    ).toBe(200);
    expect(
      (await (await detail(req(), ctx(one.storyId))).json()).thumbnailUrl,
    ).toBeNull();
    expect((await deleteThumbnail(req({}), ctx(one.storyId))).status).toBe(400);
  });
  it.each([
    { kind: 'BAD', contentType: 'image/png', contentLength: 10 },
    { kind: 'COVER', contentType: 'image/svg+xml', contentLength: 10 },
    { kind: 'COVER', contentType: 'image/png', contentLength: 5242881 },
  ])('presign 형식·크기를 검사한다', async (body) => {
    expect((await presign(req(body))).status).toBe(400);
  });
  it('장르·미업로드·중복 이미지 이름의 오류 코드를 구분한다', async () => {
    const invalid = await POST(
      req({
        ...payload(),
        status: 'PUBLISHED',
        reason: '작성',
        genres: ['없는장르'],
      }),
    );

    expect(await invalid.json()).toMatchObject({
      status: 400,
      code: 'INVALID_GENRE',
    });

    const missing = await POST(
      req({ title: '초안', reason: '작성', thumbnailObjectKey: 'missing' }),
    );

    expect(await missing.json()).toMatchObject({
      status: 400,
      code: 'UPLOAD_NOT_FOUND',
    });

    const asset = await upload('CHARACTER');
    const duplicate = await POST(
      req({
        ...payload(),
        status: 'PUBLISHED',
        reason: '작성',
        characters: [
          {
            name: '도윤',
            images: [
              { objectKey: asset.objectKey, imageName: '도윤_기본' },
              { objectKey: asset.objectKey, imageName: '도윤_기본' },
            ],
          },
        ],
      }),
    );

    expect(await duplicate.json()).toMatchObject({
      status: 409,
      code: 'CONFLICT',
    });
  });
  it('PUT 크기·형식·파일 서명을 검사한다', async () => {
    const data = await (
      await presign(
        req({ kind: 'COVER', contentType: 'image/png', contentLength: 3 }),
      )
    ).json();
    const id = data.uploadUrl.split('/').at(-1);

    expect(
      (
        await PUT(
          new Request(`http://localhost${data.uploadUrl}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/png' },
            body: 'bad',
          }),
          ctx(id),
        )
      ).status,
    ).toBe(400);
  });
  it('수정한 제목·복수 장르와 기존 지표가 관리 목록 및 차트에 이어진다', async () => {
    const page: Page<OriginalListItem> = await list(req()).json();
    const item = page.items[0];
    const before = stories.find((s) => s.storyId === item.storyId)!;

    await PATCH(
      req({ title: '새 제목', genres: ['판타지', '로맨스'], reason: '수정' }),
      ctx(item.storyId),
    );

    const result = await storyList(
      new Request(`http://localhost/api/stories?q=${item.storyId}`),
    ).json();

    expect(result.items[0]).toMatchObject({
      title: '새 제목',
      genre: '판타지, 로맨스',
      chatCount: before.chatCount,
      totalTurns: before.totalTurns,
    });

    const chart = await charts(
      new Request('http://localhost/api/dashboard/charts?days=7'),
    ).json();
    const point = chart.distributions[0].points.find(
      (p: { label: string }) => p.label === '판타지',
    );

    expect(
      (
        await storyList(
          new Request(
            `http://localhost/api${getDistributionHref(point.link)}&size=100`,
          ),
        ).json()
      ).items.some((s: { storyId: string }) => s.storyId === item.storyId),
    ).toBe(true);
  });
});

it.each(['', '   '])(
  'PATCH의 주인공 이름 %j는 400이며 기존 값을 유지한다',
  async (protagonistName) => {
    const original = await create('DRAFT');
    const response = await PATCH(
      req({ protagonistName, reason: '이름 변경' }),
      ctx(original.storyId),
    );

    expect(response.status).toBe(400);

    const stored = await detail(req(), ctx(original.storyId));

    expect((await stored.json()).protagonistName).toBe(
      original.protagonistName,
    );
  },
);
it.each([undefined, null])(
  'PATCH의 주인공 이름 %j는 기존 값을 유지한다',
  async (protagonistName) => {
    const original = await create('DRAFT');
    const response = await PATCH(
      req({ protagonistName, reason: '일부 변경' }),
      ctx(original.storyId),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).protagonistName).toBe(
      original.protagonistName,
    );
  },
);
