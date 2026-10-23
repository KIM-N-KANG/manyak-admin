import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  causeLabel,
  kindLabel,
  pathLabel,
  ruleLabel,
  statusLabel,
} from '@/features/moderation/labels';
import { moderationRows, resetModerationFixture } from '@/fixtures/moderation';
import { moderationRoute } from '@/fixtures/moderation-route';

const base = 'https://admin.example/api/moderation';
const read = (query = '') =>
  moderationRoute(new Request(`${base}/submissions${query}`));
const detail = (id: string) =>
  moderationRoute(new Request(`${base}/submissions/${id}`));
const release = (id: string, reason: unknown) =>
  moderationRoute(
    new Request(`${base}/holds/${id}/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://admin.example',
      },
      body: JSON.stringify({ reason }),
    }),
  );

beforeEach(() => {
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  vi.stubEnv('VERCEL_ENV', 'preview');
  resetModerationFixture();
});
afterEach(() => vi.unstubAllEnvs());

it('기본 20행·정렬·페이지 구조와 상세 fixture는 공개 응답 계약을 따른다', async () => {
  const body = await (await read()).json();

  expect(body).toMatchObject({
    page: 1,
    size: 20,
    totalElements: 41,
    totalPages: 3,
  });
  expect(body.items[0].status).toBe('REJECTED');
  expect(body.items[0]).not.toHaveProperty('fields');
  expect(body.items[0].story.storyId).toBeNull();

  const result = await (await detail(body.items[0].submissionId)).json();

  expect(Object.keys(result.fields)).toHaveLength(7);
  expect(result.fields).not.toHaveProperty('storySettings');
  expect(result.imageResults[0]).not.toHaveProperty('imageUrl');
});
it('상태·소유자·스토리·접수일·검색어를 AND로 적용한다', async () => {
  const row = moderationRows()[1];
  const body = await (
    await read(
      `?status=HELD&memberId=${row.owner.memberId}&storyId=${row.story.storyId}&from=2026-10-21&to=2026-10-21&q=${encodeURIComponent(row.story.title)}`,
    )
  ).json();

  expect(body.items.map((r: typeof row) => r.submissionId)).toEqual([
    row.submissionId,
  ]);
  expect(
    (await (await read(`?q=${row.submissionId}`)).json()).items,
  ).toHaveLength(1);
  expect((await (await read('?q=없음')).json()).totalPages).toBe(0);
  expect((await (await read('?page=100')).json()).items).toEqual([]);
});
it.each(['createdAt', 'decidedAt', 'heldAt'])(
  '정렬 %s는 null을 방향과 무관하게 마지막에 둔다',
  async (key) => {
    for (const order of ['asc', 'desc']) {
      const body = await (
        await read(`?sort=${key}&order=${order}&size=100`)
      ).json();
      const values = body.items.map((row: Record<string, unknown>) => row[key]);
      const firstNull = values.indexOf(null);

      if (firstNull >= 0)
        expect(
          values.slice(firstNull).every((value: unknown) => value === null),
        ).toBe(true);
    }
  },
);
it.each([
  '?status=OTHER',
  '?sort=title',
  '?order=up',
  '?page=0',
  '?size=101',
  '?size=1.5',
  '?q=%20%20',
  '?q=' + 'x'.repeat(51),
  '?from=2026-02-30',
  '?from=2026-10-22&to=2026-10-21',
  '?memberId=bad',
  '?storyId=bad',
  '?status=HELD&status=FAILED',
  '?cursor=x',
])('잘못된 쿼리 %s는 400이다', async (query) =>
  expect((await read(query)).status).toBe(400),
);
it.each(['', ' ', 'x'.repeat(501), null])(
  '잘못된 사유는 해제하지 않는다',
  async (reason) => {
    const row = moderationRows()[1];

    expect((await release(row.submissionId, reason)).status).toBe(400);
    expect(row.status).toBe('HELD');
  },
);
it('해제는 대기·재시도 0으로 바꾸며 회차는 유지하고 재해제·없는 항목을 구분한다', async () => {
  const row = moderationRows()[1];
  const response = await release(row.submissionId, 'AI 서버 복구 확인');

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    submissionId: row.submissionId,
    status: 'PENDING',
    attempt: 3,
  });
  expect(await (await detail(row.submissionId)).json()).toMatchObject({
    status: 'PENDING',
    retryCount: 0,
    heldAt: null,
    holdReason: null,
  });
  expect((await release(row.submissionId, '다시')).status).toBe(409);
  expect(
    (await release('00000000-0000-4000-8000-000000000000', '사유')).status,
  ).toBe(404);
  expect((await detail('wrong-id')).status).toBe(404);
});
it('운영 fixture와 교차 출처 변경 요청을 차단한다', async () => {
  vi.stubEnv('VERCEL_ENV', 'production');
  expect((await read()).status).toBe(503);
  vi.stubEnv('VERCEL_ENV', 'preview');
  expect(
    (
      await moderationRoute(
        new Request(
          `${base}/holds/${moderationRows()[1].submissionId}/release`,
          {
            method: 'POST',
            headers: {
              Origin: 'https://evil.example',
              'Content-Type': 'application/json',
            },
            body: '{"reason":"사유"}',
          },
        ),
      )
    ).status,
  ).toBe(403);
});
it('위치·종류·상태·기준·원인 표시는 정본과 미등록 코드 보존을 따른다', () => {
  expect(kindLabel('CREATE')).toBe('등록');
  expect(kindLabel('UPDATE')).toBe('수정');
  expect(statusLabel('HELD')).toBe('보류');
  expect(ruleLabel('EXTREME_GORE')).toBe('극단적인 잔혹 표현');
  expect(ruleLabel('NEW_RULE')).toBe('NEW_RULE');
  expect(causeLabel('MODERATION_UNAVAILABLE')).toBe('검수 서버 응답 실패');
  expect(causeLabel('NEW_CODE')).toBe('NEW_CODE');
  expect(pathLabel('storySettings.worldSetting')).toBe('세계관 설정');
  expect(pathLabel('characters[1].images[0].imageUrl')).toBe('인물 2 이미지 1');
  expect(pathLabel('startSettings[0].description')).toBe(
    'startSettings[0].description',
  );
  expect(pathLabel('mainEvents[2]')).toBe('mainEvents[2]');
  expect(pathLabel('unknownField')).toBe('unknownField');
});

it.each([
  ['characters[0].name', '인물 1 이름'],
  ['characters[1].description', '인물 2 설명'],
  ['characters[1].images[0]', '인물 2 이미지 1'],
  ['characters[1].images[0].imageUrl', '인물 2 이미지 1'],
  ['startSettings[0].name', '시작 설정 1 이름'],
  ['startSettings[1].prologue', '시작 설정 2 프롤로그'],
  ['startSettings[2].startSituation', '시작 설정 3 시작 상황'],
  ['mainEvents[0].name', '주요 사건 1 이름'],
  ['mainEvents[1].description', '주요 사건 2 설명'],
  ['mainEvents[2].keySentence', '주요 사건 3 핵심 문장'],
  ['characters[0].unknown', 'characters[0].unknown'],
  ['unknownField', 'unknownField'],
])('위치 %s의 하위 필드 또는 미정 원문을 보존한다', (path, label) => {
  expect(pathLabel(path)).toBe(label);
});
