import { type NextRequest } from 'next/server';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import {
  failure,
  forwardAdminRequest,
  isServerMode,
} from '@/api/admin-upstream';
import { validateAdminRequest } from '@/api/admin-validation';
import { productionDataSourceError } from '@/api/data-source-guard';
import { isFixturePreview } from '@/features/auth/preview';
import {
  readSession,
  sessionCookie,
  unauthorized,
} from '@/features/auth/session';

/** 생성 스키마로 검증한 요청만 전달하고 미구현 경로는 명시적으로 거부한다. */
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  if (isFixturePreview()) return failure(404, '지원하지 않는 경로입니다.');

  if (!readSession(request.cookies.get(sessionCookie)?.value))
    return unauthorized();

  if (!isServerMode()) return failure(404, '지원하지 않는 경로입니다.');

  const { path } = await context.params;
  const endpoint = findAdminEndpoint(`/${path.join('/')}`, request.method);

  if (!endpoint) return failure(404, '지원하지 않는 경로입니다.');

  if (!endpoint.implemented || !endpoint.serverPath || !endpoint.operation)
    return failure(503, '서버 미구현');

  let body: string | undefined;

  try {
    body = await validateAdminRequest(
      request,
      endpoint.operation,
      endpoint.serverPath,
      endpoint.operation.path,
    );
  } catch {
    return failure(400, '요청 값이 올바르지 않습니다.');
  }

  return forwardAdminRequest(
    request,
    endpoint.serverPath + request.nextUrl.search,
    body,
  );
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
