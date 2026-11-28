/**
 * 표지(3:4)와 인물 이미지(4:3)의 작은 칸 크기와 원본 비율이다.
 * 작은 칸은 모두 높이 144px(h-36)로 맞추고 너비만 비율에 따라 다르다.
 */
export const imageFrame = {
  COVER: {
    width: 'w-27',
    size: { width: 108, height: 144 },
    large: { width: 1200, height: 1600 },
  },
  CHARACTER: {
    width: 'w-48',
    size: { width: 192, height: 144 },
    large: { width: 1600, height: 1200 },
  },
} as const;

export type ImageKind = keyof typeof imageFrame;
