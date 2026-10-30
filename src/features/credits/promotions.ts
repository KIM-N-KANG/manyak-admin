import { z } from 'zod';

export interface ModelPromotion {
  turnCost: number;
  startsAt: string;
  endsAt: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED';
}

export interface PromotionModel {
  code: string;
  name: string;
  turnCost: number;
  isActive: boolean;
  isDefault: boolean;
  promotion: ModelPromotion | null;
}

/** 브라우저 시간대와 무관하게 KST 입력값을 UTC로 바꾼다. */
export function kstToUtc(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;

  const date = new Date(`${value}:00+09:00`);

  if (
    !Number.isFinite(date.getTime()) ||
    utcToKst(date.toISOString()) !== value
  )
    return null;

  return date.toISOString().replace('.000Z', 'Z');
}

export function utcToKst(value: string) {
  return new Date(new Date(value).getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

export function promotionPeriod(promotion: ModelPromotion | null) {
  return promotion
    ? `${utcToKst(promotion.startsAt).replace('T', ' ')} ~ ${utcToKst(promotion.endsAt).replace('T', ' ')}`
    : '-';
}

export function promotionPrice(promotion: ModelPromotion | null) {
  return promotion === null
    ? '-'
    : promotion.turnCost === 0
      ? '0 (무료)'
      : promotion.turnCost.toLocaleString('ko-KR');
}

export function promotionStatus(promotion: ModelPromotion | null) {
  return promotion
    ? ({ SCHEDULED: '예정', ACTIVE: '진행 중', ENDED: '종료' }[
        promotion.status
      ] ?? promotion.status)
    : '-';
}

export const promotionReasonForm = z
  .string()
  .trim()
  .min(1, '사유를 입력해 주세요.')
  .max(500, '사유는 500자 이하로 입력해 주세요.');

/** 화면 입력만 검증하며 서버 계약 스키마는 OpenAPI에서 생성한다. */
export const promotionFormSchema = z
  .object({
    turnCost: z
      .string()
      .min(1, '가격을 입력해 주세요.')
      .refine(
        (value) => /^\d+$/.test(value) && Number(value) <= 10000,
        '가격은 0 이상 10,000 이하 정수로 입력해 주세요.',
      ),
    startsAt: z
      .string()
      .refine(
        (value) => kstToUtc(value) !== null,
        '시작 시각을 입력해 주세요.',
      ),
    endsAt: z
      .string()
      .refine(
        (value) => kstToUtc(value) !== null,
        '종료 시각을 입력해 주세요.',
      ),
    reason: promotionReasonForm,
  })
  .superRefine((value, context) => {
    const start = kstToUtc(value.startsAt);
    const end = kstToUtc(value.endsAt);

    if (start && end && end <= start)
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: '종료 시각은 시작 시각 이후여야 합니다.',
      });
  });

export function promotionRequest(form: z.input<typeof promotionFormSchema>) {
  const value = promotionFormSchema.parse(form);

  return {
    turnCost: Number(value.turnCost),
    startsAt: kstToUtc(value.startsAt)!,
    endsAt: kstToUtc(value.endsAt)!,
    reason: value.reason,
  };
}
