import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { GET as detail } from '@/app/api/stories/[id]/route';
import { GET as list } from '@/app/api/stories/route';
import { canTakeDown, takedownReasonLabel } from '@/features/stories/takedown';
import { deletedStories, stories } from '@/fixtures/entities';
import { moderationRoute } from '@/fixtures/moderation-route';

const original = structuredClone(stories[1]);
const base = 'https://admin.example';

function take(body: unknown, id = stories[1].storyId, origin = base) {
  return moderationRoute(
    new Request(`${base}/api/moderation/stories/${id}/takedown`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  vi.stubEnv('VERCEL_ENV', 'preview');
  Object.assign(stories[1], structuredClone(original));
});
afterEach(() => {
  Object.assign(stories[1], structuredClone(original));
  vi.unstubAllEnvs();
});

it.each([
  {},
  { reasonCode: 'OTHER' },
  { reasonCode: 'ETC' },
  { reasonCode: 'ETC', reasonDetail: null },
  { reasonCode: 'ETC', reasonDetail: '   ' },
  { reasonCode: 'ETC', reasonDetail: 'x'.repeat(101) },
  { reasonCode: 'SEXUAL_CONTENT', reasonDetail: '사유' },
  { reasonCode: 'SEXUAL_CONTENT', memo: '  ' },
  { reasonCode: 'SEXUAL_CONTENT', memo: 'x'.repeat(501) },
])('잘못된 공개 중단 본문 %j는 생성 스키마로 거절한다', async (body) => {
  expect((await take(body)).status).toBe(400);
  expect(stories[1].takenDownAt).toBeNull();
});
it.each(['SEXUAL_CONTENT', 'COPYRIGHT_INFRINGEMENT', 'HATE_SPEECH', 'ETC'])(
  '%s 공개 중단은 목록과 상세에 함께 반영하고 메모를 노출하지 않는다',
  async (reasonCode) => {
    const response = await take({
      reasonCode,
      ...(reasonCode === 'ETC'
        ? { reasonDetail: '실존 인물 비방' }
        : { reasonDetail: null }),
      memo: null,
    });

    expect(response.status).toBe(200);

    const result = await response.json();

    expect(result).toMatchObject({
      storyId: stories[1].storyId,
      visibility: 'PRIVATE',
      takedownReason: reasonCode,
      takedownReasonDetail: reasonCode === 'ETC' ? '실존 인물 비방' : null,
    });
    expect(result.takenDownAt).toBeTruthy();

    const d = await (
      await detail(new Request(`${base}/api/stories/${stories[1].storyId}`), {
        params: Promise.resolve({ id: stories[1].storyId }),
      })
    ).json();
    const rows = await list(new Request(`${base}/api/stories`)).json();

    expect(d).toMatchObject(result);
    expect(
      rows.items.find(
        (s: { storyId: string }) => s.storyId === stories[1].storyId,
      ),
    ).toMatchObject(result);
    expect(d).not.toHaveProperty('memo');
    expect((await take({ reasonCode })).status).toBe(
      reasonCode === 'ETC' ? 400 : 409,
    );
  },
);
it('이미 비공개인 회원 스토리도 조치할 수 있다', async () => {
  stories[1].visibility = 'PRIVATE';
  expect(
    (await take({ reasonCode: 'SEXUAL_CONTENT', memo: '내부 검토' })).status,
  ).toBe(200);
});
it('오리지널·게스트·삭제·중복은 409, 없음은 404, 잘못된 식별자는 400이다', async () => {
  for (const story of [stories[0], stories[8], deletedStories[0]])
    expect(
      (await take({ reasonCode: 'SEXUAL_CONTENT' }, story.storyId)).status,
    ).toBe(409);

  expect(
    (
      await take(
        { reasonCode: 'SEXUAL_CONTENT' },
        '00000000-0000-4000-8000-000000000000',
      )
    ).status,
  ).toBe(404);
  expect((await take({ reasonCode: 'SEXUAL_CONTENT' }, 'bad')).status).toBe(
    400,
  );
});
it('운영 fixture와 외부 출처 요청을 차단한다', async () => {
  expect(
    (
      await take(
        { reasonCode: 'SEXUAL_CONTENT' },
        stories[1].storyId,
        'https://evil.example',
      )
    ).status,
  ).toBe(403);
  vi.stubEnv('VERCEL_ENV', 'production');
  expect((await take({ reasonCode: 'SEXUAL_CONTENT' })).status).toBe(503);
});
it('버튼은 배포 필드가 없는 응답에도 숨기고 기타와 모르는 사유를 표시한다', () => {
  expect(canTakeDown(stories[1])).toBe(true);

  for (const s of [
    stories[0],
    stories[8],
    deletedStories[0],
    { ...stories[1], takenDownAt: 'now' },
    { ...stories[1], takenDownAt: undefined },
  ])
    expect(canTakeDown(s as typeof original)).toBe(false);

  expect(takedownReasonLabel('ETC', '실존 인물 비방')).toBe(
    '기타 (실존 인물 비방)',
  );
  expect(takedownReasonLabel('NEW_REASON', null)).toBe('NEW_REASON');
});
