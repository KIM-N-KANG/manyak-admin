import { describe, expect, it } from 'vitest';

import {
  emptyOriginal,
  originalDraftSchema,
  originalPublishSchema,
  originalSaveSchema,
} from '@/features/originals/form-schema';
import type { OriginalPayload } from '@/features/originals/types';

import { originalPayload } from '../../helpers/originals';

const valid = (payload: OriginalPayload) =>
  originalPublishSchema.safeParse(payload).success;

describe('오리지널 폼 검증', () => {
  it('초안 제목은 필수이고 제목만 채워도 초안 저장은 가능하다', () => {
    expect(originalDraftSchema.safeParse(emptyOriginal()).success).toBe(false);
    expect(
      originalDraftSchema.safeParse({ ...emptyOriginal(), title: '초안' })
        .success,
    ).toBe(true);
    expect(originalPublishSchema.safeParse(emptyOriginal()).success).toBe(
      false,
    );
    expect(valid(originalPayload())).toBe(true);
  });
  it.each(['title', 'oneLineIntro'] as const)(
    '%s의 서버 길이 상한을 적용한다',
    (key) => {
      const payload = originalPayload();
      const max = key === 'title' ? 100 : 255;

      payload[key] = '가'.repeat(max);
      expect(valid(payload)).toBe(true);
      payload[key] += '가';
      expect(valid(payload)).toBe(false);
      expect(originalDraftSchema.safeParse(payload).success).toBe(false);
    },
  );
  it('주인공 이름은 30자·토큰 조건을 검사하고 비어 있으면 전송하지 않는다', () => {
    const payload = originalPayload();

    payload.protagonistName = '가'.repeat(30);
    expect(valid(payload)).toBe(true);
    payload.protagonistName += '가';
    expect(valid(payload)).toBe(false);
    payload.protagonistName = '';
    expect(valid(payload)).toBe(false);
    payload.title = '도서관';

    const parsed = originalPublishSchema.parse(payload);

    expect(parsed.protagonistName).toBeUndefined();
  });
  it('장르는 1~8개·각 30자, 시작 설정과 추천 입력은 필수다', () => {
    const payload = originalPayload();

    payload.genres = [];
    expect(valid(payload)).toBe(false);
    payload.genres = Array.from({ length: 9 }, () => '판타지');
    expect(valid(payload)).toBe(false);
    payload.genres = ['가'.repeat(31)];
    expect(valid(payload)).toBe(false);
    payload.genres = ['판타지'];
    payload.startSettings[0].suggestedInputs = ['한 개'];
    expect(valid(payload)).toBe(false);
    payload.startSettings = [];
    expect(valid(payload)).toBe(false);
  });
  it('인물 6명·이미지 10장, 소개 150자와 한 줄 제한을 적용한다', () => {
    const payload = originalPayload();

    payload.characters[0].description = '가'.repeat(150);
    expect(valid(payload)).toBe(true);

    for (const invalid of ['가'.repeat(151), '가\n나', '가\r나', '가\t나']) {
      payload.characters[0].description = invalid;
      expect(valid(payload)).toBe(false);
    }

    payload.characters = Array.from({ length: 7 }, (_, index) => ({
      name: `인물${index}`,
      description: '',
      images: [],
    }));
    expect(valid(payload)).toBe(false);
    payload.characters = [
      {
        name: '도윤',
        description: '',
        images: Array.from({ length: 11 }, (_, index) => ({
          objectKey: 'asset',
          imageName: `도윤_이미지${index}`,
        })),
      },
    ];
    expect(valid(payload)).toBe(false);
  });
  it('이미지 소스는 하나이고 이름은 접두·접미 형식과 고유성을 검사한다', () => {
    const payload = originalPayload();

    payload.characters[0].images = [
      { objectKey: 'asset', imageName: '도윤_기본' },
    ];
    expect(valid(payload)).toBe(true);
    payload.characters[0].images[0].id = crypto.randomUUID();
    expect(valid(payload)).toBe(false);
    delete payload.characters[0].images[0].id;
    payload.characters[0].images[0].imageName = '다른이름_기본';
    expect(valid(payload)).toBe(false);
    payload.characters[0].images[0].imageName = '도윤_기본';
    payload.characters[0].images.push({ ...payload.characters[0].images[0] });
    expect(valid(payload)).toBe(false);
  });
  it('사건·엔딩은 최대 10개이고 이름과 조건을 검증한다', () => {
    const payload = originalPayload();

    payload.mainEvents = [
      {
        name: '발견',
        description: '기록을 발견한다.',
        keySentence: '기록 발견',
      },
    ];
    payload.startSettings[0].endings = [
      {
        name: '귀환',
        requirement: { minTurns: 0, achievementCondition: '기억 회복' },
        epilogue: '도서관을 떠난다.',
      },
    ];
    expect(valid(payload)).toBe(true);
    payload.startSettings[0].endings[0].requirement.minTurns = -1;
    expect(valid(payload)).toBe(false);
    payload.startSettings[0].endings = Array.from(
      { length: 11 },
      (_, index) => ({
        name: `엔딩${index}`,
        requirement: { minTurns: 0, achievementCondition: '완료' },
        epilogue: '끝',
      }),
    );
    expect(valid(payload)).toBe(false);
    payload.mainEvents = Array.from({ length: 11 }, (_, index) => ({
      name: `사건${index}`,
      description: '사건',
      keySentence: '문장',
    }));
    expect(valid(payload)).toBe(false);
  });
  it('이름 중복과 빈 필수 설정, 표지 제거·교체 동시 지정를 거절한다', () => {
    const payload = originalPayload();

    payload.characters.push({ ...payload.characters[0], name: '도윤' });
    expect(valid(payload)).toBe(false);
    payload.characters.pop();
    payload.storySettings.ruleSetting = ' ';
    expect(valid(payload)).toBe(false);
    payload.storySettings.ruleSetting = '규칙';
    payload.thumbnailObjectKey = 'asset';
    payload.removeThumbnail = true;
    expect(valid(payload)).toBe(false);
    delete payload.thumbnailObjectKey;
    payload.removeThumbnail = false;
  });
});

it.each(['DRAFT', 'PUBLISHED'] as const)(
  '%s 수정은 토큰이 없어도 저장된 주인공 이름을 지울 수 없다',
  (status) => {
    const payload = {
      ...originalPayload(),
      title: '토큰 없는 제목',
      protagonistName: '   ',
    };
    const result = originalSaveSchema(status, '서린').safeParse(payload);

    expect(result.success).toBe(false);

    if (!result.success)
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['protagonistName'],
          message: expect.stringContaining('지울 수 없습니다'),
        }),
      );

    expect(
      originalSaveSchema(status).parse(payload).protagonistName,
    ).toBeUndefined();
    expect(
      originalSaveSchema(status, null).parse(payload).protagonistName,
    ).toBeUndefined();
    expect(
      originalSaveSchema(status, '서린').parse({
        ...payload,
        protagonistName: '  하린  ',
      }).protagonistName,
    ).toBe('하린');
  },
);
