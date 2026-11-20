/**
 * 실제 관리자 OpenAPI 입력이 바뀔 때 한 곳에서 갱신하는 출처 기대값이다.
 * KNK-2113: 서버 PR #566이 dev에 배포되기 전이라 그 브랜치(852a4a1)의 /v3/api-docs 파일에서 추출했다.
 * 머지 전에 dev 서버 문서(https://dev-api.manyak.app/v3/api-docs)로 다시 추출하고 이 값을 그 revision으로 바꾼다.
 */
export const expectedAdminOpenapiSource = {
  input: '/tmp/knk2111/server-api-docs-2113.json',
  revision: '852a4a1',
};
