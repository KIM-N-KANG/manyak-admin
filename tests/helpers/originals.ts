import type { OriginalPayload } from '@/features/originals/types';

export function originalPayload(): OriginalPayload {
  return {
    title: '{username}의 도서관',
    oneLineIntro: '기억을 찾아 도서관에 들어선다.',
    description: '기억을 지키는 사서와의 이야기.',
    protagonistName: '서린',
    genres: ['판타지'],
    storySettings: {
      worldSetting: '기억의 도서관',
      characterSetting: '사서 도윤',
      userRoleSetting: '기억을 찾는 방문자',
      ruleSetting: '선택에 따라 전개한다.',
    },
    startSettings: [
      {
        name: '도서관의 문',
        prologue: '문이 열린다.',
        startSituation: '도서관 입구',
        suggestedInputs: ['들어간다.', '주변을 본다.', '사서를 부른다.'],
        endings: [],
      },
    ],
    mainEvents: [],
    characters: [
      { name: '도윤', description: '기록을 지키는 사서.', images: [] },
    ],
    removeThumbnail: false,
  };
}
export const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ),
);
