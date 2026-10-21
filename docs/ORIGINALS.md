# 오리지널 화면 데이터 경계

`src/features/originals/types.ts`의 요청·응답은 STORY BACKEND 4-2-27~32 관리자 계약을 따른다. `OriginalPayload`는 화면 편집 상태이며 `originalFormValues`가 평탄한 상세 응답을 편집 상태로 변환한다. 화면 전용 Zod 검증은 생성 서버 스키마를 대체하지 않는다.

## 화면과 저장

목록은 공식 계정 소유 오리지널의 `storyId`, 상태·공개 범위, 표지와 이용 지표를 표시하고 공통 숫자 페이지·정렬·검색을 사용한다. 상세는 이름 토큰을 기본 주인공 이름으로 치환해 미리 보며, 전개 규칙과 엔딩 조건을 사용자용 미리보기에 섞지 않는다.

등록·수정은 일반 제작 필드에 `status`, `visibility`, 필수 `reason`을 더한 평탄한 본문을 보낸다. 초안은 제목이 필수이며 기본 상태는 DRAFT, 공개 범위는 PRIVATE다. 발행 시 전체 필수 항목을 검증하고 확인 후 공개한다. PUBLISHED는 DRAFT로 되돌릴 수 없으며 변경 저장은 현재 내용을 즉시 바꾼다. 별도 수정 초안이나 `draftPayload`는 없다. 공개 범위도 사유와 함께 PATCH한다.

기존 인물·시작 설정은 ID로 매칭하고 요청한 컬렉션으로 교체한다. 기존 이미지는 `{id, imageName?}`, 신규는 `{objectKey, imageName}`로 연결한다. 생략·null인 수정 필드는 유지한다. 표지 제거 의도는 화면 상태에만 보존하고 저장 후 별도 DELETE를 호출한다. 저장 성공 후 삭제가 실패하면 받은 storyId로 재시도해 중복 등록을 피한다.

## BFF

| 경로                                 | 메서드     | 요청과 응답                                                           |
| ------------------------------------ | ---------- | --------------------------------------------------------------------- |
| `/api/originals`                     | GET        | 공통 목록 쿼리 → `Page<OriginalListItem>`                             |
| `/api/originals`                     | POST       | 일반 등록 필드 + 상태·공개 범위·사유 → 201 `OriginalDetail`           |
| `/api/originals/{id}`                | GET, PATCH | 평탄한 상세 및 부분 수정 → `OriginalDetail`                           |
| `/api/originals/{id}/thumbnail`      | DELETE     | 사유 → `OriginalDetail`                                               |
| `/api/originals/images/presign`      | POST       | kind·contentType·contentLength → uploadUrl·objectKey·expiresInSeconds |
| `/api/originals/{id}/images/presign` | POST       | 같은 요청, 해당 스토리 접두어로 발급                                  |
| `/api/originals/images/{id}`         | PUT, GET   | 고정 데이터용 업로드 URL과 이미지 바이트 조회                         |
| `/api/originals/catalog`             | GET        | 제공 장르와 대표 장르의 id·name 배열                                  |

presign → 업로드 URL로 PUT → objectKey 저장 흐름을 fixture로 흉내 낸다. PUT은 발급한 종류·파일 형식·크기·만료와 파일 서명을 검사한다. 저장은 업로드 완료와 객체 키의 공식 계정 임시/해당 스토리 접두어를 확인한다. 표지 삭제는 PATCH의 removeThumbnail 필드를 사용하지 않는다.

상세의 홍보 알림 만들기는 캠페인 작성에 storyId를 전달한다. 발행 상태인 공개 스토리를 선택한 캠페인만 발송할 수 있다.

## 서버 연결

인증과 실제 manyak-server 호출·스토리 검수·외부 저장소는 연결하지 않았다. 관리자 오리지널은 계약대로 검수를 거치지 않고 저장한다. fixture의 파일·기록은 프로세스 메모리에만 유지된다. 실제 연결 시 BFF에서 관리자 API를 호출하고 생성 스키마로 요청을 검증한다. PUT은 서버가 준 저장소 presigned URL을 사용하고 화면 미리보기는 로컬 Blob URL을 사용한다. 고정 데이터 전용 PUT/이미지 조회 경로는 실제 저장소로 대체된다. 카탈로그의 숫자 ID는 fixture 값이며 실제 장르 API의 ID와 이름을 그대로 받는다.
