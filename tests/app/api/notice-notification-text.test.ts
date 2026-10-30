import { expect, it } from 'vitest';

import { POST as publish } from '@/app/api/notices/[id]/publish/route';
import { PATCH } from '@/app/api/notices/[id]/route';
import { POST } from '@/app/api/notices/route';
import { POST as campaign } from '@/app/api/notifications/campaigns/route';
import { getNotice } from '@/fixtures/notices';
import { listCampaigns } from '@/fixtures/notifications';

const valid = {
  title: '공지 제목',
  body: '공지 본문',
  tag: 'SERVICE',
  reason: '작성',
};
const req = (body: unknown) =>
  new Request('http://localhost/api/notices', {
    method: 'POST',
    body: JSON.stringify(body),
  });
const context = (id: string) => ({ params: Promise.resolve({ id }) });

it('5-1-11 알림 문구 없이 작성하고 예전 문구는 값과 무관하게 무시한다', async () => {
  for (const extra of [
    {},
    { notificationTitle: 42, notificationBody: '가'.repeat(301) },
  ]) {
    const response = await POST(req({ ...valid, ...extra }));

    expect(response.status).toBe(201);

    const item = await response.json();

    expect(item).not.toHaveProperty('notificationTitle');
    expect(item).not.toHaveProperty('notificationBody');
    expect(
      (await publish(req({ reason: '게시' }), context(item.noticeId))).status,
    ).toBe(200);
    expect(getNotice(item.noticeId).notifiedAt).toBeNull();
    expect(
      listCampaigns().filter((i) => i.noticeId === item.noticeId),
    ).toHaveLength(0);
  }
});
it.each([true, false])(
  '5-1-11 notifiedAt 유무 %s와 무관하게 제목만 수정한다',
  async (notified) => {
    const item = await (await POST(req(valid))).json();

    await publish(req({ reason: '게시' }), context(item.noticeId));

    if (notified)
      await campaign(
        req({
          title: '알림',
          body: '알림 본문',
          reason: '발송',
          noticeId: item.noticeId,
        }),
      );

    const response = await PATCH(
      req({ title: '수정 제목', reason: '수정', notificationTitle: false }),
      context(item.noticeId),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ title: '수정 제목' });
    expect(
      (
        await PATCH(
          req({ reason: '수정', notificationTitle: '무시' }),
          context(item.noticeId),
        )
      ).status,
    ).toBe(400);
  },
);
it.each(['SERVICE', 'UPDATE', 'MAINTENANCE', 'EVENT', 'PROMOTION'])(
  '5-1-16 게시 공지 %s는 여러 캠페인을 만들고 최초 요청 시각을 유지한다',
  async (tag) => {
    const item = await (await POST(req({ ...valid, tag }))).json();
    const payload = {
      title: '알림',
      body: '별도 본문',
      reason: '발송',
      noticeId: item.noticeId,
      kind: '무시',
    };

    expect((await campaign(req(payload))).status).toBe(400);
    await publish(req({ reason: '게시' }), context(item.noticeId));

    const first = await campaign(req(payload));

    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({
      kind: ['EVENT', 'PROMOTION'].includes(tag) ? 'MARKETING' : 'SERVICE',
      noticeId: item.noticeId,
      storyId: null,
      failureReason: null,
    });

    const notifiedAt = getNotice(item.noticeId).notifiedAt;

    expect(notifiedAt).not.toBeNull();
    expect((await campaign(req(payload))).status).toBe(201);
    expect(getNotice(item.noticeId).notifiedAt).toBe(notifiedAt);
    expect(
      listCampaigns().filter((i) => i.noticeId === item.noticeId),
    ).toHaveLength(2);
    expect((await campaign(req({ ...payload, storyId: 'bad' }))).status).toBe(
      400,
    );
  },
);
