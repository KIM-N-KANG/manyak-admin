import { describe, expect, it } from 'vitest';

import { GET as chatList } from '@/app/api/chats/route';
import { GET as creditList } from '@/app/api/credits/transactions/route';
import { GET as chartResponse } from '@/app/api/dashboard/charts/route';
import { GET as summaryResponse } from '@/app/api/dashboard/summary/route';
import { GET as memberDetail } from '@/app/api/members/[id]/route';
import { GET as memberList } from '@/app/api/members/route';
import { GET as paymentList } from '@/app/api/payments/route';
import { GET as storyList } from '@/app/api/stories/route';
import type { ChatRoom } from '@/features/chats/types';
import type { CreditTransactionItem } from '@/features/credits/types';
import { getDistributionHref } from '@/features/dashboard/links';
import {
  getDailyMetricHref,
  paymentHistoryHref,
} from '@/features/dashboard/links';
import type {
  DashboardCharts,
  DashboardSummary,
} from '@/features/dashboard/types';
import type {
  CreditTransaction,
  MemberDetail,
  MemberListItem,
} from '@/features/members/types';
import type { PaymentOrder } from '@/features/payments/types';
import type { Page } from '@/features/shared/types';
import type { Story } from '@/features/stories/types';

const request = (href: string) => new Request(`http://localhost/api${href}`);

async function all<T>(
  href: string,
  get: (r: Request) => Response,
): Promise<T[]> {
  const url = new URL(href, 'http://localhost');

  url.searchParams.set('size', '100');

  const items: T[] = [];
  let number = 1;
  let totalPages = 1;

  do {
    url.searchParams.set('page', String(number));

    const response = get(request(url.pathname + url.search));

    expect(response.status).toBe(200);

    const page: Page<T> = await response.json();

    items.push(...page.items);
    totalPages = page.totalPages;
    number++;
  } while (number <= totalPages);

  return items;
}

const charts = async (days: number): Promise<DashboardCharts> =>
  chartResponse(request(`/dashboard/charts?days=${days}`)).json();
const detail = async (id: string): Promise<MemberDetail> =>
  (
    await memberDetail(request(`/members/${id}`), {
      params: Promise.resolve({ id }),
    })
  ).json();
const date = (iso: string) =>
  new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
const total = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0);
const mean = (values: number[]) =>
  values.length ? total(values) / values.length : 0;

// 지급·소진 사유는 ADMIN 2-4의 원장 집계 계약을 따른다.
function matches(
  transaction: Pick<CreditTransaction, 'amount' | 'reason' | 'createdAt'>,
  day: string,
  direction: 'granted' | 'spent',
) {
  const reasons =
    direction === 'granted'
      ? [
          'SIGNUP_REWARD',
          'INVITE_REWARD',
          'ATTENDANCE_REWARD',
          'PURCHASE',
          'ADMIN_GRANT',
        ]
      : ['STORY_CREATION', 'CHAT_TURN', 'CHAT_IMAGE'];

  return (
    date(transaction.createdAt) === day &&
    (direction === 'granted'
      ? transaction.amount > 0
      : transaction.amount < 0) &&
    reasons.includes(transaction.reason)
  );
}

describe('차트 → 목록 → 상세 모집단 회귀 검증', () => {
  it.each([7, 30, 90])(
    '%i일 분포의 기간과 목록 개수·평균·비율이 일치한다',
    async (days) => {
      const data = await charts(days);
      const rooms = await all<ChatRoom>(
        `/chats?from=${data.from}&to=${data.to}`,
        chatList,
      );
      const within = (value: string) =>
        date(value) >= data.from && date(value) <= data.to;

      for (const chart of data.distributions) {
        if (
          ![
            'genre-depth',
            'turns',
            'started-as',
            'first-message',
            'characters',
          ].includes(chart.chartId)
        )
          continue;

        for (const point of chart.points) {
          const url = new URL(
            getDistributionHref(point.link),
            'http://localhost',
          );
          const prefix =
            chart.chartId === 'genre-depth'
              ? 'chat'
              : chart.chartId === 'characters'
                ? 'creation'
                : '';

          expect(url.searchParams.get(prefix ? prefix + 'From' : 'from')).toBe(
            data.from,
          );
          expect(url.searchParams.get(prefix ? prefix + 'To' : 'to')).toBe(
            data.to,
          );

          if (chart.chartId === 'genre-depth') {
            const stories = await all<Story>(
              getDistributionHref(point.link) + '&sort=totalTurns',
              storyList,
            );

            expect(stories.map((s) => s.totalTurns)).toEqual(
              stories.map((s) => s.totalTurns).toSorted((a, b) => b - a),
            );

            expect(stories.every((s) => s.genre === point.label)).toBe(true);

            const count = total(stories.map((s) => s.chatCount));

            expect(point.value).toBeCloseTo(
              count ? total(stories.map((s) => s.totalTurns)) / count : 0,
            );
          } else if (chart.chartId === 'characters') {
            const stories = await all<Story>(
              getDistributionHref(point.link),
              storyList,
            );

            expect(point.value).toBe(stories.length);
          } else {
            const selected = await all<ChatRoom>(
              getDistributionHref(point.link),
              chatList,
            );

            expect(selected.every((c) => within(c.startedAt))).toBe(true);

            if (chart.chartId === 'turns')
              expect(point.value).toBe(selected.length);

            if (chart.chartId === 'started-as')
              expect(point.value).toBeCloseTo(
                rooms.length ? (selected.length / rooms.length) * 100 : 0,
              );

            if (chart.chartId === 'first-message') {
              expect(
                selected.every(
                  (c) =>
                    c.firstMessageSeconds !== null &&
                    c.firstMessageSeconds <= 900,
                ),
              ).toBe(true);

              if (point.label === '평균')
                expect(point.value).toBeCloseTo(
                  mean(selected.map((c) => c.firstMessageSeconds!)),
                );
            }
          }
        }
      }
    },
    20000,
  );

  it('7일과 90일은 다른 채팅 모집단을 사용한다', async () => {
    const short = await charts(7),
      long = await charts(90);
    const count = (data: DashboardCharts) =>
      total(
        data.distributions
          .find((d) => d.chartId === 'turns')!
          .points.map((p) => p.value),
      );

    expect(count(short)).toBeLessThan(count(long));
  });

  it.each([7, 90])(
    '%i일 회원 생성 횟수는 가입일과 무관하게 기간 채팅으로 분류한다',
    async (days) => {
      const data = await charts(days);
      const rooms = await all<ChatRoom>(
        `/chats?from=${data.from}&to=${data.to}`,
        chatList,
      );
      const counts = new Map<string, number>();

      for (const room of rooms)
        if (room.member)
          counts.set(
            room.member.memberId,
            (counts.get(room.member.memberId) ?? 0) + 1,
          );

      const expected = [...counts.entries()];
      const found: string[] = [];
      const chart = data.distributions.find(
        (d) => d.chartId === 'member-chats',
      )!;

      for (const [index, point] of chart.points.entries()) {
        const selected = await all<MemberListItem>(
          getDistributionHref(point.link),
          memberList,
        );

        expect(point.value).toBe(selected.length);

        for (const member of selected) {
          const count = counts.get(member.memberId)!;

          expect(member.periodChatCount).toBe(count);
          expect(
            count === 1
              ? 0
              : count === 2
                ? 1
                : count <= 4
                  ? 2
                  : count <= 9
                    ? 3
                    : 4,
          ).toBe(index);
        }

        found.push(...selected.map((m) => m.memberId));
      }

      expect(found.toSorted()).toEqual(expected.map(([id]) => id).toSorted());
      expect(new Set(found).size).toBe(found.length);

      if (days === 7) {
        const old = await all<MemberListItem>(
          getDistributionHref(chart.points[0].link),
          memberList,
        );

        expect(old.some((m) => date(m.createdAt) < data.from)).toBe(true);
      }
    },
    20000,
  );

  it('AI 호출 분포 링크도 호출일·완료 상태·지연값 기준을 유지한다', async () => {
    const data = await charts(7);

    for (const chart of data.distributions.filter((d) =>
      d.chartId.startsWith('ai-'),
    )) {
      for (const point of chart.points) {
        const url = new URL(
          getDistributionHref(point.link),
          'http://localhost',
        );

        expect(url.searchParams.get('aiFrom')).toBe(data.from);
        expect(url.searchParams.get('aiTo')).toBe(data.to);
        expect(url.searchParams.get('aiStatus')).toBe(
          chart.chartId === 'ai-latency' ? 'SUCCEEDED' : 'FINISHED',
        );

        const get = url.pathname === '/stories' ? storyList : chatList;
        const selected = await all(getDistributionHref(point.link), get);

        expect(selected.length).toBeGreaterThan(0);
        url.searchParams.set('aiFrom', '2027-01-01');
        url.searchParams.set('aiTo', '2027-01-02');
        expect(await all(url.pathname + url.search, get)).toHaveLength(0);
      }
    }
  });

  it('결제 카드와 일별 결제 수·금액은 환불을 포함한 완료 이력 주문과 일치한다', async () => {
    const summary: DashboardSummary = await summaryResponse().json();
    const orders = await all<PaymentOrder>(paymentHistoryHref, paymentList);

    expect(orders.some((order) => order.status === 'REFUNDED')).toBe(true);
    expect(summary.payments.completedTotal).toBe(orders.length);
    expect(summary.payments.amountKrwTotal).toBe(
      total(orders.map((order) => order.priceKrw)),
    );

    const data = await charts(30);

    for (const day of data.daily) {
      const selected = await all<PaymentOrder>(
        getDailyMetricHref('payments', day.date),
        paymentList,
      );

      expect(day.payments).toBe(selected.length);
      expect(day.revenue).toBe(total(selected.map((p) => p.priceKrw)));
    }
  });

  it.each(['granted', 'spent'] as const)(
    '%s 일별 링크는 거래 원장의 날짜·금액 방향·사유와 일치한다',
    async (direction) => {
      const data = await charts(7);
      const day = data.daily.find((d) => d.date === '2026-10-21')!;
      const href = getDailyMetricHref(direction, day.date);
      const url = new URL(href, 'http://localhost');

      expect(url.pathname).toBe('/credits/transactions');
      expect(url.searchParams.get('direction')).toBe(direction);
      expect(url.searchParams.get('date')).toBe(day.date);

      const selected = await all<CreditTransactionItem>(href, creditList);

      expect(selected.length).toBeGreaterThan(0);
      expect(selected.every((row) => matches(row, day.date, direction))).toBe(
        true,
      );
      expect(total(selected.map((row) => Math.abs(row.amount)))).toBe(
        day[direction],
      );
      expect(
        selected.some(
          (row) => row.reason === 'REFUND' || row.reason === 'EXPIRE',
        ),
      ).toBe(false);
    },
  );

  it('KST 자정 전후 거래를 구분하고 환불·만료를 지급·소진에 포함하지 않는다', async () => {
    const id = '00000001-0000-4000-8000-000000000002';
    const day21 = await all<MemberListItem>(
      `/members?q=${id}&creditDate=2026-10-21&creditDirection=granted`,
      memberList,
    );
    const day20 = await all<MemberListItem>(
      `/members?q=${id}&creditDate=2026-10-20&creditDirection=spent`,
      memberList,
    );

    expect(day21.map((m) => m.memberId)).toEqual([id]);
    expect(day20.map((m) => m.memberId)).toEqual([id]);
    expect(
      await all(
        `/members?q=${id}&creditDate=2026-10-21&creditDirection=spent`,
        memberList,
      ),
    ).toHaveLength(0);
  });

  it('회원 목록·상세의 전체 chatCount는 실제 채팅 수를 공유하고 0개 회원은 횟수 구간에서 제외한다', async () => {
    for (const id of [
      '00000001-0000-4000-8000-000000000004',
      '00000001-0000-4000-8000-000000000005',
    ]) {
      const [row] = await all<MemberListItem>(`/members?q=${id}`, memberList);
      const member = await detail(id);
      const rooms = await all<ChatRoom>(`/chats?memberId=${id}`, chatList);

      expect(row.chatCount).toBe(rooms.length);
      expect(member.chatCount).toBe(rooms.length);
      expect(member).not.toHaveProperty('chats');

      if (!rooms.length)
        for (let bucket = 0; bucket < 5; bucket++)
          expect(
            await all(`/members?q=${id}&chatBucket=${bucket}`, memberList),
          ).toHaveLength(0);
    }
  });

  it.each([
    '/members?creditDirection=invalid',
    '/members?creditDate=2026-10-21',
    '/members?chatFrom=2026-10-21&chatTo=2026-10-20',
    '/stories?creationFrom=2026-02-30',
    '/chats?aiStatus=INVALID',
  ])('잘못된 새 조건은 400으로 거절한다: %s', (href) => {
    const get = href.startsWith('/members')
      ? memberList
      : href.startsWith('/stories')
        ? storyList
        : chatList;

    expect(get(request(href)).status).toBe(400);
  });
});
