// @vitest-environment jsdom

import { createElement } from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LegacyCampaigns from '@/app/(admin)/campaigns/page';
import NewCampaign from '@/app/(admin)/notifications/campaigns/new/page';
import Campaigns from '@/app/(admin)/notifications/campaigns/page';
import Stats from '@/app/(admin)/notifications/stats/page';
import Templates from '@/app/(admin)/notifications/templates/page';
import Root from '@/app/(admin)/page';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
afterEach(cleanup);

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

describe('준비 중 화면', () => {
  it.each([
    [Campaigns, '캠페인'],
    [Stats, '발송 통계'],
    [Templates, '문구 템플릿'],
  ] as const)('%s는 제목과 한 줄 설명만 표시한다', (Page, title) => {
    const view = render(createElement(Page));

    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: title, level: 1 })).toBeTruthy();
    expect(view.container.querySelectorAll('p')).toHaveLength(1);
    expect(view.container.querySelector('p')!.textContent).toContain('준비 중');
    expect(view.container.querySelectorAll('[data-slot="card"]')).toHaveLength(
      0,
    );
  });
});

describe('스토리 홍보 캠페인 준비 화면', () => {
  it('유효한 storyId를 받아 이동 대상 안내를 보여 준다', async () => {
    const id = '00000002-0000-4000-8000-000000000001';

    render(
      await NewCampaign({ searchParams: Promise.resolve({ storyId: id }) }),
    );
    expect(
      screen.getByText(/이 스토리로 이동하는 캠페인/).textContent,
    ).toContain(id);
  });
  it('잘못된 식별자는 이동 대상 안내로 사용하지 않는다', async () => {
    render(
      await NewCampaign({
        searchParams: Promise.resolve({ storyId: ['bad', 'other'] }),
      }),
    );
    expect(screen.getByText(/홍보할 스토리를 선택/)).toBeTruthy();
  });
});
