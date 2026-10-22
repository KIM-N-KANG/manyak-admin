/** 데이터 소스와 미리보기 허용, 운영 설정 누락 여부를 한곳에서 판정한다. */
export function getAdminDataMode() {
  const source = process.env.ADMIN_DATA_SOURCE;
  const production = process.env.VERCEL_ENV === 'production';

  return {
    source: source === 'server' ? ('server' as const) : ('fixture' as const),
    preview: !production && (!source || source === 'fixture'),
    requiresServerConfiguration: production && source !== 'server',
  };
}

export function isFixturePreview() {
  return getAdminDataMode().preview;
}

export function isServerMode() {
  return getAdminDataMode().source === 'server';
}
