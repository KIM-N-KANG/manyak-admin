import { NextRequest } from 'next/server';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import { isSameOrigin } from '@/api/admin-upstream';
import { validateAdminRequest } from '@/api/admin-validation';
import { bffError } from '@/api/bff-error';
import { productionDataSourceError } from '@/api/data-source-guard';
import { members, memberTransactions } from '@/fixtures/entities';

const fixtureGlobal = globalThis as typeof globalThis & {
  manyakAdjustments?: Map<string, { request: string; response: unknown }>;
};

function conflict(code: string, message: string) {
  return Response.json({ status: 409, code, message }, { status: 409 });
}

function integer(value: unknown, min: number, max: number) {
  return (
    Number.isInteger(value) && Number(value) >= min && Number(value) <= max
  );
}

/** 이프 조정과 계정 정지·해제를 서버 계약대로 고정 데이터에 반영한다. */
export async function memberActionRoute(request: Request) {
  const guard = productionDataSourceError();

  if (guard) return guard;

  if (!isSameOrigin(request))
    return Response.json(
      { message: '허용하지 않는 출처입니다.' },
      { status: 403 },
    );

  const path = new URL(request.url).pathname.replace(/^\/api/, '');
  const endpoint = findAdminEndpoint(path, request.method);

  if (!endpoint?.operation || !endpoint.serverPath)
    return bffError(request, 404, '지원하지 않는 경로입니다.');

  let body: Record<string, unknown>;

  try {
    body = JSON.parse(
      (await validateAdminRequest(
        new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: await request.text(),
        }),
        endpoint.operation,
        endpoint.serverPath,
        endpoint.operation.path,
      )) ?? '{}',
    );

    // 클라이언트 모듈의 스키마는 route에서 쓸 수 없어 서버의 NotBlank와 같은 기준을 직접 확인한다.
    if (typeof body.reason !== 'string' || !body.reason.trim())
      throw new Error('사유가 올바르지 않다.');
  } catch {
    return bffError(request, 400, '요청 조건을 확인해 주세요.');
  }

  if (path === '/credits/adjustments') {
    const { memberId, type, amount, expiresInDays, idempotencyKey } = body;

    if (
      typeof memberId !== 'string' ||
      (type !== 'GRANT' && type !== 'REVOKE') ||
      !integer(amount, 1, 100000) ||
      (expiresInDays != null && !integer(expiresInDays, 1, 365)) ||
      typeof idempotencyKey !== 'string' ||
      !/^[A-Za-z0-9-]{1,64}$/.test(idempotencyKey)
    )
      return bffError(request, 400, '요청 조건을 확인해 주세요.');

    const days = type === 'GRANT' ? Number(expiresInDays ?? 30) : null;
    const signature = JSON.stringify([memberId, type, amount, days]);
    const results = (fixtureGlobal.manyakAdjustments ??= new Map());
    const stored = results.get(idempotencyKey);

    if (stored)
      return stored.request === signature
        ? Response.json({ ...(stored.response as object), duplicated: true })
        : conflict(
            'IDEMPOTENCY_KEY_CONFLICT',
            '같은 멱등 키에 다른 조정 요청을 사용할 수 없습니다.',
          );

    const member = members.find((row) => row.memberId === memberId);

    if (!member) return bffError(request, 404, '회원을 찾을 수 없습니다.');

    if (member.status === 'DELETED')
      return conflict('CONFLICT', '탈퇴한 회원입니다.');

    const rows = memberTransactions.get(memberId) ?? [];
    const before = rows.reduce((sum, row) => sum + row.amount, 0);
    const applied =
      type === 'GRANT' ? Number(amount) : Math.min(Number(amount), before);
    const now = new Date();
    const balance = before + (type === 'GRANT' ? applied : -applied);

    if (applied > 0)
      memberTransactions.set(memberId, [
        {
          amount: type === 'GRANT' ? applied : -applied,
          reason: type === 'GRANT' ? 'ADMIN_GRANT' : 'ADMIN_REVOKE',
          balanceAfter: balance,
          createdAt: now.toISOString(),
        },
        ...rows,
      ]);

    const response = {
      memberId,
      type,
      requestedAmount: amount,
      appliedAmount: applied,
      shortfall: Number(amount) - applied,
      balance,
      duplicated: false,
      expiresAt: days
        ? new Date(now.getTime() + days * 86400000).toISOString()
        : null,
    };

    results.set(idempotencyKey, { request: signature, response });

    return Response.json(response);
  }

  const memberId = decodeURIComponent(path.split('/')[2]);
  const member = members.find((row) => row.memberId === memberId);

  if (!member) return bffError(request, 404, '회원을 찾을 수 없습니다.');

  const suspend = request.method === 'POST';

  if (suspend && member.isAdmin)
    return conflict(
      'ADMIN_ACCOUNT_PROTECTED',
      '관리자 역할이 있는 회원은 정지할 수 없습니다.',
    );

  if (member.status !== (suspend ? 'ACTIVE' : 'SUSPENDED'))
    return conflict('CONFLICT', '계정 상태를 전환할 수 없습니다.');

  member.status = suspend ? 'SUSPENDED' : 'ACTIVE';

  return Response.json({
    memberId,
    nickname: member.nickname,
    status: member.status,
    updatedAt: new Date().toISOString(),
  });
}
