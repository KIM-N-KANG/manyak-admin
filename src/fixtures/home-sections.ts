import type { HomeSection } from '@/features/home-sections/form';
import { stories } from '@/fixtures/entities';

const state = globalThis as typeof globalThis & {
  manyakHomeSections?: HomeSection[];
};

function defaults(): HomeSection[] {
  const date = '2026-11-02T02:00:00Z';

  return Array.from({ length: 3 }, (_, index) => ({
    id: `00000009-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    name: ['인기 스토리', '직접 고른 스토리', '오리지널 신작'][index],
    source: index === 1 ? 'MANUAL' : 'FILTER',
    stories:
      index === 1
        ? [stories[1], stories[2], stories[5]].map((story) => ({
            storyId: story.storyId,
            title: story.title,
            isListed: story.visibility === 'PUBLIC',
          }))
        : [],
    genres: [],
    originalOnly: index === 2,
    sort: index === 1 ? null : 'popular',
    itemLimit: 20,
    isActive: index !== 2,
    sortOrder: index + 1,
    createdAt: date,
    updatedAt: date,
  }));
}

export function homeSectionRows() {
  return (state.manyakHomeSections ??= defaults());
}
export function resetHomeSectionsFixture(items?: HomeSection[]) {
  state.manyakHomeSections = items ?? defaults();
}
