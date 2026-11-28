// @vitest-environment jsdom
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { originalRequestFields } from '@/features/originals/form-values';
import { ImageUpload } from '@/features/originals/image-upload';
import { OriginalDetailScreen } from '@/features/originals/original-detail-screen';
import { getOriginal, saveOriginal } from '@/fixtures/originals';

import { originalPayload } from '../../helpers/originals';

const state = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock('@/features/shared/use-api', () => ({
  useApi: () => ({
    data: state.data,
    error: null,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
afterEach(cleanup);

it('오리지널 상세의 인물 이미지는 자르지 않고 4:3 칸에 보인다', () => {
  const saved = saveOriginal({
    status: 'DRAFT',
    ...originalRequestFields(originalPayload()),
    visibility: 'PRIVATE',
    reason: '작성',
  });
  const detail = getOriginal(saved.storyId)!;

  state.data = {
    ...detail,
    characters: [
      {
        ...detail.characters[0],
        images: [
          {
            id: 'image-1',
            imageName: '도윤_기본',
            imageUrl: '/character.png',
            moderationStatus: 'APPROVED',
          },
        ],
      },
    ],
  };
  render(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(OriginalDetailScreen, { id: saved.storyId }),
    ),
  );

  const image = screen.getByAltText('도윤_기본');

  expect(image.className).toContain('h-36');
  expect(image.className).toContain('w-48');
  expect(image.className).toContain('object-contain');
  expect(image.className).not.toContain('object-cover');
});

it.each([
  ['COVER', 'w-27'],
  ['CHARACTER', 'w-48'],
] as const)('%s 업로드 미리보기는 %s 칸이다', (kind, width) => {
  render(
    createElement(ImageUpload, {
      label: '이미지',
      kind,
      imageUrl: '/image.png',
      onPendingChange: () => undefined,
      onUpload: () => undefined,
      onRemove: () => undefined,
    }),
  );

  const image = screen.getByAltText('이미지 미리보기');

  expect(image.className).toContain('h-36');
  expect(image.className).toContain(width);
  expect(image.className).toContain('object-contain');
});
