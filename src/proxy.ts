import { type NextRequest, NextResponse } from 'next/server';

import { failure, isSameOrigin, isServerMode } from '@/api/admin-upstream';
import { isFixturePreview } from '@/features/auth/preview';
import {
  readSession,
  sessionCookie,
  unauthorized,
} from '@/features/auth/session';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const api = path.startsWith('/api/');

  if (
    api &&
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    !isSameOrigin(request)
  )
    return failure(403, '허용되지 않은 요청입니다.');

  if (isFixturePreview()) {
    if (path === '/login')
      return NextResponse.redirect(new URL('/dashboard', request.url));

    const response = NextResponse.next();

    response.headers.set('Cache-Control', 'private, no-store');

    return response;
  }

  if (
    path === '/login' ||
    path === '/api/auth/login' ||
    path === '/api/auth/logout'
  )
    return NextResponse.next();

  const session = readSession(request.cookies.get(sessionCookie)?.value);

  if (!session)
    return api
      ? unauthorized()
      : NextResponse.redirect(new URL('/login', request.url));

  if (api && isServerMode() && !path.startsWith('/api/admin-upstream/')) {
    const url = request.nextUrl.clone();

    url.pathname = `/api/admin-upstream/${path.slice('/api/'.length)}`;

    return NextResponse.rewrite(url);
  }

  const response = NextResponse.next();

  response.headers.set('Cache-Control', 'private, no-store');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icons/|logo/).*)',
  ],
};
