import { describe, expect, it } from 'vitest';

import { GET } from '@/app/api/dashboard/analytics/route';
import type { DashboardAnalytics } from '@/features/dashboard/types';

const request = (query = '') =>
  new Request(`http://localhost/api/dashboard/analytics${query}`);

describe('Amplitude 지표 BFF', () => {
  it.each([7, 30, 90])(
    '%i일 응답이 계약 필드·KST 기간·오늘 값을 일치시킨다',
    async (days) => {
      const response = GET(request(`?days=${days}`));

      expect(response.status).toBe(200);

      const data: DashboardAnalytics = await response.json();

      expect(Object.keys(data)).toEqual([
        'asOf',
        'from',
        'to',
        'todayActiveUsers',
        'daily',
      ]);
      expect(data.daily).toHaveLength(days);
      expect(data.from).toBe(data.daily[0].date);
      expect(data.to).toBe(data.daily.at(-1)!.date);
      expect(data.to).toBe(
        new Date(data.asOf).toLocaleDateString('sv-SE', {
          timeZone: 'Asia/Seoul',
        }),
      );
      expect(data.todayActiveUsers).toBe(data.daily.at(-1)!.activeUsers);
      data.daily.forEach((day, index) => {
        expect(Object.keys(day)).toEqual(['date', 'activeUsers', 'newUsers']);
        expect(Number.isInteger(day.activeUsers)).toBe(true);
        expect(day.activeUsers).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(day.newUsers)).toBe(true);
        expect(day.newUsers).toBeGreaterThanOrEqual(0);
        expect(day.newUsers).toBeLessThanOrEqual(day.activeUsers);

        if (index)
          expect(
            new Date(day.date).getTime() -
              new Date(data.daily[index - 1].date).getTime(),
          ).toBe(86400000);
      });
    },
  );

  it('기본은 30일이며 짧은 기간은 같은 90일 원천의 끝부분이다', async () => {
    const data: DashboardAnalytics = await GET(request()).json();
    const long: DashboardAnalytics = await GET(request('?days=90')).json();

    expect(data.daily).toEqual(long.daily.slice(-30));
    expect(data.todayActiveUsers).toBe(long.todayActiveUsers);
  });

  it.each(['0', '-7', '8', '365', 'invalid', ''])(
    '허용하지 않은 기간은 400이다: %s',
    (days) => {
      expect(GET(request(`?days=${days}`)).status).toBe(400);
    },
  );
});
