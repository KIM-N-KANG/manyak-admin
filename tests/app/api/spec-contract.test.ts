import { describe, expect, it } from 'vitest';

import { GET as chats } from '@/app/api/chats/route';
import { GET as charts } from '@/app/api/dashboard/charts/route';
import { GET as attendance } from '@/app/api/members/[id]/attendance/route';
import { GET as member } from '@/app/api/members/[id]/route';
import { GET as transactions } from '@/app/api/members/[id]/transactions/route';
import { GET as members } from '@/app/api/members/route';
import { GET as payment } from '@/app/api/payments/[id]/route';
import { GET as stories } from '@/app/api/stories/route';
import type { PaymentDetail } from '@/features/payments/types';
import { members as memberRows, payments } from '@/fixtures/entities';

const req = (path: string) => new Request(`http://localhost/api/${path}`);

describe('ADMIN 응답 계약 회귀', () => {
  it('차트는 구조화된 링크·AI 기능 5종·일별 출석을 반환한다', async () => {
    const data = await charts(req('dashboard/charts?days=7')).json();

    expect(data.distributions).toHaveLength(8);
    expect(
      data.distributions.some(
        (d: { chartId: string }) => d.chartId === 'attendance',
      ),
    ).toBe(false);
    expect(
      data.daily.every((day: { attendance: number }) =>
        Number.isInteger(day.attendance),
      ),
    ).toBe(true);

    for (const chart of data.distributions)
      for (const point of chart.points) {
        expect(point).not.toHaveProperty('href');
        expect(['stories', 'chats', 'members']).toContain(point.link.list);
        expect(
          Object.values(point.link.params).every((v) => typeof v === 'string'),
        ).toBe(true);
      }

    expect(
      data.distributions
        .find((d: { chartId: string }) => d.chartId === 'ai-latency')
        .points.map((p: { label: string }) => p.label),
    ).toEqual([
      'chat_response',
      'choice_generation',
      'chat_image',
      'storyline_generation',
      'story_completion',
    ]);
  });
  it('스토리는 게스트 소유와 제작 세션 없는 null을 보존한다', async () => {
    const page = await stories(req('stories?size=100')).json();

    expect(page.items.some((s: { owner: unknown }) => s.owner === null)).toBe(
      true,
    );
    expect(
      page.items.some(
        (s: { supportingCharacterCount: number | null }) =>
          s.supportingCharacterCount === null,
      ),
    ).toBe(true);

    const owned = page.items.find((s: { owner: unknown }) => s.owner !== null);

    expect(Object.keys(owned.owner).sort()).toEqual([
      'createdAt',
      'isAdmin',
      'memberId',
      'nickname',
      'status',
    ]);

    for (const feature of ['storyline_generation', 'story_completion'])
      expect(stories(req(`stories?aiFeature=${feature}`)).status).toBe(200);

    expect(stories(req('stories?aiFeature=story_creation')).status).toBe(400);
  });
  it('채팅은 현재 소유자로 유형을 정하고 기능 필드는 노출하지 않는다', async () => {
    const page = await chats(req('chats?size=100')).json();

    for (const item of page.items) {
      expect(item).not.toHaveProperty('aiFeature');
      expect(item.startedAs).toBe(item.member ? 'MEMBER' : 'GUEST');
    }

    expect(chats(req('chats?aiFeature=choice_generation')).status).toBe(200);
    expect(chats(req('chats?aiFeature=chat_image')).status).toBe(200);
    expect(chats(req('chats?aiFeature=story_completion')).status).toBe(400);
  });
  it('회원 상세는 관계 배열과 이메일 없이 집계만 반환하고 기간 미지정 값은 null이다', async () => {
    const id = memberRows[0].memberId;
    const item = await (
      await member(req(`members/${id}`), { params: Promise.resolve({ id }) })
    ).json();

    for (const key of [
      'email',
      'transactions',
      'attendance',
      'payments',
      'chats',
      'stories',
    ])
      expect(item).not.toHaveProperty(key);

    expect(item.periodChatCount).toBeNull();

    const page = await members(req('members?size=100')).json();

    expect(
      page.items.every(
        (m: { periodChatCount: number | null; email?: string }) =>
          m.periodChatCount === null && !('email' in m),
      ),
    ).toBe(true);
  });
  it('완료 시각 없는 대기 주문은 상세에서 404다', async () => {
    const id = '00000004-0000-4000-8000-999999999999';
    const pending = {
      ...payments[0],
      orderId: id,
      completedAt: null,
    } as unknown as PaymentDetail;

    payments.push(pending);

    try {
      expect(
        (
          await payment(req(`payments/${id}`), {
            params: Promise.resolve({ id }),
          })
        ).status,
      ).toBe(404);
    } finally {
      payments.pop();
    }
  });
  it('거래·출석은 별도 엔드포인트에서 허용된 정렬만 지원한다', async () => {
    const id = memberRows[0].memberId;
    const context = { params: Promise.resolve({ id }) };
    const page = await (
      await transactions(
        req(`members/${id}/transactions?sort=createdAt&order=asc`),
        context,
      )
    ).json();

    expect(page.items[0].createdAt <= page.items.at(-1).createdAt).toBe(true);
    expect(
      (
        await transactions(
          req(`members/${id}/transactions?sort=amount`),
          context,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await attendance(
          req(`members/${id}/attendance?sort=date&order=asc`),
          context,
        )
      ).status,
    ).toBe(200);
    expect(
      (await attendance(req(`members/${id}/attendance?order=invalid`), context))
        .status,
    ).toBe(400);
  });
});
