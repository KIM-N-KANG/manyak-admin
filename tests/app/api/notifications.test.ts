import { describe, expect, it } from 'vitest';

import { POST as cancel } from '@/app/api/notifications/campaigns/[id]/cancel/route';
import { POST as retry } from '@/app/api/notifications/campaigns/[id]/retry/route';
import { GET, POST } from '@/app/api/notifications/campaigns/route';
import { GET as targets } from '@/app/api/notifications/campaigns/target-count/route';
import { GET as stats } from '@/app/api/notifications/delivery-stats/route';
import {
  DELETE,
  GET as template,
  PUT,
} from '@/app/api/notifications/templates/[key]/route';
import { stories } from '@/fixtures/entities';
import {
  createNoticeCampaign,
  getTemplate,
  listCampaigns,
} from '@/fixtures/notifications';
import { saveOriginal } from '@/fixtures/originals';

const req = (body: unknown) =>
  new Request('http://localhost/api/notifications', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('알림 BFF', () => {
  it('광고 캠페인 작성과 상태별 취소·재실행을 제한한다', async () => {
    const created = await POST(
      req({ title: '행사', body: '본문', reason: '사유' }),
    );

    expect(created.status).toBe(201);

    const item = await created.json();

    expect(item.kind).toBe('MARKETING');

    const ctx = { params: Promise.resolve({ id: item.campaignId }) };

    expect((await cancel(req({ reason: '취소' }), ctx)).status).toBe(200);
    expect((await cancel(req({ reason: '중복' }), ctx)).status).toBe(409);
    expect((await retry(req({ reason: '재실행' }), ctx)).status).toBe(409);
    expect(
      (
        await retry(req({ reason: '재실행' }), {
          params: Promise.resolve({
            id: 'c1000000-0000-4000-8000-000000000005',
          }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await POST(
          req({
            title: '행사',
            body: '본문',
            reason: '사유',
            scheduledAt: '2000-01-01T00:00:00Z',
          }),
        )
      ).status,
    ).toBe(400);
  });
  it('공개·발행 스토리를 연결하고 비공개·초안·없는 ID는 거절한다', async () => {
    const publicStory = stories.find((s) => s.visibility === 'PUBLIC')!;
    const result = await POST(
      req({
        title: '홍보',
        body: '본문',
        reason: '홍보',
        storyId: publicStory.storyId,
      }),
    );

    expect(result.status).toBe(201);
    expect(await result.json()).toMatchObject({
      storyId: publicStory.storyId,
      kind: 'MARKETING',
    });

    const draft = saveOriginal({ title: '미발행', reason: '작성' });

    for (const storyId of [
      stories.find((s) => s.visibility === 'PRIVATE')!.storyId,
      draft.storyId,
      'bad',
      '99999999-0000-4000-8000-000000000001',
    ])
      expect(
        (
          await POST(
            req({ title: '홍보', body: '본문', reason: '홍보', storyId }),
          )
        ).status,
      ).toBe(400);
  });
  it('목록은 필터·정렬·숫자 페이지와 null 집계를 보존한다', async () => {
    const response = GET(
      new Request(
        'http://localhost/api/notifications/campaigns?status=SCHEDULED&sort=scheduledAt&order=asc&size=2',
      ),
    );
    const page = await response.json();

    expect(page.items).toHaveLength(2);
    expect(page.totalPages).toBeGreaterThan(1);
    expect(page.items[0].scheduledAt <= page.items[1].scheduledAt).toBe(true);
    expect(
      GET(
        new Request('http://localhost/api/notifications/campaigns?status=BAD'),
      ).status,
    ).toBe(400);
  });
  it('대상 수에 종류별 야간 동의를 구분한다', async () => {
    const service = await targets(
      new Request(
        'http://localhost/api/notifications/campaigns/target-count?kind=SERVICE',
      ),
    ).json();

    expect(service.nightEligibleCount).toBeNull();
    expect(
      targets(
        new Request(
          'http://localhost/api/notifications/campaigns/target-count?kind=BAD',
        ),
      ).status,
    ).toBe(400);
  });
  it('통계 기간은 포함 366일이며 형식과 역전 기간을 거절한다', async () => {
    expect(
      stats(
        new Request(
          'http://localhost/api/notifications/delivery-stats?from=2024-01-01&to=2024-12-31',
        ),
      ).status,
    ).toBe(200);

    for (const q of [
      'from=2024-01-01&to=2025-01-01',
      'from=2026-10-22&to=2026-10-21',
      'from=2026-02-30',
      'type=INVALID',
    ])
      expect(
        stats(
          new Request(`http://localhost/api/notifications/delivery-stats?${q}`),
        ).status,
      ).toBe(400);

    const result = await stats(
      new Request(
        'http://localhost/api/notifications/delivery-stats?from=2026-10-20&to=2026-10-21&type=NOTICE',
      ),
    ).json();

    expect(result.items).toHaveLength(2);
    expect(
      result.items.every((i: { type: string }) => i.type === 'NOTICE'),
    ).toBe(true);
  });
  it('이프 소멸 템플릿의 조회 변경 복귀는 출석 문구와 이력을 섞지 않는다', async () => {
    const expiry = {
      params: Promise.resolve({ key: 'credit_expiry_reminder' }),
    };
    const original = getTemplate('attendance_reminder');
    const initial = await (await template(req({}), expiry)).json();

    expect(initial.effective).toEqual({
      title: '이프 소멸 예정 안내',
      body: '곧 소멸되는 이프가 있어요',
      isDefault: true,
    });
    expect(
      (
        await PUT(
          req({
            title: '소멸 안내',
            body: '이프 화면에서 확인하세요',
            reason: '안내 변경',
          }),
          expiry,
        )
      ).status,
    ).toBe(200);

    const updated = await (await template(req({}), expiry)).json();

    expect(updated.effective.title).toBe('소멸 안내');
    expect(updated.overrides).toHaveLength(1);
    expect(getTemplate('attendance_reminder')).toEqual(original);
    expect((await DELETE(req({ reason: '복귀' }), expiry)).status).toBe(200);
    expect(
      (await (await template(req({}), expiry)).json()).effective.isDefault,
    ).toBe(true);
    expect(getTemplate('attendance_reminder')).toEqual(original);
  });
  it('예약 문구는 현재 문구와 구분되며 기본 복귀는 미래 예약도 종료한다', async () => {
    const ctx = { params: Promise.resolve({ key: 'attendance_reminder' }) };
    const future = new Date(Date.now() + 86400000).toISOString();
    const result = await PUT(
      req({
        title: '새 문구',
        body: '새 본문',
        reason: '사유',
        effectiveFrom: future,
      }),
      ctx,
    );

    expect(result.status).toBe(200);

    const data = await result.json();

    expect(data.effective.isDefault).toBe(true);
    expect(data.overrides[0].active).toBe(false);
    expect(
      (
        await PUT(
          req({
            title: '새 문구',
            body: '본문',
            reason: '사유',
            effectiveFrom: '2000-01-01T00:00:00Z',
          }),
          ctx,
        )
      ).status,
    ).toBe(400);
    await DELETE(req({ reason: '복귀' }), ctx);

    const reset = await (await template(req({}), ctx)).json();

    expect(reset.effective.isDefault).toBe(true);
    expect(reset.overrides[0].effectiveUntil).toBe(future);
    expect(getTemplate('attendance_reminder').overrides).toHaveLength(1);
  });
  it('공지 알림 요청은 공지별 캠페인 하나를 만든다', () => {
    const id = crypto.randomUUID();

    createNoticeCampaign(id, '공지', '본문', 'SERVICE');
    createNoticeCampaign(id, '공지', '본문', 'SERVICE');
    expect(listCampaigns().filter((i) => i.noticeId === id)).toHaveLength(1);
  });
});
