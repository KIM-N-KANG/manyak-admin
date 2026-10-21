import type {
  OriginalDetail,
  OriginalPayload,
  OriginalRequestFields,
} from '@/features/originals/types';

export function originalFormValues(detail: OriginalDetail): OriginalPayload {
  return {
    title: detail.title,
    oneLineIntro: detail.oneLineIntro ?? '',
    description: detail.description ?? '',
    protagonistName: detail.protagonistName ?? undefined,
    genres: detail.genres,
    storySettings: Object.fromEntries(
      Object.entries(detail.storySettings).map(([key, value]) => [
        key,
        value ?? '',
      ]),
    ) as OriginalPayload['storySettings'],
    startSettings: detail.startSettings.map((start) => ({
      ...start,
      prologue: start.prologue ?? '',
      startSituation: start.startSituation ?? '',
    })),
    mainEvents: detail.mainEvents.map(({ sortOrder, ...event }) => {
      void sortOrder;

      return event;
    }),
    characters: detail.characters.map((character) => ({
      ...character,
      description: character.description ?? '',
      images: character.images.map((image) => ({
        id: image.id,
        imageName: image.imageName,
        imageUrl: image.imageUrl,
      })),
    })),
    removeThumbnail: false,
  };
}

export function originalRequestFields(
  value: OriginalPayload,
): OriginalRequestFields {
  const { removeThumbnail, ...fields } = value;

  void removeThumbnail;

  return {
    ...fields,
    characters: value.characters.map((c) => ({
      ...c,
      images: c.images.map((image) =>
        image.id
          ? { id: image.id, imageName: image.imageName }
          : { objectKey: image.objectKey!, imageName: image.imageName },
      ),
    })),
  };
}
