import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import { validateAdminRequest } from '@/api/admin-validation';
import { stories } from '@/fixtures/entities';
import {
  homeSectionRows,
  resetHomeSectionsFixture,
} from '@/fixtures/home-sections';
import { homeSectionsRoute } from '@/fixtures/home-sections-route';
import { originalGenres } from '@/fixtures/original-genres';

const base = 'https://admin.example/api/home-sections';
const request = (method = 'GET', body?: unknown, id = '') =>
  homeSectionsRoute(
    new Request(base + id, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    }),
  );
const filter = {
  name: '조건',
  source: 'FILTER',
  genres: originalGenres.slice(0, 2),
  originalOnly: true,
  sort: 'chats',
  itemLimit: 12,
  reason: '홈 개편',
};

beforeEach(() => {
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  vi.stubEnv('VERCEL_ENV', 'preview');
  resetHomeSectionsFixture();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('비활성까지 순서대로 응답하며 노출 안 되는 직접 고름 스토리를 보존한다', async () => {
  const { items } = await (await request()).json();

  expect(items).toHaveLength(3);
  expect(items.map((row: { sortOrder: number }) => row.sortOrder)).toEqual([
    1, 2, 3,
  ]);
  expect(
    items.filter((row: { isActive: boolean }) => row.isActive),
  ).toHaveLength(2);
  expect(
    items[1].stories.filter((story: { isListed: boolean }) => !story.isListed),
  ).toHaveLength(1);
});
it('조건 등록과 수정, 직접 고름 전환, 활성 변경, 삭제를 실제 fixture 상태에 반영한다', async () => {
  const created = await request('POST', filter);

  expect(created.status).toBe(201);

  const row = await created.json();

  const { reason: _reason, ...expected } = filter;

  expect(row).toMatchObject({ ...expected, stories: [], sortOrder: 4 });
  expect(row).not.toHaveProperty('reason');

  const updated = await request(
    'PATCH',
    {
      source: 'MANUAL',
      storyIds: [stories[2].storyId, stories[1].storyId],
      reason: '직접 고름',
    },
    `/${row.id}`,
  );

  expect(
    (await updated.json()).stories.map(
      (story: { storyId: string }) => story.storyId,
    ),
  ).toEqual([stories[2].storyId, stories[1].storyId]);
  expect(
    (
      await (
        await request(
          'PATCH',
          { isActive: false, reason: '비활성' },
          `/${row.id}`,
        )
      ).json()
    ).isActive,
  ).toBe(false);
  expect(
    (await request('DELETE', { reason: '삭제' }, `/${row.id}`)).status,
  ).toBe(204);
  expect(
    (await request('DELETE', { reason: '삭제' }, `/${row.id}`)).status,
  ).toBe(404);
});
it.each([
  { ...filter, name: '' },
  { ...filter, name: 'x'.repeat(31) },
  { ...filter, itemLimit: 21 },
  { ...filter, itemLimit: 0 },
  { ...filter, reason: '' },
  { ...filter, reason: ' ' },
  { ...filter, reason: 'x'.repeat(501) },
  { ...filter, genres: Array(11).fill('로맨스') },
  { ...filter, storyIds: [stories[0].storyId] },
  { name: '직접', source: 'MANUAL', reason: '사유' },
  {
    name: '직접',
    source: 'MANUAL',
    reason: '사유',
    storyIds: Array(21).fill(stories[1].storyId),
  },
  {
    name: '직접',
    source: 'MANUAL',
    reason: '사유',
    storyIds: [stories[1].storyId, stories[1].storyId],
  },
  {
    name: '직접',
    source: 'MANUAL',
    reason: '사유',
    storyIds: [stories[1].storyId],
    sort: 'popular',
  },
])('잘못된 등록 요청을 400으로 거부한다: %j', async (body) => {
  expect((await request('POST', body)).status).toBe(400);
});
it('무효 장르는 원소 위치를 반환하며 저장하지 않는다', async () => {
  const response = await request('POST', {
    ...filter,
    genres: [originalGenres[0], '없는 장르'],
  });

  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    code: 'INVALID_GENRE',
    details: [{ field: 'genres[1]' }],
  });
  expect(homeSectionRows()).toHaveLength(3);
});
it('생성된 Zod로 본문과 UUID, 미지원 쿼리와 중복 쿼리를 검증한다', async () => {
  for (const [path, method, body] of [
    ['/home-sections', 'POST', filter],
    [
      '/home-sections/00000009-0000-4000-8000-000000000001',
      'PATCH',
      { reason: '순서', sortOrder: 2 },
    ],
    [
      '/home-sections/00000009-0000-4000-8000-000000000001',
      'DELETE',
      { reason: '삭제' },
    ],
  ] as const) {
    const endpoint = findAdminEndpoint(path, method)!;

    expect(endpoint.serverPath).toBe('/api/v1/admin' + path);
    await expect(
      validateAdminRequest(
        new NextRequest('https://admin.example/api' + path, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
        endpoint.operation!,
        endpoint.serverPath!,
        endpoint.operation!.path,
      ),
    ).resolves.toBe(JSON.stringify(body));
  }

  expect((await homeSectionsRoute(new Request(base + '?q=test'))).status).toBe(
    400,
  );
  expect((await request('PATCH', { reason: '사유' }, '/invalid')).status).toBe(
    400,
  );
  expect(
    (await request('DELETE', {}, '/' + homeSectionRows()[0].id)).status,
  ).toBe(400);
});
it('교차 출처와 production fixture 실행을 차단한다', async () => {
  expect(
    (
      await homeSectionsRoute(
        new Request(base, {
          method: 'POST',
          headers: {
            Origin: 'https://other.example',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(filter),
        }),
      )
    ).status,
  ).toBe(403);
  vi.stubEnv('VERCEL_ENV', 'production');
  expect((await request()).status).toBe(503);
});
