import { NextResponse } from 'next/server';

export const sessionCookie = '__Host-manyak-admin';
export interface AdminSession {
  accessToken: string;
  nickname: string;
}

export function readSession(value: string | undefined): AdminSession | null {
  if (!value) return null;

  try {
    const session: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString(),
    );

    if (
      typeof session !== 'object' ||
      session === null ||
      !('accessToken' in session) ||
      !('nickname' in session) ||
      typeof session.accessToken !== 'string' ||
      !session.accessToken ||
      typeof session.nickname !== 'string'
    )
      return null;

    return { accessToken: session.accessToken, nickname: session.nickname };
  } catch {
    return null;
  }
}

export function setSession(
  response: NextResponse,
  session: AdminSession,
  expiresIn: number,
) {
  response.cookies.set(
    sessionCookie,
    Buffer.from(JSON.stringify(session)).toString('base64url'),
    {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: expiresIn,
    },
  );
}

export function clearSession(response: NextResponse) {
  response.cookies.set(sessionCookie, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}

export function unauthorized() {
  return clearSession(
    NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 }),
  );
}
