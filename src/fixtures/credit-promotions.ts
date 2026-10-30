import { failure, isSameOrigin, isServerMode } from '@/api/admin-upstream';
import { productionDataSourceError } from '@/api/data-source-guard';
import type {
  ModelPromotion,
  PromotionModel,
} from '@/features/credits/promotions';

const now = Date.now();

export const promotionModels: PromotionModel[] = [
  {
    code: 'LITE',
    name: '라이트',
    turnCost: 20,
    isActive: true,
    isDefault: false,
    promotion: {
      turnCost: 0,
      startsAt: '2026-10-31T01:00:00Z',
      endsAt: '2026-11-05T15:00:00Z',
      status: 'SCHEDULED',
    },
  },
  {
    code: 'AURORA',
    name: '오로라',
    turnCost: 50,
    isActive: true,
    isDefault: true,
    promotion: null,
  },
  {
    code: 'PREVIEW_ACTIVE',
    name: '미리보기 모델',
    turnCost: 30,
    isActive: true,
    isDefault: false,
    promotion: {
      turnCost: 10,
      startsAt: new Date(now - 86400000).toISOString(),
      endsAt: new Date(now + 86400000).toISOString(),
      status: 'ACTIVE',
    },
  },
  {
    code: 'PREVIEW_INACTIVE',
    name: '이전 모델',
    turnCost: 40,
    isActive: false,
    isDefault: false,
    promotion: {
      turnCost: 20,
      startsAt: '2026-10-01T00:00:00Z',
      endsAt: '2026-10-02T00:00:00Z',
      status: 'ENDED',
    },
  },
];

function status(promotion: ModelPromotion): ModelPromotion {
  return {
    ...promotion,
    status:
      Date.now() < Date.parse(promotion.startsAt)
        ? 'SCHEDULED'
        : Date.now() < Date.parse(promotion.endsAt)
          ? 'ACTIVE'
          : 'ENDED',
  };
}

/** 생성 계약을 연결하기 전에는 fixture만 처리하고 업스트림 호출을 차단한다. */
export async function creditPromotionsResponse(
  request: Request,
  code?: string,
) {
  const guard = productionDataSourceError();

  if (guard) return guard;

  if (isServerMode()) return failure(503, '서버 미구현');

  if (request.method !== 'GET' && !isSameOrigin(request))
    return failure(403, '허용되지 않은 요청입니다.');

  if (new URL(request.url).search)
    return failure(400, '지원하지 않는 쿼리입니다.');

  if (request.method === 'GET')
    return Response.json(
      {
        items: promotionModels.map((model) => ({
          ...model,
          promotion: model.promotion ? status(model.promotion) : null,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );

  const model = promotionModels.find((item) => item.code === code);

  if (!model) return failure(404, '모델을 찾을 수 없습니다.');

  try {
    // 이 검사는 fixture 동작용이며 서버 전달에는 생성 Zod 검증이 필요하다.
    const body: unknown = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error();

    const value = body as Record<string, unknown>;

    if (
      typeof value.reason !== 'string' ||
      !value.reason.trim() ||
      value.reason.length > 500
    )
      throw new Error();

    if (request.method === 'DELETE') {
      if (Object.keys(value).some((key) => key !== 'reason')) throw new Error();

      if (!model.promotion) return failure(404, '프로모션을 찾을 수 없습니다.');

      model.promotion = null;
    } else if (request.method === 'PUT') {
      if (
        Object.keys(value).some(
          (key) => !['turnCost', 'startsAt', 'endsAt', 'reason'].includes(key),
        )
      )
        throw new Error();

      const { turnCost, startsAt, endsAt } = value;

      if (
        typeof turnCost !== 'number' ||
        !Number.isInteger(turnCost) ||
        turnCost < 0 ||
        turnCost > 10000 ||
        typeof startsAt !== 'string' ||
        typeof endsAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(startsAt) ||
        !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(endsAt) ||
        !Number.isFinite(Date.parse(startsAt)) ||
        !Number.isFinite(Date.parse(endsAt))
      )
        throw new Error();

      if (Date.parse(endsAt) <= Date.parse(startsAt))
        return failure(400, '종료 시각은 시작 시각 이후여야 합니다.');

      if (Date.parse(endsAt) <= Date.now())
        return failure(400, '종료 시각은 현재 시각 이후여야 합니다.');

      model.promotion = status({
        turnCost,
        startsAt,
        endsAt,
        status: 'SCHEDULED',
      });
    } else return failure(405, '지원하지 않는 요청입니다.');

    return Response.json(model, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return failure(400, '요청 값이 올바르지 않습니다.');
  }
}
