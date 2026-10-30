import { NextRequest } from 'next/server';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import { failure, isSameOrigin, isServerMode } from '@/api/admin-upstream';
import { validateAdminRequest } from '@/api/admin-validation';
import { productionDataSourceError } from '@/api/data-source-guard';
import { Delete3Body,Upsert2Body } from '@/api/generated/zod/admin';
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

/** 생성 계약으로 fixture 요청을 검증하고 서버 모드는 공통 rewrite에 맡긴다. */
export async function creditPromotionsResponse(
  request: Request,
  code?: string,
) {
  const guard = productionDataSourceError();

  if (guard) return guard;

  if (isServerMode()) return failure(503, '서버 미구현');

  if (request.method !== 'GET' && !isSameOrigin(request))
    return failure(403, '허용되지 않은 요청입니다.');

  const endpoint = findAdminEndpoint(
    '/credits/promotions' +
      (code === undefined ? '' : `/${encodeURIComponent(code)}`),
    request.method,
  );

  if (!endpoint?.operation || !endpoint.serverPath)
    return failure(404, '지원하지 않는 경로입니다.');

  try {
    const body = await validateAdminRequest(
      new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        ...(request.method === 'GET' ? {} : { body: await request.text() }),
      }),
      endpoint.operation,
      endpoint.serverPath,
      endpoint.operation.path,
    );

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

    if (request.method === 'DELETE') {
      const value = Delete3Body.parse(JSON.parse(body!));

      // 서버의 비공백 사유 검증은 OpenAPI에 없어 fixture 동작으로 재현한다.
      if (!value.reason.trim()) return failure(400, '사유를 입력해 주세요.');

      if (!model.promotion) return failure(404, '프로모션을 찾을 수 없습니다.');

      model.promotion = null;
    } else if (request.method === 'PUT') {
      const { turnCost, startsAt, endsAt, reason } = Upsert2Body.parse(
        JSON.parse(body!),
      );

      // 필수값과 int64 정수, 비공백 사유는 현재 생성 스키마가 표현하지 못하는 서버 제약이다.
      if (
        turnCost === undefined ||
        !Number.isInteger(turnCost) ||
        !startsAt ||
        !endsAt ||
        !reason.trim()
      )
        return failure(400, '요청 값이 올바르지 않습니다.');

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
