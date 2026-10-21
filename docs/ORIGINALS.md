# 오리지널 화면 데이터 경계

`src/features/originals/types.ts`가 관리자 화면의 요청·응답 타입이다. 서버 API 생성물이 없는 동안 화면 전용 Zod 스키마로 입력을 검증하고 fixture BFF에 저장한다. 서버 스토리 계약을 대체하는 생성 스키마는 아니다.

## 화면과 데이터

- `/originals`: 공식 계정 ‘마냑’의 오리지널만 표시한다. 페이지와 크기, 공개·작성 상태 필터, 채팅 수·총 턴 수·수정 시각 머리글 정렬을 URL로 관리한다. 같은 값은 공개 ID 오름차순으로 고정한다.
- `/originals/new`, `/originals/{id}/edit`: 기본 정보, 장르 태그, 주인공 이름·역할, 설정 통글 4필드, 복수 시작 설정과 추천 입력 3개, 선택 엔딩·주요 사건, 인물과 이미지를 작성한다.
- `/originals/{id}`: 표지·소개·장르·주인공·인물·시작 설정과 이용 수치를 미리 본다. 폼의 이름 토큰 원문은 보존하고 미리보기에서는 기본 주인공 이름으로 치환한다. 전개 규칙과 엔딩 조건 같은 내부 설정을 사용자용 미리보기와 섞지 않는다.
- 기존 스토리 목록은 오리지널 배지를 표시하고 상세에서 관리 화면으로 연결한다.
- 홍보 알림 버튼은 `storyId`를 새 캠페인 화면에 전달해 선택 미리보기를 채운다. 서버 캠페인 계약에 이동 대상 저장 필드가 없어 해당 선택을 해제한 상태에서만 발송할 수 있다.

공식 계정은 fixture의 `officialMember`다. 소유자는 클라이언트 입력으로 바꿀 수 없다. 발행한 오리지널의 기본 정보와 공개 범위는 기존 스토리 fixture에도 반영한다. 기존 채팅방의 제목·복수 장르도 맞춰 분포 차트와 목록의 모집단을 유지한다. 제작 당시 인물 수와 기존 채팅·턴 수는 보존하고 새 스토리의 이용 수치는 0부터 시작한다.

## BFF

| 경로                         | 메서드 | 요청과 응답                                                        |
| ---------------------------- | ------ | ------------------------------------------------------------------ |
| `/api/originals`             | GET    | page·size·sort·order·visibility·status → `Page<OriginalListItem>`  |
| `/api/originals`             | POST   | `OriginalSaveRequest` → 201 `OriginalDetail`                       |
| `/api/originals/{id}`        | GET    | `OriginalDetail`, 없는 오리지널은 404                              |
| `/api/originals/{id}`        | PATCH  | `OriginalSaveRequest` 또는 visibility 단독 → 200 `OriginalDetail`  |
| `/api/originals/catalog`     | GET    | genres 정식 이름 목록                                              |
| `/api/originals/images`      | POST   | multipart file·kind(COVER/CHARACTER) → 201 objectKey·imageUrl·kind |
| `/api/originals/images/{id}` | GET    | 이미지 바이트, 없는 이미지는 404                                   |

목록은 page=1·size=20 기본값과 1~100 크기를 사용한다. 범위 밖은 빈 items와 실제 총 페이지 수를 반환한다. 잘못된 페이지·크기·정렬은 400이다.

`OriginalSaveRequest`는 status(DRAFT/PUBLISHED)와 payload를 받는 화면 BFF용 봉투다. payload 안의 필드명은 서버 일반 제작 계약을 따른다. `removeThumbnail`은 화면에서 표지 제거 의도를 보존하는 전용 필드다. 기존 인물·이미지·시작 설정은 ID를 보존하고 신규 이미지는 objectKey로 보낸다. 응답의 imageUrl은 표시용이며 저장 전에 폼 스키마가 제거한다.

초안 저장은 미완성 입력을 허용하면서 길이·개수·이미지 이름 등 형식을 검증한다. 발행된 내용을 편집해 초안으로 저장하면 payload와 공개 상태를 유지하고 draftPayload에 새 입력만 저장한다. 공개는 필수 값을 모두 검증하고 확인 후 현재 내용을 교체한다. 별도 공개 범위 전환도 확인 후 visibility만 변경한다. 초안은 공개 저장을 마치기 전에 PUBLIC으로 바꿀 수 없다.

업로드는 JPG·PNG·WebP, 1바이트~5MB만 받는다. 파일 형식 서명을 확인하고 메모리에 보관해 동일 출처 이미지 URL로 미리 본다. 입력한 객체 키의 존재·종류, 기존 인물·시작 설정·이미지의 소속을 다시 검사한다. 실제 presign·S3·검수 요청은 하지 않는다. fixture 상태는 프로세스 안에서만 공유되며 재시작이나 다른 프로세스에서는 유지되지 않는다.

## 서버 연동 시 차이

기준은 STORY BACKEND의 `3-2-DB-SCHEMA.md`, `4-2-CONTRACT.md` 4-2-15~20·4-2-25와 서버 story 패키지의 DTO·서비스다. 다른 저장소는 읽기만 한다.

- 일반 등록 `POST /stories/general`은 소유자를 요청자의 회원 토큰으로 정하고 202 제출본을 반환한다. 관리자 토큰으로 공식 계정 소유 스토리를 등록하는 계약이나 임의 owner 필드는 없다. 서버의 오리지널 판정은 계정 표시명이 아니라 설정된 공식 계정 public ID를 사용한다.
- 등록·내용 수정은 검수 후 반영된다. fixture의 즉시 공개·등록 ID 응답을 그대로 upstream에 전달할 수 없다. 관리자 등록·검수·공개 정책과 제출본 추적을 연결해야 한다.
- 서버 초안은 `/users/me/story-drafts/{draftId}`의 별도 GENERAL/GENERAL_DRAFT payload와 버전·초안 한도를 사용한다. 발행 스토리의 DRAFT 전환과 같지 않다. 화면의 draftPayload와 저장 봉투를 서버 초안 계약에 맞춰 변환해야 한다.
- 별도 자유 태그 필드는 일반 제작 계약에 없다. 화면의 장르·태그는 genres이고 공식 카탈로그 197개를 fixture로 제공한다. 실제 카탈로그 조회로 바꿔야 한다.
- 주인공은 protagonistName과 storySettings.userRoleSetting, 인물은 characters의 이름·소개·이미지로 표현한다. 주인공 전용 이미지나 characters의 역할 필드는 없다.
- 서버 이미지는 presign → PUT → 객체 키 등록과 검수를 거친다. 표지 제거는 별도 DELETE이며 null PATCH는 유지다. 화면 전용 removeThumbnail을 그대로 서버 PATCH에 넣으면 안 된다. 기존 이미지는 id, 신규는 objectKey 방식으로 연결해야 한다.
- 수정은 미전송·null 유지, 전체 컬렉션 교체·ID 소속 검사, 검수 중 409 제약을 갖는다. 현재 화면 BFF의 전체 폼 저장·즉시 응답을 직접 대체하지 말고 생성 훅·스키마와 어댑터를 연결해야 한다.

서버에 없는 정책·API가 이미 구현된 것으로 가정하지 않는다. 화면 요청은 같은 출처 BFF만 사용하고 관리자 토큰이나 실제 자격 증명은 다루지 않는다.
