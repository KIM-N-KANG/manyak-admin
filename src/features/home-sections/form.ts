import { z } from 'zod';

import type { List4Response } from '@/api/generated/zod/admin';

export type HomeSection = z.infer<typeof List4Response>['items'][number];
export type SectionStory = HomeSection['stories'][number];
export const sortLabels = {
  popular: '인기순',
  latest: '최신순',
  likes: '좋아요순',
  chats: '채팅순',
} as const;
export const sectionMessages = {
  fallback:
    '활성 섹션이 없어 홈에는 기본 섹션(인기 스토리, 오리지널 스토리)이 보입니다.',
  empty: '등록된 홈 섹션이 없습니다. 홈에는 기본 섹션이 보입니다.',
  unlisted:
    '비공개, 초안, 삭제 상태라 홈에 보이지 않습니다. 공개로 돌아오면 다시 보입니다.',
  delete: '이 섹션을 삭제할까요? 홈에서 바로 사라지고 되돌릴 수 없습니다.',
  saved: '홈 섹션을 저장했습니다.',
  deleted: '홈 섹션을 삭제했습니다.',
  partial:
    '순서를 바꾸는 중 일부만 저장됐습니다. 현재 순서를 다시 불러왔습니다.',
};

// 화면 입력만 검증한다. 서버 요청은 OpenAPI 생성 스키마가 검증한다.
export const sectionFormSchema = z
  .object({
    name: z.string().trim().min(1).max(30),
    source: z.enum(['FILTER', 'MANUAL']),
    stories: z
      .array(
        z.object({
          storyId: z.string(),
          title: z.string(),
          isListed: z.boolean(),
        }),
      )
      .max(20),
    genres: z.array(z.string().trim().min(1)).max(10),
    originalOnly: z.boolean(),
    sort: z.enum(['popular', 'latest', 'likes', 'chats']),
    itemLimit: z.number().int().min(1).max(20),
    isActive: z.boolean(),
  })
  .refine(
    (form) =>
      form.source !== 'MANUAL' ||
      (form.stories.length > 0 &&
        new Set(form.stories.map((story) => story.storyId)).size ===
          form.stories.length),
    { path: ['stories'], message: '스토리를 1~20개 선택해 주세요.' },
  );
export type SectionForm = z.infer<typeof sectionFormSchema>;

export function initialForm(section?: HomeSection): SectionForm {
  return section
    ? {
        name: section.name,
        source: section.source,
        stories: section.stories,
        genres: section.genres,
        originalOnly: section.originalOnly,
        sort: section.sort ?? 'popular',
        itemLimit: section.itemLimit,
        isActive: section.isActive,
      }
    : {
        name: '',
        source: 'FILTER',
        stories: [],
        genres: [],
        originalOnly: false,
        sort: 'popular',
        itemLimit: 20,
        isActive: true,
      };
}

/** 출처와 맞는 필드만 보내고 수정에서는 바뀐 값만 반환한다. */
export function sectionBody(
  form: SectionForm,
  reason: string,
  original?: HomeSection,
) {
  const value = {
    name: form.name.trim(),
    source: form.source,
    itemLimit: form.itemLimit,
    isActive: form.isActive,
    ...(form.source === 'MANUAL'
      ? { storyIds: form.stories.map((story) => story.storyId) }
      : {
          genres: form.genres,
          originalOnly: form.originalOnly,
          sort: form.sort,
        }),
  };

  if (!original) return { ...value, reason: reason.trim() };

  const before = sectionBody(initialForm(original), reason) as Record<
    string,
    unknown
  >;

  return Object.fromEntries([
    ...Object.entries(value).filter(
      ([key, item]) =>
        JSON.stringify(item) !== JSON.stringify(before[key]) ||
        (form.source !== original.source &&
          ['storyIds', 'genres', 'originalOnly', 'sort'].includes(key)),
    ),
    ['reason', reason.trim()],
  ]);
}

export function sectionContent(section: HomeSection) {
  return section.source === 'MANUAL'
    ? `스토리 ${section.stories.length}개, 노출 안 됨 ${section.stories.filter((story) => !story.isListed).length}개`
    : [
        section.genres.join(', ') || '전체 장르',
        ...(section.originalOnly ? ['오리지널'] : []),
        sortLabels[section.sort ?? 'popular'],
      ].join(', ');
}
