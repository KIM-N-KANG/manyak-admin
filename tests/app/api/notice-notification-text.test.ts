import { expect, it } from 'vitest';

import { POST as publish } from '@/app/api/notices/[id]/publish/route';
import { PATCH } from '@/app/api/notices/[id]/route';
import { POST as unpublish } from '@/app/api/notices/[id]/unpublish/route';
import { GET, POST } from '@/app/api/notices/route';
import { getNotice } from '@/fixtures/notices';
import { listCampaigns } from '@/fixtures/notifications';

const valid = {
  title: '공지 제목',
  body: '공지 본문',
  tag: 'SERVICE',
  reason: '작성',
  notificationTitle: '알림 제목',
  notificationBody: '알림 본문',
};
const req = (body: unknown) =>
  new Request('http://localhost/api/notices', {
    method: 'POST',
    body: JSON.stringify(body),
  });
const context = (id: string) => ({ params: Promise.resolve({ id }) });

it.each(['notificationTitle', 'notificationBody'])(
  '%s는 생성 필수이며 공백과 상한 초과를 거부한다',
  async (key) => {
    for (const value of [
      undefined,
      '',
      '  ',
      '가'.repeat(key === 'notificationTitle' ? 101 : 301),
    ]) {
      expect((await POST(req({ ...valid, [key]: value }))).status).toBe(400);
    }
  },
);

it('공지와 별도의 알림 문구를 저장·부분 수정하고 목록에서는 생략한다', async () => {
  const created = await POST(req(valid));

  expect(created.status).toBe(201);

  const item = await created.json();

  expect(item).toMatchObject({
    notificationTitle: '알림 제목',
    notificationBody: '알림 본문',
  });

  const result = await PATCH(
    req({ notificationTitle: '바꾼 알림', reason: '수정' }),
    context(item.noticeId),
  );

  expect(result.status).toBe(200);
  expect(await result.json()).toMatchObject({
    title: '공지 제목',
    notificationTitle: '바꾼 알림',
    notificationBody: '알림 본문',
  });

  const page = await (
    await GET(new Request('http://localhost/api/notices'))
  ).json();

  for (const row of page.items) {
    expect(row).not.toHaveProperty('notificationTitle');
    expect(row).not.toHaveProperty('notificationBody');
  }
});

it('알림 문구가 없는 초안은 게시 409이고 두 필드를 채운 후 별도 문구로 캠페인을 만든다', async () => {
  const id = 'b1000000-0000-4000-8000-000000000002';
  const original = getNotice(id);

  expect(original).toMatchObject({
    notificationTitle: null,
    notificationBody: null,
    notifiedAt: null,
  });
  expect((await publish(req({ reason: '게시' }), context(id))).status).toBe(
    409,
  );
  expect(
    (
      await PATCH(
        req({ notificationTitle: '하나만', reason: '수정' }),
        context(id),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await PATCH(
        req({
          notificationTitle: '새 알림',
          notificationBody: '새 알림 본문',
          reason: '수정',
        }),
        context(id),
      )
    ).status,
  ).toBe(200);
  expect((await publish(req({ reason: '게시' }), context(id))).status).toBe(
    200,
  );
  expect(
    listCampaigns().find((campaign) => campaign.noticeId === id),
  ).toMatchObject({ title: '새 알림', body: '새 알림 본문' });
});

it('알림 요청 후 문구 수정은 같은 값도 409이고 다른 공지 내용은 수정할 수 있다', async () => {
  const item = await (await POST(req(valid))).json();

  await publish(req({ reason: '게시' }), context(item.noticeId));

  for (const key of ['notificationTitle', 'notificationBody'] as const) {
    expect(
      (
        await PATCH(
          req({ [key]: valid[key], reason: '수정' }),
          context(item.noticeId),
        )
      ).status,
    ).toBe(409);
  }

  expect(
    (
      await PATCH(
        req({ title: '공지 정정', reason: '정정' }),
        context(item.noticeId),
      )
    ).status,
  ).toBe(200);
});

it('이미 알림을 요청한 기존 null 문구 공지는 재게시해도 추가 알림을 만들지 않는다', async () => {
  const id = 'b1000000-0000-4000-8000-000000000001';

  await unpublish(req({ reason: '해제' }), context(id));

  const result = await publish(req({ reason: '재게시' }), context(id));

  expect(result.status).toBe(200);
  expect(await result.json()).toMatchObject({
    notificationTitle: null,
    notificationBody: null,
    notified: false,
  });
});

it('PATCH는 null을 생략하고 형식 400을 잠금 409보다 먼저 검사한다', async () => {
  const id = 'b1000000-0000-4000-8000-000000000001';

  expect(
    (
      await PATCH(
        req({
          title: '제목 변경',
          notificationTitle: null,
          notificationBody: null,
          reason: '수정',
        }),
        context(id),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await PATCH(
        req({
          notificationTitle: '유효 문구 하나',
          notificationBody: null,
          reason: '수정',
        }),
        context(id),
      )
    ).status,
  ).toBe(409);

  for (const invalid of ['  ', '가'.repeat(101)]) {
    expect(
      (
        await PATCH(
          req({ notificationTitle: invalid, reason: '수정' }),
          context(id),
        )
      ).status,
    ).toBe(400);
  }

  expect(
    (
      await PATCH(
        req({
          notificationTitle: null,
          notificationBody: null,
          reason: '수정',
        }),
        context(id),
      )
    ).status,
  ).toBe(400);
});

it('이벤트 공지 원문과 별도 알림 제목에 광고 표기를 직접 붙이지 않는다', async () => {
  const item = await (await POST(req({ ...valid, tag: 'EVENT' }))).json();

  expect(
    (await publish(req({ reason: '게시' }), context(item.noticeId))).status,
  ).toBe(200);
  expect(getNotice(item.noticeId).title).toBe(valid.title);
  expect(
    listCampaigns().find((campaign) => campaign.noticeId === item.noticeId),
  ).toMatchObject({
    kind: 'MARKETING',
    title: valid.notificationTitle,
    body: valid.notificationBody,
  });
});
