import { type NextRequest, NextResponse } from 'next/server';

import { failure, isSameOrigin } from '@/api/admin-upstream';
import { clearSession } from '@/features/auth/session';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return failure(403, '허용되지 않은 요청입니다.');

  return clearSession(
    new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    }),
  );
}
