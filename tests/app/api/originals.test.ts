import { beforeEach, describe, expect, it } from 'vitest';

import { GET as charts } from '@/app/api/dashboard/charts/route';
import { GET as detail, PATCH } from '@/app/api/originals/[id]/route';
import { GET as catalog } from '@/app/api/originals/catalog/route';
import { GET as image } from '@/app/api/originals/images/[id]/route';
import { POST as upload } from '@/app/api/originals/images/route';
import { GET as list, POST } from '@/app/api/originals/route';
import { GET as storyList } from '@/app/api/stories/route';
import { getDistributionHref } from '@/features/dashboard/links';
import { emptyOriginal } from '@/features/originals/form-schema';
import type {
  OriginalDetail,
  OriginalListItem,
  OriginalUpload,
} from '@/features/originals/types';
import type { Page } from '@/features/shared/types';
import { chats, officialMember, stories } from '@/fixtures/entities';

import { originalPayload, png } from '../../helpers/originals';

const request = (path: string, body?: unknown, method = 'POST') =>
  new Request(
    `http://localhost/api/originals${path}`,
    body === undefined
      ? undefined
      : {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const baseStories = structuredClone(stories);
const baseChats = structuredClone(chats);

beforeEach(() => {
  delete (globalThis as typeof globalThis & { manyakOriginalFixture?: unknown })
    .manyakOriginalFixture;
  stories.splice(0, stories.length, ...structuredClone(baseStories));
  chats.splice(0, chats.length, ...structuredClone(baseChats));
});

async function create(
  status = 'PUBLISHED',
  payload = originalPayload(),
): Promise<OriginalDetail> {
  const response = await POST(
    request('', { status, payload, owner: { memberId: 'forged' } }),
  );

  expect(response.status).toBe(201);

  return response.json();
}

async function uploaded(kind: 'COVER' | 'CHARACTER' = 'COVER') {
  const form = new FormData();

  form.set('kind', kind);
  form.set('file', new File([png], 'image.png', { type: 'image/png' }));

  return upload(
    new Request('http://localhost/api/originals/images', {
      method: 'POST',
      body: form,
    }),
  );
}

describe('오리지널 BFF', () => {
  it('공식 계정만 목록에 제공하고 기본 20건·페이지 경계·필터를 유지한다', async () => {
    const data: Page<OriginalListItem> = await list(request('')).json();

    expect(data).toMatchObject({
      page: 1,
      size: 20,
      totalElements: 12,
      totalPages: 1,
    });
    expect(
      data.items.every(
        (item) =>
          item.owner.memberId === officialMember.memberId &&
          item.owner.nickname === '마냑',
      ),
    ).toBe(true);

    const last: Page<OriginalListItem> = await list(
      request('?page=3&size=5'),
    ).json();

    expect(last.items).toHaveLength(2);
    expect(await list(request('?page=4&size=5')).json()).toMatchObject({
      items: [],
      totalElements: 12,
      totalPages: 3,
    });

    const privateItems: Page<OriginalListItem> = await list(
      request('?visibility=PRIVATE&size=100'),
    ).json();

    expect(
      privateItems.items.every((item) => item.visibility === 'PRIVATE'),
    ).toBe(true);
    expect(await list(request('?status=DRAFT')).json()).toMatchObject({
      items: [],
      totalPages: 0,
    });
  });
  it.each(['chatCount', 'totalTurns', 'updatedAt'])(
    '%s 양방향 정렬·동률·페이지 연결을 고정한다',
    async (sort) => {
      await create('DRAFT', emptyOriginal());
      await create('DRAFT', emptyOriginal());

      for (const order of ['asc', 'desc']) {
        const full: Page<OriginalListItem> = await list(
          request(`?sort=${sort}&order=${order}&size=100`),
        ).json();
        const expected = [...full.items].sort((a, b) => {
          const left = a[sort as 'chatCount' | 'totalTurns' | 'updatedAt'];
          const right = b[sort as 'chatCount' | 'totalTurns' | 'updatedAt'];

          return (
            (left < right ? -1 : left > right ? 1 : 0) *
              (order === 'asc' ? 1 : -1) || a.id.localeCompare(b.id)
          );
        });

        expect(full.items.map((item) => item.id)).toEqual(
          expected.map((item) => item.id),
        );

        const ids: string[] = [];

        for (let page = 1; page <= Math.ceil(full.totalElements / 3); page++) {
          const result: Page<OriginalListItem> = await list(
            request(`?sort=${sort}&order=${order}&size=3&page=${page}`),
          ).json();

          ids.push(...result.items.map((item) => item.id));
        }

        expect(ids).toEqual(full.items.map((item) => item.id));
      }
    },
  );
  it.each([
    'page=0',
    'page=1.5',
    'page=x',
    'size=0',
    'size=101',
    'size=',
    'sort=latest',
    'order=ASC',
    'visibility=x',
    'status=x',
  ])('잘못된 목록 조건은 400이다: %s', (query) => {
    expect(list(request(`?${query}`)).status).toBe(400);
  });
  it('빈 초안 저장·재조회·수정·공개·비공개 전환을 구분한다', async () => {
    const draft = await create('DRAFT', emptyOriginal());

    expect(draft).toMatchObject({
      status: 'DRAFT',
      visibility: 'PRIVATE',
      chatCount: 0,
    });
    expect(
      (await detail(request(`/${draft.id}`), context(draft.id))).status,
    ).toBe(200);
    expect(
      (
        await PATCH(
          request(`/${draft.id}`, { visibility: 'PUBLIC' }, 'PATCH'),
          context(draft.id),
        )
      ).status,
    ).toBe(400);

    const published = await PATCH(
      request(
        `/${draft.id}`,
        { status: 'PUBLISHED', payload: originalPayload() },
        'PATCH',
      ),
      context(draft.id),
    );

    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      owner: { nickname: '마냑' },
    });

    const updated = await PATCH(
      request(`/${draft.id}`, { visibility: 'PRIVATE' }, 'PATCH'),
      context(draft.id),
    );

    expect(await updated.json()).toMatchObject({ visibility: 'PRIVATE' });
    expect(stories.find((story) => story.storyId === draft.id)).toMatchObject({
      scope: 'original',
      owner: { nickname: '마냑' },
      visibility: 'PRIVATE',
    });
  });
  it('공개된 내용과 수정 초안을 분리하고 공개 후 초안을 비운다', async () => {
    const original = await create();
    const payload = original.payload;

    payload.title = '수정 초안';

    const response = await PATCH(
      request(`/${original.id}`, { status: 'DRAFT', payload }, 'PATCH'),
      context(original.id),
    );

    expect(await response.json()).toMatchObject({
      title: '{username}의 도서관',
      visibility: 'PUBLIC',
      payload: { title: '{username}의 도서관' },
      draftPayload: { title: '수정 초안' },
    });

    const published = await PATCH(
      request(`/${original.id}`, { status: 'PUBLISHED', payload }, 'PATCH'),
      context(original.id),
    );

    expect(await published.json()).toMatchObject({
      title: '수정 초안',
      draftPayload: null,
    });
  });
  it('생성·수정의 잘못된 본문과 외부 인물·시작 설정·업로드 참조를 거절한다', async () => {
    expect(
      (
        await POST(
          request('', { status: 'PUBLISHED', payload: emptyOriginal() }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await POST(request('', { status: 'OTHER', payload: originalPayload() })))
        .status,
    ).toBe(400);

    const malformed = new Request('http://localhost/api/originals', {
      method: 'POST',
      body: '{',
    });

    expect((await POST(malformed)).status).toBe(400);

    const one = await create();
    const other = await create();

    for (const payload of [
      { ...one.payload, characters: other.payload.characters },
      { ...one.payload, startSettings: other.payload.startSettings },
      { ...one.payload, thumbnailObjectKey: 'thumbnails/missing' },
      { ...one.payload, genres: ['없는장르'] },
    ])
      expect(
        (
          await PATCH(
            request(`/${one.id}`, { status: 'PUBLISHED', payload }, 'PATCH'),
            context(one.id),
          )
        ).status,
      ).toBe(400);

    expect(
      (
        await PATCH(
          request(
            `/${one.id}`,
            { visibility: 'PUBLIC', title: '혼합' },
            'PATCH',
          ),
          context(one.id),
        )
      ).status,
    ).toBe(400);
  });
  it('일반 스토리와 잘못된 ID는 오리지널 상세·수정에서 404다', async () => {
    for (const id of [
      'bad',
      crypto.randomUUID(),
      stories.find((story) => story.scope === 'user')!.storyId,
    ]) {
      expect((await detail(request(`/${id}`), context(id))).status).toBe(404);
      expect(
        (
          await PATCH(
            request(`/${id}`, { visibility: 'PUBLIC' }, 'PATCH'),
            context(id),
          )
        ).status,
      ).toBe(404);
    }
  });
  it('기존 오리지널의 제목·복수 장르를 저장해도 차트와 목록 모집단이 일치한다', async () => {
    const data: Page<OriginalListItem> = await list(request('')).json();
    const id = data.items[0].id;
    const source: OriginalDetail = await (
      await detail(request(`/${id}`), context(id))
    ).json();
    const payload = source.payload;

    payload.title = '새 제목';
    payload.genres = ['힐링', 'SF'];

    const result = await PATCH(
      request(`/${id}`, { status: 'PUBLISHED', payload }, 'PATCH'),
      context(id),
    );

    expect(result.status).toBe(200);
    expect(
      chats
        .filter((chat) => chat.story.storyId === id)
        .every(
          (chat) =>
            chat.story.title === '새 제목' && chat.story.genre === '힐링, SF',
        ),
    ).toBe(true);

    const dashboard = await charts(
      new Request('http://localhost/api/dashboard/charts?days=90'),
    ).json();
    const distribution = dashboard.distributions.find(
      (item: { chartId: string }) => item.chartId === 'genre-depth',
    );

    for (const genre of payload.genres) {
      const point = distribution.points.find(
        (item: { label: string }) => item.label === genre,
      );
      const response = storyList(
        new Request(
          `http://localhost/api${getDistributionHref(point.link)}&size=100`,
        ),
      );
      const rows = await response.json();

      expect(
        rows.items.some((item: { storyId: string }) => item.storyId === id),
      ).toBe(true);

      const count = rows.items.reduce(
        (sum: number, item: { chatCount: number }) => sum + item.chatCount,
        0,
      );
      const turns = rows.items.reduce(
        (sum: number, item: { totalTurns: number }) => sum + item.totalTurns,
        0,
      );

      expect(point.value).toBeCloseTo(count ? turns / count : 0);
    }
  });
  it('제공 장르 카탈로그는 서버 시드의 정식 이름 197개다', async () => {
    const data = await catalog().json();

    expect(data.genres).toHaveLength(197);
    expect(data.genres).toContain('일상물');
    expect(data.genres).not.toContain('일상');
  });
});

describe('오리지널 이미지 BFF', () => {
  it('업로드·이미지 조회·등록·기존 이미지 유지·제거를 처리한다', async () => {
    const response = await uploaded();

    expect(response.status).toBe(201);

    const cover: OriginalUpload = await response.json();
    const character: OriginalUpload = await (
      await uploaded('CHARACTER')
    ).json();
    const assetId = cover.imageUrl.split('/').at(-1)!;
    const binary = await image(request(cover.imageUrl), context(assetId));

    expect(binary.status).toBe(200);
    expect(binary.headers.get('Content-Type')).toBe('image/png');
    expect(new Uint8Array(await binary.arrayBuffer())).toEqual(png);

    const payload = originalPayload();

    payload.thumbnailObjectKey = cover.objectKey;
    payload.characters[0].images = [
      { objectKey: character.objectKey, imageName: '도윤_기본' },
    ];

    const created = await create('PUBLISHED', payload);

    expect(created.thumbnailUrl).toBe(cover.imageUrl);
    expect(created.payload.characters[0].images[0]).toMatchObject({
      imageName: '도윤_기본',
      imageUrl: character.imageUrl,
    });
    expect(created.payload.characters[0].images[0].id).toBeTruthy();

    const kept = await PATCH(
      request(
        `/${created.id}`,
        { status: 'PUBLISHED', payload: created.payload },
        'PATCH',
      ),
      context(created.id),
    );
    const keptData: OriginalDetail = await kept.json();

    expect(kept.status).toBe(200);
    expect(keptData.payload.characters[0].images[0].id).toBe(
      created.payload.characters[0].images[0].id,
    );
    delete created.payload.thumbnailObjectKey;
    created.payload.removeThumbnail = true;
    created.payload.characters[0].images = [];

    const removed = await PATCH(
      request(
        `/${created.id}`,
        { status: 'PUBLISHED', payload: created.payload },
        'PATCH',
      ),
      context(created.id),
    );

    expect(await removed.json()).toMatchObject({
      thumbnailUrl: null,
      payload: { characters: [{ images: [] }] },
    });
  });
  it.each(['type', 'empty', 'large', 'kind', 'signature'])(
    '잘못된 업로드는 400이다: %s',
    async (problem) => {
      const form = new FormData();

      form.set('kind', problem === 'kind' ? 'OTHER' : 'COVER');
      form.set(
        'file',
        new File(
          [
            problem === 'empty'
              ? new Uint8Array()
              : problem === 'large'
                ? new Uint8Array(5242881)
                : problem === 'signature'
                  ? new Uint8Array([1, 2, 3])
                  : png,
          ],
          'image.png',
          { type: problem === 'type' ? 'image/svg+xml' : 'image/png' },
        ),
      );
      expect(
        (
          await upload(
            new Request('http://localhost/api/originals/images', {
              method: 'POST',
              body: form,
            }),
          )
        ).status,
      ).toBe(400);
    },
  );
  it('없는 이미지와 잘못된 파일 요청을 구분한다', async () => {
    expect((await image(request('/images/bad'), context('bad'))).status).toBe(
      404,
    );
    expect(
      (
        await upload(
          new Request('http://localhost/api/originals/images', {
            method: 'POST',
            body: '{}',
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      ).status,
    ).toBe(400);
  });
});
