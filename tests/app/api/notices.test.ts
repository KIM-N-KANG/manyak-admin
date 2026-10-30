import { describe, expect, it } from 'vitest';

import { POST as publish } from '@/app/api/notices/[id]/publish/route';
import { DELETE, PATCH } from '@/app/api/notices/[id]/route';
import { POST as unpublish } from '@/app/api/notices/[id]/unpublish/route';
import { GET, POST } from '@/app/api/notices/route';
import { createCampaign } from '@/fixtures/notifications';

const req = (body: unknown) =>
  new Request('http://localhost/api/notices', {
    method: 'POST',
    body: JSON.stringify(body),
  });

const createRequest = (body: Record<string, unknown>) =>
  req({
    notificationTitle: '알림 제목',
    notificationBody: '알림 본문',
    ...body,
  });

describe('공지 BFF', () => {
  it('작성→게시→해제 후 알림 이력 때문에 삭제를 거절한다', async () => {
    const created = await POST(
      createRequest({
        title: '점검',
        body: '본문',
        tag: 'MAINTENANCE',
        reason: '테스트',
      }),
    );

    expect(created.status).toBe(201);

    const item = await created.json();
    const c = { params: Promise.resolve({ id: item.noticeId }) };
    const result = await publish(req({ reason: '게시' }), c);

    expect(await result.json()).toMatchObject({
      status: 'PUBLISHED',
      notifiedAt: null,
    });
    createCampaign({
      title: '알림',
      body: '본문',
      reason: '발송',
      noticeId: item.noticeId,
    });
    expect((await publish(req({ reason: '중복' }), c)).status).toBe(409);
    await unpublish(req({ reason: '해제' }), c);
    expect((await DELETE(req({ reason: '삭제' }), c)).status).toBe(409);
    expect((await publish(req({ reason: '재게시' }), c)).status).toBe(200);
  });
  it('미발송 초안만 삭제하고 필수값을 검사한다', async () => {
    expect(
      (await POST(createRequest({ title: ' ', body: '본문', reason: '사유' })))
        .status,
    ).toBe(400);

    const item = await (
      await POST(
        createRequest({
          title: '초안',
          body: '본문',
          tag: 'SERVICE',
          reason: '사유',
        }),
      )
    ).json();

    expect(
      (
        await DELETE(req({ reason: '삭제' }), {
          params: Promise.resolve({ id: item.noticeId }),
        })
      ).status,
    ).toBe(204);

    const page = await GET(
      new Request(
        'http://localhost/api/notices?size=2&page=2&sort=title&order=asc',
      ),
    ).json();

    expect(page.items).toHaveLength(2);
    expect(page.items[0]).not.toHaveProperty('body');
  });
});

it('태그 누락과 모르는 태그를 거절하고 태그만 수정하거나 생략해 유지할 수 있다', async () => {
  for (const tag of [undefined, 'NEWS']) {
    expect(
      (
        await POST(
          createRequest({ title: '공지', body: '본문', reason: '작성', tag }),
        )
      ).status,
    ).toBe(400);
  }

  const created = await POST(
    createRequest({
      title: '태그 수정',
      body: '본문',
      reason: '작성',
      tag: 'UPDATE',
    }),
  );
  const item = await created.json();
  const context = { params: Promise.resolve({ id: item.noticeId }) };
  const patched = await PATCH(
    req({ tag: 'EVENT', reason: '태그 변경' }),
    context,
  );

  expect(await patched.json()).toMatchObject({
    tag: 'EVENT',
    title: '태그 수정',
  });

  const kept = await PATCH(
    req({ title: '제목 변경', reason: '수정' }),
    context,
  );

  expect(await kept.json()).toMatchObject({ tag: 'EVENT', title: '제목 변경' });
  expect((await PATCH(req({ reason: '빈 수정' }), context)).status).toBe(400);
});

it('예전 알림 선택 값은 무시하고 게시해도 알림을 요청하지 않는다', async () => {
  const item = await (
    await POST(
      createRequest({
        title: '홍보',
        body: '본문',
        tag: 'PROMOTION',
        reason: '작성',
      }),
    )
  ).json();
  const context = { params: Promise.resolve({ id: item.noticeId }) };
  const first = await publish(
    req({ reason: '게시', notify: false, notificationKind: 'SERVICE' }),
    context,
  );

  expect(await first.json()).toMatchObject({
    notifiedAt: null,
    tag: 'PROMOTION',
  });
  await unpublish(req({ reason: '해제' }), context);

  const again = await publish(req({ reason: '재게시' }), context);

  expect(await again.json()).toMatchObject({
    notifiedAt: null,
    tag: 'PROMOTION',
  });
});
