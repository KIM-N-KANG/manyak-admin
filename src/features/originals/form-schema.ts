import { z } from 'zod';

const name = z.string().max(100, '100자 이하로 입력하세요.');
const text = z.string();
const image = z
  .object({
    id: z.uuid().optional(),
    objectKey: z.string().min(1).optional(),
    imageName: z.string().min(1).max(120),
  })
  .superRefine((value, context) => {
    if (Boolean(value.id) === Boolean(value.objectKey))
      context.addIssue({
        code: 'custom',
        message: '기존 이미지 또는 새 업로드 중 하나를 지정하세요.',
      });
  });
const ending = z.object({
  name,
  requirement: z.object({
    minTurns: z.number().int().min(0).max(2147483647),
    achievementCondition: text,
  }),
  epilogue: text,
});

const originalPayloadSchema = z
  .object({
    title: name,
    oneLineIntro: z.string().max(255, '255자 이하로 입력하세요.'),
    description: text,
    protagonistName: z
      .string()
      .trim()
      .max(30, '주인공 이름은 30자 이하입니다.')
      .default('')
      .transform((value) => value || undefined),
    genres: z.array(z.string().min(1).max(30)).max(8, '장르는 최대 8개입니다.'),
    storySettings: z.object({
      worldSetting: text,
      characterSetting: text,
      userRoleSetting: text,
      ruleSetting: text,
    }),
    startSettings: z.array(
      z.object({
        id: z.uuid().optional(),
        name,
        prologue: text,
        startSituation: text,
        suggestedInputs: z
          .array(text)
          .length(3, '추천 입력은 정확히 3개입니다.'),
        endings: z.array(ending).max(10),
      }),
    ),
    mainEvents: z
      .array(z.object({ name, description: text, keySentence: text }))
      .max(10),
    characters: z
      .array(
        z.object({
          id: z.uuid().optional(),
          name,
          description: z
            .string()
            .refine(
              (value) => value.trim().length <= 150 && !/[\r\n\t]/.test(value),
              '인물 소개는 150자 이하 한 줄로 입력하세요.',
            ),
          images: z.array(image).max(10),
        }),
      )
      .max(6, '인물은 최대 6명입니다.'),
    thumbnailObjectKey: z.string().min(1).optional(),
    removeThumbnail: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.removeThumbnail && value.thumbnailObjectKey)
      context.addIssue({
        code: 'custom',
        path: ['thumbnailObjectKey'],
        message: '표지 제거와 교체를 동시에 지정할 수 없습니다.',
      });

    value.characters.forEach((character, index) => {
      const names = new Set<string>();

      character.images.forEach((item, imageIndex) => {
        const suffix = item.imageName.slice(character.name.length + 1);

        if (
          !item.imageName.startsWith(`${character.name}_`) ||
          !/^[가-힣a-zA-Z0-9]{1,20}$/.test(suffix) ||
          names.has(item.imageName)
        )
          context.addIssue({
            code: 'custom',
            path: ['characters', index, 'images', imageIndex, 'imageName'],
            message:
              '인물이름_접미 형식의 고유 이름을 입력하세요. 접미는 한글·영문·숫자 1~20자입니다.',
          });

        names.add(item.imageName);
      });
    });
  });

export const originalDraftSchema = originalPayloadSchema.superRefine(
  (value, context) => {
    if (!value.title.trim())
      context.addIssue({
        code: 'custom',
        path: ['title'],
        message: '제목은 필수입니다.',
      });
  },
);

export const originalPublishSchema = originalPayloadSchema.superRefine(
  (value, context) => {
    function required(input: string, path: (string | number)[]) {
      if (!input.trim())
        context.addIssue({
          code: 'custom',
          path,
          message: '공개하려면 필수 항목을 입력하세요.',
        });
    }

    required(value.title, ['title']);
    required(value.oneLineIntro, ['oneLineIntro']);

    if (!value.genres.length)
      context.addIssue({
        code: 'custom',
        path: ['genres'],
        message: '장르를 1개 이상 선택하세요.',
      });

    if (!value.startSettings.length)
      context.addIssue({
        code: 'custom',
        path: ['startSettings'],
        message: '시작 설정이 1개 이상 필요합니다.',
      });

    Object.entries(value.storySettings).forEach(([key, entry]) =>
      required(entry, ['storySettings', key]),
    );

    function unique(names: string[], path: (string | number)[]) {
      const seen = new Set<string>();

      names.forEach((entry, index) => {
        if (seen.has(entry))
          context.addIssue({
            code: 'custom',
            path: [...path, index, 'name'],
            message: '이름이 중복되었습니다.',
          });

        seen.add(entry);
      });
    }

    unique(
      value.characters.map((character) => character.name),
      ['characters'],
    );
    unique(
      value.mainEvents.map((event) => event.name),
      ['mainEvents'],
    );
    value.characters.forEach((character, index) =>
      required(character.name, ['characters', index, 'name']),
    );
    value.mainEvents.forEach((event, index) =>
      Object.entries(event).forEach(([key, entry]) =>
        required(entry, ['mainEvents', index, key]),
      ),
    );
    value.startSettings.forEach((start, index) => {
      for (const key of ['name', 'prologue', 'startSituation'] as const)
        required(start[key], ['startSettings', index, key]);

      start.suggestedInputs.forEach((input, position) =>
        required(input, ['startSettings', index, 'suggestedInputs', position]),
      );
      unique(
        start.endings.map((item) => item.name),
        ['startSettings', index, 'endings'],
      );
      start.endings.forEach((item, position) => {
        required(item.name, [
          'startSettings',
          index,
          'endings',
          position,
          'name',
        ]);
        required(item.epilogue, [
          'startSettings',
          index,
          'endings',
          position,
          'epilogue',
        ]);
        required(item.requirement.achievementCondition, [
          'startSettings',
          index,
          'endings',
          position,
          'requirement',
          'achievementCondition',
        ]);
      });
    });

    const body = JSON.stringify([
      value.title,
      value.oneLineIntro,
      value.description,
      value.storySettings,
      value.startSettings,
      value.mainEvents,
      value.characters.map((character) => character.description),
    ]);

    if (body.includes('{username}') && !value.protagonistName)
      context.addIssue({
        code: 'custom',
        path: ['protagonistName'],
        message: '{username}을 사용하려면 주인공 이름이 필요합니다.',
      });
  },
);

export function emptyOriginal() {
  return {
    title: '',
    oneLineIntro: '',
    description: '',
    protagonistName: '',
    genres: [],
    storySettings: {
      worldSetting: '',
      characterSetting: '',
      userRoleSetting: '',
      ruleSetting: '',
    },
    startSettings: [
      {
        name: '',
        prologue: '',
        startSituation: '',
        suggestedInputs: ['', '', ''],
        endings: [],
      },
    ],
    mainEvents: [],
    characters: [],
    removeThumbnail: false,
  };
}
