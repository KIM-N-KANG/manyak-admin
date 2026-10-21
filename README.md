# 마냑 관리자

마냑 서비스의 운영 현황을 확인하는 Next.js App Router 관리자 화면입니다. 대시보드와 스토리·회원·결제·채팅방 목록 및 상세를 제공합니다. Google 관리자 로그인을 제공하며 데이터 BFF는 기본적으로 `src/fixtures/`의 가상 고정 데이터를 반환합니다. 회원 변경 작업은 확인 다이얼로그까지 구현했습니다.

## 실행

Node.js 22 이상과 `package.json`에 지정된 pnpm 12.5.1을 사용합니다.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

개발 서버는 http://localhost:3000 에서 실행됩니다. 로컬과 Vercel 비운영 fixture 환경은 Google 설정 없이 고정 데이터 화면을 미리볼 수 있습니다. production 또는 server 모드는 Google 클라이언트와 관리자 로그인 서버 설정이 필요합니다. 쿠키는 로컬에서도 Secure를 유지하므로 HTTPS 개발 서버(`pnpm dev --experimental-https`)를 권장합니다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

## 구성

- Next.js 16.2.6, React 19.2.4, TypeScript, React Compiler
- Tailwind CSS v4, shadcn Base UI, 로컬 Pretendard, 라이트 모드
- TanStack Query 데이터 조회, shadcn Chart / Recharts, sonner, Vitest BFF 검증
- ESLint·Prettier, husky pre-commit·lint-staged
- PR 및 dev push에서 lint·typecheck·test·build 실행, 배포는 Vercel에서 설정

```text
src/
  app/                  # 관리자 화면, BFF route handler, 전역 토큰
  assets/fonts/         # Pretendard Variable
  components/providers/ # TanStack Query 프로바이더
  components/ui/        # 버튼, 카드, 토스트, 차트
  features/             # 도메인 응답 타입, 화면, 데이터 조회 훅
  fixtures/             # 서버에서만 사용하는 가상 고정 데이터
  lib/                  # cn, QueryClient
  api/mutator/          # Orval용 BFF fetch
tests/                  # BFF, mutator, 유틸, 주석 컨벤션 검증
```

디자인 기준은 [docs/DESIGN.md](docs/DESIGN.md), 개발 규칙은 [AGENTS.md](AGENTS.md)와 [CLAUDE.md](CLAUDE.md)에 있습니다. 루트 메타데이터는 검색 엔진의 색인과 링크 추적을 비활성화합니다.

## API와 인증

`.env.example`의 빈 값을 `.env.local`에 설정합니다.

| 키                             | 용도                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `API_BASE_URL`                 | Next 서버에서만 사용하는 manyak-server 기본 URL입니다. 경로 접두어 없이 설정합니다. 미리보기 우회 외의 로그인에서 사용합니다. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth 웹 클라이언트 ID입니다. 빌드 시 공개되며 클라이언트 비밀키는 사용하지 않습니다.                                  |
| `ADMIN_DATA_SOURCE`            | 비어 있으면 `fixture`, 실서버 경로는 `server`입니다.                                                                          |

`/login`에서 [Google Identity Services](https://developers.google.com/identity/gsi/web/reference/js-reference)가 ID token을 발급하면 동일 출처 `POST /api/auth/login`이 서버의 `POST /api/v1/admin/auth/login/google`로 전달합니다. BFF는 관리자 accessToken과 닉네임을 호스트 전용 `__Host-manyak-admin` 쿠키에 보관합니다. Domain을 지정하지 않고 httpOnly·Secure·SameSite=Lax·Path=/를 적용하며 서버의 expiresIn(최대 7200초)을 만료로 사용합니다. 브라우저 응답에는 닉네임만 포함하고 토큰은 노출하지 않습니다. 401과 403은 모두 “관리자 권한이 없는 계정”으로 안내합니다.

[Google Cloud의 웹 클라이언트](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)에 실제 관리자 사이트(`https://admin.manyak.app`)와 사용할 개발 사이트를 승인된 JavaScript 원본으로 등록해야 합니다. 팝업 콜백 방식을 사용합니다. 서버의 `MANYAK_GOOGLE_CLIENT_IDS` 허용 목록에 같은 웹 클라이언트 ID를 포함하고, 기존 Google 연결 회원에게 관리자 권한을 부여해야 합니다. 정지·탈퇴 계정은 로그인할 수 없습니다. 이 운영 설정은 저장소에 값을 넣지 않고 담당자가 수행합니다.

Next 16의 `src/proxy.ts`가 쿠키 없는 페이지를 `/login`으로 보내고, API는 401로 응답합니다. 관리자 레이아웃에서도 세션 구조를 확인하며 최종 역할·상태·토큰 검증은 서버가 수행합니다. 서버 401은 쿠키 삭제와 화면 로그인 이동으로 이어집니다. 사이드바는 로그인 닉네임과 로그아웃 버튼을 제공합니다. `POST /api/auth/logout`은 쿠키만 삭제하며 서버의 토큰 폐기 API는 없습니다. 로그아웃과 만료 시 전체 페이지 이동으로 클라이언트 조회 캐시를 비웁니다. ID token과 관리자 토큰은 로그·localStorage·sessionStorage에 저장하지 않습니다.

fixture(빈 값 포함)이며 `VERCEL_ENV !== production`이면 `src/features/auth/preview.ts`의 단일 판정으로 인증 없는 미리보기를 허용합니다. `/login`은 `/dashboard`로 이동하고 사이드바에 닉네임 “미리보기”와 “고정 데이터 미리보기”를 표시하며 로그아웃은 숨깁니다. 이 상태에서는 로그인 BFF와 공통 업스트림 계층도 실제 서버를 호출하지 않습니다. production+fixture 또는 비운영+server는 기존 쿠키 인증을 유지합니다.

데이터 모드는 이 조건에 따라 인증 정책과 함께 적용합니다. `fixture`는 기존 fixture route handler를 사용합니다. `server`는 보호된 `/api/admin-upstream/[...path]` route handler로 rewrite하고 경로를 `src/api/admin-endpoints.ts`에서 찾습니다. `src/api/admin-upstream.ts`는 서버 전용 URL, 쿠키의 Bearer 토큰, `X-Manyak-Request-Id`, no-store, 오류·응답 전달을 담당합니다. PR #353 기준 데이터 API는 아직 없으므로 503 “서버 미구현”으로 응답하며 fixture로 자동 전환하지 않습니다. 서버 API를 활성화할 때 생성 Zod로 본문·쿼리 검증을 연결해야 합니다. 브라우저의 Authorization·다른 쿠키나 임의 URL은 업스트림에 전달하지 않습니다.

로그인 요청 Zod는 실제 서버 기준 브랜치 `feat/KNK-1738-admin-auth-foundation`의 e1083c2에서 추출한 OpenAPI 스냅샷으로 생성합니다. 테스트 전용 probe 경로는 포함하지 않습니다.

```bash
# 새 서버 /v3/api-docs JSON에서 로그인 경로와 참조 DTO를 추출합니다.
node scripts/extract-admin-auth-openapi.mjs /path/to/server-openapi.json server-commit-sha
pnpm api:generate:auth

# 전체 관리자 API 연결 시 서버 OpenAPI에서 클라이언트와 Zod를 생성합니다.
pnpm api:generate
```

생성 파일은 직접 수정하지 않습니다. 현재 조회 화면은 fixture용 TanStack Query와 기존 mutator를 사용합니다. 로그인 성공 응답의 토큰은 일반 조회 훅으로 브라우저에 반환하지 않습니다. 서버 OpenAPI의 성공 응답이 `*/*`로 선언되어 Orval 응답 검증은 unknown이므로, BFF가 쿠키 발급에 필요한 토큰·만료·닉네임을 별도로 확인합니다.

## 화면과 데이터 경계

- `/dashboard`(개요): KST 기준 DB 숫자 카드와 7·30·90일 추이. 별도 Amplitude 영역에 오늘 활성 사용자와 DAU·신규 사용자 추이를 제공하며 같은 기간을 사용합니다. Amplitude 조회 실패는 해당 영역의 재시도로 처리합니다. 모든 차트는 마냑 초록을 사용합니다. 일별 수치 목록에서도 키보드로 필터가 적용된 목록에 이동할 수 있습니다.
- `/dashboard/analytics`(분석): 7·30·90일 이용 분포 8종과 관련 목록 이동을 제공합니다. 개요의 숫자 카드·일별 추이·Amplitude 영역은 포함하지 않습니다.
- `/`는 기존 기간·지표 등 쿼리를 유지해 `/dashboard`로 이동하고, `/campaigns`는 `/notifications/campaigns`로 이동합니다.
- `/stories`, `/members`, `/payments`, `/chats`: URL 쿼리 필터와 정렬, `items`·`page`·`size`·`totalElements`·`totalPages` 숫자 페이지(1부터, 기본 20건, 크기 1~100), `/{id}` 상세 연결을 제공합니다.
- `/login`: Google 관리자 로그인과 공통 실패 안내를 제공합니다.
- `/originals`, `/originals/new`, `/originals/{id}`, `/originals/{id}/edit`: 공식 계정 마냑의 오리지널 목록·작성·미리보기·수정 화면입니다. 제목·사유를 갖춘 초안 저장과 공개, 발행 내용 즉시 수정, 공개 상태 전환 확인, 표지·인물 이미지 미리보기·교체·제거를 제공합니다.
- `/audit-logs`: 처리자·작업·대상·기간 필터, 정렬·숫자 페이지, 변경 전후와 요청 ID 상세를 제공합니다. 변경 값은 작업별 허용 키만 표에 표시하고 나머지는 개수만 표시합니다. 이메일처럼 보이는 문자열은 마스킹하며 복합 값의 내부는 표시하지 않습니다.
- `/notices`: 공지 초안 작성·수정, 게시·게시 해제, 알림 요청과 삭제 제한을 제공합니다.
- `/notifications/campaigns`: 캠페인 목록·상세, 대상 수 미리보기, 작성·예약, 상태별 취소·재실행을 제공합니다.
- `/notifications/stats`: 최대 366일 KST 기간·알림 종류·수신 유형 필터, 날짜별·종류별 표와 초록 막대 차트를 제공합니다.
- `/notifications/templates`: 출석 리마인더의 현재 문구·예약 변경·기본 복귀·변경 이력을 제공합니다.
- 사이드바는 대시보드(개요·분석), 관리(회원·스토리·오리지널·채팅방·결제·공지·감사 로그), 알림(캠페인·발송 통계·문구 템플릿) 세 구역입니다. 구역 버튼은 아이콘·굵은 글씨·화살표로 접고 펼치며 현재 경로의 구역은 항상 펼칩니다. 나머지 상태는 `manyak-admin:sidebar:v1` localStorage에 기억합니다. 하위 메뉴는 세로 안내선으로 묶고 목록과 상세에서 해당 메뉴를 활성 표시합니다.
- 응답 타입은 `src/features/<도메인>/types.ts`에 있습니다. 차트와 목록·상세의 화면 BFF 응답을 타입으로 정의했습니다. 대시보드 숫자 카드는 회원·채팅 시작·턴·스토리·이프 지급·소진·결제 이력·금액의 8개이며 각각 누적과 오늘 값을 제공합니다.
- API 생성물이 없는 동안 `src/features/shared/use-api.ts`가 TanStack Query와 기존 mutator를 연결합니다. 서버 계약 확정 후 생성 훅으로 대체할 수 있으며 화면 응답 구조는 BFF에서 맞춥니다.
- 가상 이메일 `member1@example.com`부터 `member1240@example.com`까지 정확 일치 검색이 가능합니다. 응답에는 이메일을 포함하지 않습니다. 대화 원문과 인증 토큰도 응답에 없습니다.
- 목록의 `from`, `to`는 KST 날짜로 생성·가입·결제 완료·채팅 시작일에 적용합니다. `attendanceDate`, `creditDate`, `turnDate`는 관련 활동일 필터입니다. 이프는 `creditDirection=granted|spent`로 방향과 ADMIN 2-4의 사유를 함께 검사하며, 회원 목록과 상세는 회원별 원장을 공유합니다. `chatFrom/chatTo`, `aiFrom/aiTo`, `creationFrom/creationTo`는 각각 채팅 생성일·AI 호출일·제작 세션 생성일 기준입니다. 숫자 카드와 추이·분포는 목록과 같은 고정 원천을 집계합니다. 회원의 `chatCount`는 전체 채팅방 수이며 `periodChatCount`는 선택 기간에 생성한 수입니다.
- 분포의 정의는 Grafana `service-stats`를 기준으로 합니다. 첫 사용자 입력 시간은 900초 이내, 입력 인물 수는 주변 인물만, AI 지연은 성공 호출만, 성공률은 완료 호출만 집계합니다. 결제 건수와 금액은 환불을 포함한 완료 이력 주문을 집계하고 같은 목록으로 이동합니다. 실제 DB 집계와 팀 계정 제외는 서버 연동 단계에서 구현합니다.

Amplitude BFF `/api/dashboard/analytics?days=7|30|90`는 `src/fixtures/analytics.ts`의 가상 집계를 반환합니다. 타입은 `DashboardAnalytics`이며 `asOf/from/to/todayActiveUsers/daily`를 제공합니다. 외부 Amplitude에 직접 연결하지 않으며, 화면의 출처 도움말은 집계 지연과 팀 계정 제외 기준을 설명합니다.

목록 머리글 정렬은 `sort=<열 키>&order=asc|desc`를 사용합니다. 허용 열은 `src/features/shared/list-config.ts`의 `listSorts`를 따르며, 기본은 생성·가입·완료·시작 시각 내림차순입니다. 전체 필터 결과를 정렬한 뒤 페이지를 나누고, 동률은 공개 식별자 오름차순으로 고정합니다. 환불 시각이 없는 주문은 방향과 무관하게 뒤에 둡니다. 범위 밖 페이지는 빈 `items`와 실제 총 페이지 수를 반환하고, 잘못된 page·size·sort·order는 400입니다. 이전 cursor·limit 요청은 지원하지 않습니다.

상세 화면의 스토리·결제·채팅방 하위 목록도 같은 목록 BFF를 관계 필터와 함께 호출합니다. 서로 다른 하위 목록의 페이지·크기·정렬은 URL에서 `chatsPage/chatsSize/chatsSort/chatsOrder`처럼 목록 이름을 앞에 붙여 독립적으로 보존합니다. BFF에 보낼 때는 표준 `page/size/sort/order`로 변환합니다. 숫자 페이지와 정렬은 최신 ADMIN 공통 목록 계약을 따릅니다.

오리지널 화면은 `src/features/originals/types.ts`와 화면 전용 Zod 폼 스키마를 사용합니다. 서버의 일반 제작·수정 필드명을 유지하며, 장르 태그는 서버 V91 카탈로그의 정식 이름을 사용합니다. BFF는 평탄한 등록·부분 수정 요청과 storyId 상세 응답, presign→PUT→objectKey 업로드와 표지 DELETE를 프로세스 메모리 fixture로 흉내 냅니다. 재시작·프로세스 변경 시 저장한 내용과 이미지는 사라집니다. 실제 서버 연결·스토리지 업로드·검수는 수행하지 않습니다. 요청/응답과 서버 연동 차이는 [오리지널 화면 데이터 경계](docs/ORIGINALS.md)에 있습니다. 상세의 ‘홍보 알림 만들기’는 `/notifications/campaigns/new?storyId=<id>`로 연결해 스토리 선택을 미리 채웁니다. 발행 상태인 공개 스토리를 선택하면 캠페인 작성 본문에 storyId를 전달합니다. 비공개·초안·없는 스토리는 거절합니다.

관리 목록 5종(회원·스토리·오리지널·채팅방·결제)은 공통 검색창의 300ms 디바운스로 `q`를 갱신하고 page=1로 복귀합니다. 검색과 필터·정렬은 AND이며 전체 결과를 검색한 후 정렬·페이지 처리합니다. 앞뒤·연속 공백과 대소문자를 정리하며, 화면에서 빈 검색은 쿼리를 제거해 해제하며, 명시한 빈 q·50자 초과 및 중복 q는 400입니다. UUID와 회원 이메일은 정확 일치, 제목·닉네임은 지정한 대상의 부분 일치입니다.

회원 상세의 거래·출석은 `/api/members/{id}/transactions`와 `/attendance`에서 같은 숫자 페이지 계약으로 조회합니다. URL 상태는 `transactionsPage/transactionsSize`, `attendancePage/attendanceSize`로 분리합니다. 거래 원장은 시각·사유·금액·거래 후 잔액만 노출하며 내부 ID와 가상의 transactionId를 사용하지 않습니다. 결제 상품의 `if_5000` 등 상품 ID는 계약의 `productId`로 표시합니다.

공지·알림 변경은 `src/fixtures/`의 프로세스 메모리에만 반영되며 재시작 시 초기화됩니다. 데이터 fixture는 실제 발송이나 업스트림 변경을 수행하지 않으며, 미리보기 우회 외의 로그인 인증은 실제 서버를 사용합니다. 목록은 세션 결정에 따라 `page`·`size`·`totalElements`·`totalPages` 및 `sort`·`order`를 사용합니다. 상세·작성 응답의 도메인 필드명은 참조 서버 스펙을 유지합니다. 공지 정보성 알림은 서비스 동의자, 광고성은 광고 동의자 대상이며 KST 야간 안내를 제공합니다. 직접 작성하는 캠페인은 서버 계약에 따라 광고성 전용이며 정보성 선택은 공지 작성 경로를 안내합니다.

차트 분포 응답은 `points[].link { list, params }`를 사용하며 화면이 목록 URL을 조립합니다. 출석은 `daily[].attendance`로 조회합니다. AI 기능은 저장 값 4종으로 구분합니다. 회원 상세는 집계 필드만 반환하고 관계 목록은 별도 BFF에서 조회합니다. 게스트 소유 스토리의 owner와 제작 세션 없는 스토리의 supportingCharacterCount는 null입니다.

## 외부 도구

사이드바 하단의 ‘외부 도구’에서 Amplitude·OpenSearch 로그·Sentry·Langfuse·그로블을 새 탭으로 엽니다. 결제 목록·상세 머리에는 ‘그로블에서 보기’, 대시보드 Amplitude 지표 카드에는 ‘Amplitude에서 보기’를 제공합니다. URL은 `src/lib/external-links.ts`에 모으며 외부 링크는 noopener·noreferrer를 적용합니다. 그로블 링크는 사용자 확인을 마친 판매자 운영 현황으로 연결합니다. 현재 ADMIN analytics 계약에는 대시보드 URL 필드가 없어 Amplitude 프로젝트 상수를 사용합니다.
