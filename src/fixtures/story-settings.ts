import type { StorySettings } from '@/features/stories/types';
import { stories } from '@/fixtures/entities';

function id(index: number, item: number) {
  return `00000009-0000-4000-8000-${String(index * 100 + item + 1).padStart(12, '0')}`;
}

/** 미리보기에서 비율을 확인할 수 있도록 색과 이름만 그린 SVG 이미지 주소를 만든다. */
function picture(color: string, width: number, height: number, label: string) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-size="${width / 10}" text-anchor="middle" dominant-baseline="middle" fill="#fff">${label}</text></svg>`,
  )}`;
}

function original(index: number): Partial<StorySettings> {
  return {
    oneLineIntro: '왕국의 마지막 기록관이 사라진 계약서를 쫓는다',
    description:
      '계약 마법이 지배하는 왕국에서 {username}은 잃어버린 기억과 사라진 가족의 비밀을 추적한다.\n\n도서관의 금서 구역에서 시작해 왕성의 지하 기록실까지 이어지는 이야기다.',
    protagonistName: '서린',
    thumbnailUrl: picture('#01A76B', 600, 800, '표지'),
    thumbnailModerationStatus: 'APPROVED',
    characters: [
      {
        id: id(index, 10),
        name: '도윤',
        description: '기록을 지키는 과묵한 사서.',
        images: [
          {
            id: id(index, 20),
            imageName: '도윤_기본',
            imageUrl: picture('#3B6EA8', 600, 800, '도윤_기본'),
            moderationStatus: 'APPROVED',
          },
        ],
      },
    ],
  };
}

/** 검토 중·반려 이미지와 불러오기 실패 이미지를 함께 보이는 사용자 제작 스토리다. */
function userFull(index: number): Partial<StorySettings> {
  return {
    thumbnailUrl: picture('#8A5CB8', 800, 450, '표지'),
    thumbnailModerationStatus: 'PENDING',
    characters: [
      {
        id: id(index, 10),
        name: '도윤',
        description:
          '기록을 지키는 과묵한 사서.\n{username}에게만 계약서의 출처를 조금씩 알려 준다.',
        images: [
          {
            id: id(index, 20),
            imageName: '도윤_기본',
            imageUrl: picture('#3B6EA8', 600, 800, '도윤_기본'),
            moderationStatus: 'APPROVED',
          },
          {
            id: id(index, 21),
            imageName: '도윤_놀람',
            imageUrl: picture('#C0703A', 800, 800, '도윤_놀람'),
            moderationStatus: 'PENDING',
          },
          {
            id: id(index, 22),
            imageName: '도윤_분노',
            imageUrl: picture('#B83A4B', 600, 900, '도윤_분노'),
            moderationStatus: 'REJECTED',
          },
        ],
      },
      {
        id: id(index, 11),
        name: '하린',
        description: null,
        images: [
          {
            id: id(index, 23),
            imageName: '하린_기본',
            imageUrl: '/fixtures/missing-image.webp',
            moderationStatus: 'APPROVED',
          },
        ],
      },
    ],
  };
}

/** 선택 입력을 비워 둔 사용자 제작 스토리다. */
function userEmpty(index: number): Partial<StorySettings> {
  return {
    oneLineIntro: null,
    description: '',
    protagonistName: null,
    storySettings: {
      worldSetting: '짧은 세계관',
      characterSetting: null,
      userRoleSetting: null,
      ruleSetting: '',
    },
    startSettings: [
      {
        id: id(index, 0),
        name: '첫 만남',
        prologue: null,
        startSituation: null,
        suggestedInputs: [],
        endings: [],
      },
    ],
    mainEvents: [],
    thumbnailUrl: null,
    thumbnailModerationStatus: 'APPROVED',
    characters: [
      {
        id: id(index, 10),
        name: '이름만 있는 인물',
        description: '',
        images: [],
      },
    ],
  };
}

export function getStorySettings(storyId: string): StorySettings | null {
  const index = stories.findIndex((s) => s.storyId === storyId);

  if (index < 0) return null;

  const story = stories[index];
  const variant =
    story.scope === 'original'
      ? original(index)
      : index % 3 === 1
        ? userFull(index)
        : userEmpty(index);

  return {
    title: story.title,
    oneLineIntro:
      '기억을 잃은 마법사 {username}이 금지된 숲에서 과거를 추적한다',
    description: story.description,
    protagonistName: '서린',
    genres: [story.genre],
    storySettings: {
      worldSetting:
        '# 세계관\n{username}은 계약서를 찾는다.\n계약 마법이 지배하는 왕국. 계약서는 서명자의 기억을 담보로 잡는다.\n\n    들여쓴 줄과  연속  공백을 그대로 둔다.',
      characterSetting:
        '# 도윤\n침착한 도서관 사서. 계약서의 출처를 알고 있다.',
      userRoleSetting:
        '# 주인공\n기억을 잃은 마법사. 자신의 이름이 적힌 계약서를 발견했다.',
      ruleSetting:
        '# 전개 규칙\n사용자의 행동에 따라 단서를 공개한다. 아주긴한단어가줄바꿈없이이어져도구역너비를넘지않고그자리에서줄을바꿔야한다아주긴한단어가줄바꿈없이이어져도구역너비를넘지않고그자리에서줄을바꿔야한다.',
    },
    startSettings: [
      {
        id: id(index, 0),
        name: '선왕의 장례식 날',
        prologue: '잿빛 비가 사흘째 왕성을 적신다.',
        startSituation: '장례식이 끝난 늦은 밤, 기사단 숙소.',
        suggestedInputs: [
          '편지를 열어본다',
          '창밖의 인기척을 확인한다',
          '여관 주인을 찾아간다',
        ],
        endings: [
          {
            name: '왕좌를 되찾다',
            requirement: {
              minTurns: 10,
              achievementCondition: '주인공이 반란군을 규합해 왕좌를 되찾는다.',
            },
            epilogue: '주인공이 왕좌에 오르는 대관식을 장엄하게 묘사한다.',
          },
        ],
      },
      {
        id: id(index, 1),
        name: '도서관의 밤',
        prologue: '금서 구역의 등불이 하나씩 꺼진다.',
        startSituation: '폐관 직후의 도서관.',
        suggestedInputs: ['서가 사이를 살핀다'],
        endings: [],
      },
    ],
    mainEvents: [
      {
        name: '잃어버린 편지를 발견한다',
        description:
          '주인공이 다락방에서 어머니가 남긴 봉인된 편지를 찾아낸다.',
        keySentence: '봉인된 편지를 열어 어머니의 비밀을 마주한다.',
        sortOrder: 0,
      },
    ],
    visibility: story.visibility,
    thumbnailUrl: null,
    thumbnailModerationStatus: 'APPROVED',
    characters: [],
    ...variant,
  };
}
