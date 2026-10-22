import { NextResponse } from 'next/server';

import { getAdminDataMode } from '@/features/auth/preview';

/** 운영에서 서버 모드가 아니면 fixture를 실행하기 전에 거부한다. */
export function productionDataSourceError() {
  return getAdminDataMode().requiresServerConfiguration
    ? NextResponse.json(
        { message: '서버 연결 설정 필요' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    : null;
}
