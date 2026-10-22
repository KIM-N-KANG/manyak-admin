import { type NextRequest, NextResponse } from 'next/server';

import { productionDataSourceError } from '@/api/data-source-guard';
import { isFixturePreview } from '@/features/auth/preview';
import {
  clearSession,
  readSession,
  sessionCookie,
  unauthorized,
} from '@/features/auth/session';

export { isServerMode } from '@/features/auth/preview';

export function failure(status: number, message: string) {
  return NextResponse.json(
    { message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export function requestId(request: Request) {
  const id = request.headers.get('X-Manyak-Request-Id');

  return id && /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : crypto.randomUUID();
}

export function isSameOrigin(request: Request) {
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') return false;

  const origin = request.headers.get('Origin');

  if (!origin) return true;

  try {
    const source = new URL(origin);
    const url = new URL(request.url);
    const host = request.headers.get('Host') ?? url.host;
    const protocol =
      request.headers.get('X-Forwarded-Proto')?.split(',')[0].trim() ??
      url.protocol.slice(0, -1);

    return source.host === host && source.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}

/** 토큰과 요청 ID만 업스트림에 전달하고 응답 본문과 상태를 보존한다. */
export async function forwardAdminRequest(
  request: NextRequest,
  path: string,
  body?: string,
  authenticated = true,
) {
  if (isFixturePreview())
    return failure(503, '미리보기에서는 서버를 호출하지 않습니다.');

  const configurationError = authenticated ? productionDataSourceError() : null;

  if (configurationError) return configurationError;

  const session = readSession(request.cookies.get(sessionCookie)?.value);

  if (authenticated && !session) return unauthorized();

  const base = process.env.API_BASE_URL?.replace(/\/+$/, '');

  if (!base) return failure(503, 'API_BASE_URL 설정이 필요합니다.');

  const id = requestId(request);
  const headers = new Headers({
    'X-Manyak-Request-Id': id,
    Accept: 'application/json',
  });

  if (authenticated && session)
    headers.set('Authorization', `Bearer ${session.accessToken}`);

  if (body !== undefined) headers.set('Content-Type', 'application/json');

  try {
    const upstream = await fetch(`${base}${path}`, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    const responseHeaders = new Headers({
      'Cache-Control': 'no-store',
      'X-Manyak-Request-Id': upstream.headers.get('X-Manyak-Request-Id') ?? id,
    });
    const contentType = upstream.headers.get('Content-Type');

    if (contentType) responseHeaders.set('Content-Type', contentType);

    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });

    return upstream.status === 401 ? clearSession(response) : response;
  } catch {
    return failure(502, '관리자 서버에 연결할 수 없습니다.');
  }
}
