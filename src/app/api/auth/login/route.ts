import { type NextRequest, NextResponse } from 'next/server';

import { adminLoginPath } from '@/api/admin-endpoints';
import {
  failure,
  forwardAdminRequest,
  isSameOrigin,
} from '@/api/admin-upstream';
import { LoginBody } from '@/api/generated/zod/admin';
import { isFixturePreview } from '@/features/auth/preview';
import { clearSession, setSession } from '@/features/auth/session';

function loginResult(value: unknown) {
  if (typeof value !== 'object' || value === null) return null;

  if (
    !('accessToken' in value) ||
    typeof value.accessToken !== 'string' ||
    !value.accessToken ||
    !('expiresIn' in value) ||
    typeof value.expiresIn !== 'number' ||
    !Number.isSafeInteger(value.expiresIn) ||
    value.expiresIn <= 0 ||
    value.expiresIn > 7200 ||
    !('tokenType' in value) ||
    value.tokenType !== 'Bearer' ||
    !('admin' in value) ||
    typeof value.admin !== 'object' ||
    value.admin === null ||
    !('nickname' in value.admin) ||
    typeof value.admin.nickname !== 'string'
  )
    return null;

  const session = {
    accessToken: value.accessToken,
    nickname: value.admin.nickname,
  };

  if (Buffer.byteLength(JSON.stringify(session)) > 2800) return null;

  return { session, expiresIn: value.expiresIn };
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return failure(403, '허용되지 않은 요청입니다.');

  if (isFixturePreview())
    return NextResponse.json(
      { admin: { nickname: '미리보기' } },
      { headers: { 'Cache-Control': 'no-store' } },
    );

  if (
    request.nextUrl.search ||
    !request.headers.get('Content-Type')?.startsWith('application/json')
  )
    return failure(400, '잘못된 로그인 요청입니다.');

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return failure(400, '잘못된 로그인 요청입니다.');
  }

  const parsed = LoginBody.safeParse(input);

  if (!parsed.success) return failure(400, '잘못된 로그인 요청입니다.');

  const upstream = await forwardAdminRequest(
    request,
    adminLoginPath,
    JSON.stringify(parsed.data),
    false,
  );

  if (!upstream.ok)
    return upstream.status === 403 ? clearSession(upstream) : upstream;

  let result;

  try {
    result = loginResult(await upstream.json());
  } catch {
    return failure(502, '잘못된 서버 응답입니다.');
  }

  if (!result) return failure(502, '잘못된 서버 응답입니다.');

  const response = NextResponse.json(
    { admin: { nickname: result.session.nickname } },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Manyak-Request-Id': upstream.headers.get('X-Manyak-Request-Id')!,
      },
    },
  );

  setSession(response, result.session, result.expiresIn);

  return response;
}
