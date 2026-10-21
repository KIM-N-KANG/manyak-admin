// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import LegacyCampaigns from '@/app/(admin)/campaigns/page';
import Root from '@/app/(admin)/page';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

describe('기존 경로 호환', () => {
  it('루트는 개요로 이동한다', async () => {
    await expect(Root({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'redirect:/dashboard',
    );
  });
  it('기존 개요 링크의 기간·지표·복수 쿼리를 보존한다', async () => {
    await expect(
      Root({
        searchParams: Promise.resolve({
          days: '7',
          metric: 'spent',
          tag: ['a', 'b'],
          empty: undefined,
        }),
      }),
    ).rejects.toThrow('redirect:/dashboard?days=7&metric=spent&tag=a&tag=b');
  });
  it('기존 캠페인 링크는 새 알림 경로로 이동한다', () => {
    expect(LegacyCampaigns).toThrow('redirect:/notifications/campaigns');
  });
});
