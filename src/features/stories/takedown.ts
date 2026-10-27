import type { Story } from './types';

export const takedownReasons = {
  SEXUAL_CONTENT: '선정성',
  COPYRIGHT_INFRINGEMENT: '저작권 침해',
  HATE_SPEECH: '혐오 표현',
  ETC: '기타',
};
export type TakedownReason = keyof typeof takedownReasons;

export function takedownReasonLabel(
  code: string | null,
  detail: string | null,
) {
  if (!code) return '';

  if (code === 'ETC') return `기타 (${detail ?? ''})`;

  return (takedownReasons as Record<string, string>)[code] ?? code;
}

export function canTakeDown(story: Story) {
  return (
    story.scope === 'user' &&
    Boolean(story.owner) &&
    story.deletedAt === null &&
    story.takenDownAt === null
  );
}
