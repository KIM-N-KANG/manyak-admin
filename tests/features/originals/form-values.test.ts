import { expect, it } from 'vitest';

import {
  originalFormValues,
  originalRequestFields,
} from '@/features/originals/form-values';
import { saveOriginal } from '@/fixtures/originals';

import { originalPayload } from '../../helpers/originals';

it('서버의 nullable 편집 값과 식별자 없는 업로드 이미지의 객체 키를 보존한다', () => {
  const detail = saveOriginal({
    ...originalRequestFields(originalPayload()),
    reason: '테스트',
    status: 'DRAFT',
  });

  detail.oneLineIntro = null;
  detail.characters[0].id = null;
  detail.characters[0].images = [
    {
      id: null,
      imageName: '도윤_웃음',
      imageUrl: 'https://images.example/test.png',
      objectKey: 'characters/uploaded/test.png',
      moderationStatus: 'APPROVED',
    },
  ];

  const form = originalFormValues(detail);

  expect(form.oneLineIntro).toBe('');
  expect(form.characters[0].id).toBeUndefined();
  expect(originalRequestFields(form).characters[0].images).toEqual([
    { objectKey: 'characters/uploaded/test.png', imageName: '도윤_웃음' },
  ]);
});
