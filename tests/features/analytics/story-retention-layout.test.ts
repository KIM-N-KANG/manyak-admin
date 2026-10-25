// @vitest-environment jsdom
import { createElement } from 'react';

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { TURN_THRESHOLDS } from '@/features/analytics/turn-thresholds';
import { DetailScreen } from '@/features/shared/detail-screen';
import { getStoryDetail, stories } from '@/fixtures/entities';

vi.mock('@/features/shared/use-api', () => ({
  useApi: () => ({
    data: getStoryDetail(stories[0].storyId),
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/features/shared/list-screen', () => ({ RelatedList: () => null }));
vi.mock('@/features/stories/story-settings', () => ({
  StorySettingsSection: () => null,
}));
afterEach(cleanup);

it('스토리 상세 기준 턴 12개를 작은 화면 2열·중간 4열·넓은 화면 6열로 배치한다', () => {
  render(
    createElement(DetailScreen, { domain: 'stories', id: stories[0].storyId }),
  );

  const heading = screen.getByRole('heading', { name: '턴 유지율' });
  const section = heading.closest('section')!;
  const first = within(section).getByText('1턴 도달');
  const grid = first.parentElement!.parentElement!;

  expect(grid.children).toHaveLength(12);
  expect(grid.className).toContain('grid-cols-2');
  expect(grid.className).toContain('sm:grid-cols-4');
  expect(grid.className).toContain('xl:grid-cols-6');

  for (const turn of TURN_THRESHOLDS)
    expect(within(section).getByText(`${turn}턴 도달`)).toBeTruthy();
});
