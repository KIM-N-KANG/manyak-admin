import { describe, expect, it, vi } from 'vitest';

import { GET as chats } from '@/app/api/chats/route';
import { GET as charts } from '@/app/api/dashboard/charts/route';
import type { ChatRoom } from '@/features/chats/types';
import { getDistributionHref } from '@/features/dashboard/links';
import type { DashboardCharts } from '@/features/dashboard/types';
import type { Page } from '@/features/shared/types';
import type * as fixtureEntities from '@/fixtures/entities';

vi.mock('@/fixtures/entities', async (importOriginal) => {
  const actual = await importOriginal<typeof fixtureEntities>();

  return {
    ...actual,
    chats: [...Array.from({ length: 52 }, (_, i) => i), 1000].map(
      (turnCount, i) => ({ ...actual.chats[i], turnCount }),
    ),
  };
});

const request = (path: string) => new Request(`http://localhost/api${path}`);
const buckets: [string, number[]][] = [
  ['0', [0]],
  ['1', [1]],
  ['2', [2]],
  ['3', [3]],
  ['4', [4]],
  ['5', [5]],
  ['6', [6]],
  ['7~9', [7, 8, 9]],
  ['10~14', [10, 11, 12, 13, 14]],
  ['15~19', [15, 16, 17, 18, 19]],
  ['20~29', Array.from({ length: 10 }, (_, i) => 20 + i)],
  ['30~49', Array.from({ length: 20 }, (_, i) => 30 + i)],
  ['50+', [50, 51, 1000]],
];

describe('턴 수 분포 13구간', () => {
  it('차트의 라벨·링크·집계와 채팅 목록의 구간 경계가 일치한다', async () => {
    const data: DashboardCharts = await charts(
      request('/dashboard/charts?days=90'),
    ).json();
    const points = data.distributions.find(
      (d) => d.chartId === 'turns',
    )!.points;

    expect(points.map((point) => point.label)).toEqual(
      buckets.map(([label]) => label),
    );

    for (const [index, point] of points.entries()) {
      const expected = buckets[index][1];

      expect(point.link).toEqual({
        list: 'chats',
        params: {
          turnBucket: String(index),
          from: data.from,
          to: data.to,
        },
      });
      expect(point.value).toBe(expected.length);

      const response = chats(
        request(
          `${getDistributionHref(point.link)}&size=100&sort=turnCount&order=asc`,
        ),
      );

      expect(response.status).toBe(200);

      const page: Page<ChatRoom> = await response.json();

      expect(page.totalElements).toBe(expected.length);
      expect(page.items.map((chat) => chat.turnCount)).toEqual(expected);
    }

    expect(points.reduce((sum, point) => sum + point.value, 0)).toBe(53);
  });

  it('채팅이 없는 기간도 13구간과 0건 집계를 유지한다', async () => {
    const data: DashboardCharts = await charts(
      request('/dashboard/charts?from=2026-01-01&to=2026-01-01'),
    ).json();
    const points = data.distributions.find(
      (d) => d.chartId === 'turns',
    )!.points;

    expect(points.map((point) => [point.label, point.value])).toEqual(
      buckets.map(([label]) => [label, 0]),
    );
  });

  it.each(['-1', '13', '99', '1.5'])(
    '허용 범위 밖의 turnBucket=%s는 400을 반환한다',
    (bucket) => {
      expect(chats(request(`/chats?turnBucket=${bucket}`)).status).toBe(400);
    },
  );
});
