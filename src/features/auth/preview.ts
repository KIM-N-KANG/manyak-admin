/** 비운영 fixture 환경에서만 인증 없는 고정 데이터 미리보기를 허용한다. */
export function isFixturePreview() {
  const source = process.env.ADMIN_DATA_SOURCE;

  return (
    (!source || source === 'fixture') && process.env.VERCEL_ENV !== 'production'
  );
}
