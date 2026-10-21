import { type NextRequest } from 'next/server';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import { failure, isServerMode } from '@/api/admin-upstream';
import { isFixturePreview } from '@/features/auth/preview';
import {
  readSession,
  sessionCookie,
  unauthorized,
} from '@/features/auth/session';

/** 서버에 구현되지 않은 경로는 fixture로 대체하지 않고 명시적으로 거부한다. */
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (isFixturePreview()) return failure(404, '지원하지 않는 경로입니다.');

  if (!readSession(request.cookies.get(sessionCookie)?.value))
    return unauthorized();

  if (!isServerMode()) return failure(404, '지원하지 않는 경로입니다.');

  const { path } = await context.params;
  const endpoint = findAdminEndpoint(`/${path.join('/')}`, request.method);

  if (!endpoint) return failure(404, '지원하지 않는 경로입니다.');

  return failure(503, '서버 미구현');
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
