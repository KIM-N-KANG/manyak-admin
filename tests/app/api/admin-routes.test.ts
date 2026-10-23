import { describe, expect, it } from 'vitest';

import { GET as chats } from '@/app/api/chats/route';
import { GET as charts } from '@/app/api/dashboard/charts/route';
import { GET as summary } from '@/app/api/dashboard/summary/route';
import { GET as member } from '@/app/api/members/[id]/route';
import { GET as members } from '@/app/api/members/route';
import { GET as payments } from '@/app/api/payments/route';
import { GET as story } from '@/app/api/stories/[id]/route';
import { GET as stories } from '@/app/api/stories/route';
import type { ChatRoom } from '@/features/chats/types';
import { getDistributionHref } from '@/features/dashboard/links';
import type { DashboardCharts } from '@/features/dashboard/types';
import type { MemberListItem } from '@/features/members/types';
import type { PaymentOrder } from '@/features/payments/types';
import type { Page } from '@/features/shared/types';
import type { Story, StoryDetail } from '@/features/stories/types';

const request = (path: string) => new Request(`http://localhost/api/${path}`);

describe('관리자 고정 데이터 BFF', () => {
  it('요약 계약의 누적과 오늘 필드를 보존한다', async () => {
    const data = await summary().json();

    expect(Object.keys(data)).toEqual([
      'asOf',
      'todayStartsAt',
      'members',
      'chats',
      'stories',
      'credits',
      'payments',
    ]);
    expect(data.members.total).toBeGreaterThan(1000);
    expect(data.chats.startedToday).toBeGreaterThan(100);
    expect(Object.keys(data.members)).toEqual(['total', 'joinedToday']);
    expect(Object.keys(data.payments)).toEqual([
      'completedTotal',
      'completedToday',
      'amountKrwTotal',
      'amountKrwToday',
    ]);
    expect(data.credits).toHaveProperty('spentTotal');
  });

  it.each([7, 30, 90])(
    '%i일의 일별 지표와 8종 분포를 제공한다',
    async (days) => {
      const data: DashboardCharts = await charts(
        request(`dashboard/charts?days=${days}`),
      ).json();

      expect(data.daily).toHaveLength(days);
      expect(data.distributions).toHaveLength(8);
      expect(Object.keys(data.daily[0])).toHaveLength(10);

      for (const distribution of data.distributions) {
        expect(distribution.points.length).toBeGreaterThan(0);
        expect(
          distribution.points.every((p) =>
            getDistributionHref(p.link).startsWith('/'),
          ),
        ).toBe(true);
      }

      expect(charts(request('dashboard/charts?days=365')).status).toBe(400);
    },
  );

  it('장르·범위·공개 상태를 AND로 적용하고 정렬한다', async () => {
    const data: Page<Story> = await stories(
      request(
        'stories?genre=로맨스&scope=original&visibility=PRIVATE&sort=totalTurns',
      ),
    ).json();

    expect(data.items.length).toBeGreaterThan(0);
    expect(
      data.items.every(
        (s) =>
          s.genre === '로맨스' &&
          s.scope === 'original' &&
          s.visibility === 'PRIVATE',
      ),
    ).toBe(true);
    expect(data.items.map((s) => s.totalTurns)).toEqual(
      data.items.map((s) => s.totalTurns).toSorted((a, b) => b - a),
    );
  });

  it('숫자 페이지를 중복 없이 끝까지 탐색한다', async () => {
    const ids: string[] = [];
    let number = 1;
    let totalPages = 1;

    do {
      const page: Page<Story> = await stories(
        request(`stories?size=5&page=${number}`),
      ).json();

      ids.push(...page.items.map((s) => s.storyId));
      totalPages = page.totalPages;
      number++;
    } while (number <= totalPages);

    expect(ids).toHaveLength(36);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('닉네임 부분 일치, ID 일치와 이메일 정확 일치를 구분한다', async () => {
    const search = async (query: string): Promise<Page<MemberListItem>> =>
      members(request(`members?q=${encodeURIComponent(query)}`)).json();
    const exact = await search('member1@example.com');

    expect(exact.items).toHaveLength(1);
    expect(await search('member1@')).toMatchObject({ items: [] });
    expect((await search(exact.items[0].memberId)).items[0].memberId).toBe(
      exact.items[0].memberId,
    );
    expect((await search('등대')).items.length).toBeGreaterThan(1);
    expect(exact.items[0]).not.toHaveProperty('email');
  });

  it('기간은 KST 날짜로 적용하고 결제·채팅 관계 필터를 유지한다', async () => {
    const orders: Page<PaymentOrder> = await payments(
      request('payments?status=REFUNDED&from=2026-10-21&to=2026-10-21'),
    ).json();

    expect(orders.items).toHaveLength(1);
    expect(orders.items[0].status).toBe('REFUNDED');

    const rooms: Page<ChatRoom> = await chats(
      request('chats?turnBucket=12&startedAs=GUEST&sort=turnCount'),
    ).json();

    expect(rooms.items.length).toBeGreaterThan(0);
    expect(
      rooms.items.every((c) => c.turnCount >= 50 && c.startedAs === 'GUEST'),
    ).toBe(true);
  });

  it.each([
    'stories?page=invalid',
    'stories?size=no',
    'stories?visibility=UNKNOWN',
    'payments?from=2026-02-30',
    'payments?from=2026-10-21&to=2026-10-20',
    'members?status=UNKNOWN',
    'chats?turnBucket=13',
  ])('잘못된 필터는 400을 반환한다: %s', (path) => {
    const get = path.startsWith('stories')
      ? stories
      : path.startsWith('payments')
        ? payments
        : path.startsWith('members')
          ? members
          : chats;

    expect(get(request(path)).status).toBe(400);
  });

  it('상세는 잘못된 식별자와 없는 회원을 구별한다', async () => {
    expect(
      (
        await member(request('members/bad'), {
          params: Promise.resolve({ id: 'bad' }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await member(request('members/missing'), {
          params: Promise.resolve({
            id: '00000001-0000-4000-8000-999999999999',
          }),
        })
      ).status,
    ).toBe(404);
  });

  it('스토리 상세에서 채팅·회원·스토리를 서로 연결하고 대화 필드를 반환하지 않는다', async () => {
    const list: Page<Story> = await stories(request('stories')).json();
    const detail: StoryDetail = await (
      await story(request('stories/detail'), {
        params: Promise.resolve({ id: list.items[0].storyId }),
      })
    ).json();

    expect(detail.recentChats.length).toBeGreaterThan(0);
    expect(
      detail.recentChats.every((c) => c.story.storyId === detail.storyId),
    ).toBe(true);
    expect(detail.retention.every((r) => r.rate >= 0 && r.rate <= 1)).toBe(
      true,
    );

    const memberResponse = await member(request('members/detail'), {
      params: Promise.resolve({ id: detail.owner!.memberId }),
    });
    const payload = await memberResponse.json();

    expect(payload).toHaveProperty('creditBalance');
    expect(payload).not.toHaveProperty('attendance');

    const visit = (value: unknown) => {
      if (value && typeof value === 'object')
        for (const [key, child] of Object.entries(value)) {
          expect([
            'messages',
            'content',
            'prompt',
            'userMessage',
            'aiResponse',
            'suggestions',
          ]).not.toContain(key);
          visit(child);
        }
    };

    visit(payload);
    visit(detail);
  });
});
