import { describe, expect, it } from 'vitest';

import { POST as publish } from '@/app/api/notices/[id]/publish/route';
import { DELETE } from '@/app/api/notices/[id]/route';
import { POST as unpublish } from '@/app/api/notices/[id]/unpublish/route';
import { GET, POST } from '@/app/api/notices/route';

const req = (body: unknown) =>
  new Request('http://localhost/api/notices', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('공지 BFF', () => {
  it('작성→게시→해제 후 알림 이력 때문에 삭제를 거절한다', async () => {
    const created = await POST(
      req({ title: '점검', body: '본문', reason: '테스트' }),
    );

    expect(created.status).toBe(201);

    const item = await created.json();
    const c = { params: Promise.resolve({ id: item.noticeId }) };
    const result = await publish(
      req({ notify: true, notificationKind: 'SERVICE', reason: '게시' }),
      c,
    );

    expect(await result.json()).toMatchObject({
      status: 'PUBLISHED',
      notified: true,
    });
    expect(
      (await publish(req({ notify: false, reason: '중복' }), c)).status,
    ).toBe(409);
    await unpublish(req({ reason: '해제' }), c);
    expect((await DELETE(req({ reason: '삭제' }), c)).status).toBe(409);
    expect(
      (
        await publish(
          req({ notify: true, notificationKind: 'SERVICE', reason: '재게시' }),
          c,
        )
      ).status,
    ).toBe(200);
  });
  it('미발송 초안만 삭제하고 필수값을 검사한다', async () => {
    expect(
      (await POST(req({ title: ' ', body: '본문', reason: '사유' }))).status,
    ).toBe(400);

    const item = await (
      await POST(req({ title: '초안', body: '본문', reason: '사유' }))
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
