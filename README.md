# 마냑 관리자

마냑 서비스의 운영 현황을 확인하는 Next.js App Router 관리자 화면입니다. 대시보드와 스토리·회원·결제·채팅방 목록 및 상세를 제공합니다. 현재 BFF는 `src/fixtures/`의 가상 고정 데이터를 반환합니다. 로그인은 UI만 제공하며 회원 변경 작업은 확인 다이얼로그까지 구현했습니다.

## 실행

Node.js 22 이상과 `package.json`에 지정된 pnpm 12.5.1을 사용합니다.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

개발 서버는 http://localhost:3000 에서 실행됩니다. 현재 화면은 환경 변수 없이도 실행·빌드할 수 있습니다.

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

## API와 인증 준비

`.env.example`에는 값이 없는 서버 전용 키 `API_BASE_URL`만 정의합니다. 관리자 API가 준비되면 `.env.local`에 서버 주소를 설정하고 실행합니다.

```bash
pnpm api:generate
```

Orval은 `/v3/api-docs`에서 TanStack Query 클라이언트와 Zod 스키마를 `src/api/generated/`에 생성합니다. 초기 구성에는 생성물이 없으며 서버 스펙이 없으므로 지금 생성하지 않습니다.

브라우저 요청은 Next route handler를 거치는 BFF 구조를 사용합니다. 향후 구글 id token을 관리자 로그인 API에 전달하고 받은 관리자 토큰을 httpOnly 쿠키에 저장합니다. 토큰을 JS에서 읽을 수 있는 저장소에 보관하지 않습니다. 현재 `/api/dashboard/{summary,charts}`, `/api/{stories,members,payments,chats}`와 각 `/{id}` route handler는 고정 데이터를 반환합니다. 인증과 서버 전달은 다음 작업에서 구현합니다. 서버 전달 전에는 Orval 생성 Zod 스키마로 요청을 검증해야 합니다. 기존 조회 화면은 고정 데이터 조회 조건을 검사하고, 오리지널 fixture 쓰기는 화면 전용 Zod 폼 검증을 재사용합니다. 직접 작성한 서버 계약 생성 스키마는 없습니다.

## 화면과 데이터 경계

- `/dashboard`(개요): KST 기준 DB 숫자 카드와 7·30·90일 추이. 별도 Amplitude 영역에 오늘 활성 사용자와 DAU·신규 사용자 추이를 제공하며 같은 기간을 사용합니다. Amplitude 조회 실패는 해당 영역의 재시도로 처리합니다. 모든 차트는 마냑 초록을 사용합니다. 일별 수치 목록에서도 키보드로 필터가 적용된 목록에 이동할 수 있습니다.
- `/dashboard/analytics`(분석): 7·30·90일 이용 분포 9종과 관련 목록 이동을 제공합니다. 개요의 숫자 카드·일별 추이·Amplitude 영역은 포함하지 않습니다.
- `/`는 기존 기간·지표 등 쿼리를 유지해 `/dashboard`로 이동하고, `/campaigns`는 `/notifications/campaigns`로 이동합니다.
- `/stories`, `/members`, `/payments`, `/chats`: URL 쿼리 필터와 정렬, `items`·`page`·`size`·`totalElements`·`totalPages` 숫자 페이지(1부터, 기본 20건, 크기 1~100), `/{id}` 상세 연결을 제공합니다.
- `/login`: Google 로그인 버튼 UI입니다.
- `/originals`, `/originals/new`, `/originals/{id}`, `/originals/{id}/edit`: 공식 계정 마냑의 오리지널 목록·작성·미리보기·수정 화면입니다. 초안 저장과 공개, 공개 상태 전환 확인, 표지·인물 이미지 미리보기·교체·제거를 제공합니다.
- `/notices`, `/audit-logs`, `/notifications/campaigns`, `/notifications/stats`, `/notifications/templates`: 제목과 설명 한 줄만 제공하는 준비 중 화면입니다.
- 사이드바는 대시보드(개요·분석), 관리(회원·스토리·오리지널·채팅방·결제·공지·감사 로그), 알림(캠페인·발송 통계·문구 템플릿) 세 구역입니다. 구역 버튼은 아이콘·굵은 글씨·화살표로 접고 펼치며 현재 경로의 구역은 항상 펼칩니다. 나머지 상태는 `manyak-admin:sidebar:v1` localStorage에 기억합니다. 하위 메뉴는 세로 안내선으로 묶고 목록과 상세에서 해당 메뉴를 활성 표시합니다.
- 응답 타입은 `src/features/<도메인>/types.ts`에 있습니다. 차트와 목록·상세의 화면 BFF 응답을 타입으로 정의했습니다. 대시보드 숫자 카드는 회원·채팅 시작·턴·스토리·이프 지급·소진·결제 이력·금액의 8개이며 각각 누적과 오늘 값을 제공합니다.
- API 생성물이 없는 동안 `src/features/shared/use-api.ts`가 TanStack Query와 기존 mutator를 연결합니다. 서버 계약 확정 후 생성 훅으로 대체할 수 있으며 화면 응답 구조는 BFF에서 맞춥니다.
- 가상 이메일 `member1@example.com`부터 `member1240@example.com`까지 정확 일치 검색이 가능합니다. 응답에는 이메일을 포함하지 않습니다. 대화 원문과 인증 토큰도 응답에 없습니다.
- 목록의 `from`, `to`는 KST 날짜로 생성·가입·결제 완료·채팅 시작일에 적용합니다. `attendanceDate`, `creditDate`, `turnDate`는 관련 활동일 필터입니다. 이프는 `creditDirection=granted|spent`로 방향과 ADMIN 2-4의 사유를 함께 검사하며, 회원 목록과 상세는 회원별 원장을 공유합니다. `chatFrom/chatTo`, `aiFrom/aiTo`, `creationFrom/creationTo`는 각각 채팅 생성일·AI 호출일·제작 세션 생성일 기준입니다. 숫자 카드와 추이·분포는 목록과 같은 고정 원천을 집계합니다. 회원의 `chatCount`는 전체 채팅방 수이며 `periodChatCount`는 선택 기간에 생성한 수입니다.
- 분포의 정의는 Grafana `service-stats`를 기준으로 합니다. 첫 사용자 입력 시간은 900초 이내, 입력 인물 수는 주변 인물만, AI 지연은 성공 호출만, 성공률은 완료 호출만 집계합니다. 결제 건수와 금액은 환불을 포함한 완료 이력 주문을 집계하고 같은 목록으로 이동합니다. 실제 DB 집계와 팀 계정 제외는 서버 연동 단계에서 구현합니다.

Amplitude BFF `/api/dashboard/analytics?days=7|30|90`는 `src/fixtures/analytics.ts`의 가상 집계를 반환합니다. 타입은 `DashboardAnalytics`이며 `asOf/from/to/todayActiveUsers/daily`를 제공합니다. 외부 Amplitude에 직접 연결하지 않으며, 화면의 출처 도움말은 집계 지연과 팀 계정 제외 기준을 설명합니다.

목록 머리글 정렬은 `sort=<열 키>&order=asc|desc`를 사용합니다. 허용 열은 `src/features/shared/list-config.ts`의 `listSorts`를 따르며, 기본은 생성·가입·완료·시작 시각 내림차순입니다. 전체 필터 결과를 정렬한 뒤 페이지를 나누고, 동률은 공개 식별자 오름차순으로 고정합니다. 환불 시각이 없는 주문은 방향과 무관하게 뒤에 둡니다. 범위 밖 페이지는 빈 `items`와 실제 총 페이지 수를 반환하고, 잘못된 page·size·sort·order는 400입니다. 이전 cursor·limit 요청은 지원하지 않습니다.

상세 화면의 스토리·결제·채팅방 하위 목록도 같은 목록 BFF를 관계 필터와 함께 호출합니다. 서로 다른 하위 목록의 페이지·크기·정렬은 URL에서 `chatsPage/chatsSize/chatsSort/chatsOrder`처럼 목록 이름을 앞에 붙여 독립적으로 보존합니다. BFF에 보낼 때는 표준 `page/size/sort/order`로 변환합니다. 이 숫자 페이지 계약은 사용자 지시로 변경한 현재 화면 BFF 계약이며, 읽기 전용 ADMIN 서버 스펙의 커서 계약과는 서버 연동 시 조율이 필요합니다.

오리지널 화면은 `src/features/originals/types.ts`와 화면 전용 Zod 폼 스키마를 사용합니다. 서버의 일반 제작·수정 필드명을 유지하며, 장르 태그는 서버 V91 카탈로그의 정식 이름을 사용합니다. BFF는 프로세스 메모리의 fixture로 초안·발행·수정·이미지 업로드를 흉내 냅니다. 재시작·프로세스 변경 시 저장한 내용과 이미지는 사라집니다. 실제 서버 연결·스토리지 업로드·검수는 수행하지 않습니다. 요청/응답과 서버 연동 차이는 [오리지널 화면 데이터 경계](docs/ORIGINALS.md)에 있습니다. 상세의 ‘홍보 알림 만들기’는 `/notifications/campaigns/new?storyId=<id>`의 준비 중 안내로 연결합니다.

관리 목록 5종(회원·스토리·오리지널·채팅방·결제)은 공통 검색창의 300ms 디바운스로 `q`를 갱신하고 page=1로 복귀합니다. 검색과 필터·정렬은 AND이며 전체 결과를 검색한 후 정렬·페이지 처리합니다. 앞뒤·연속 공백과 대소문자를 정리하며, 빈 검색은 해제, 50자 초과 및 중복 q는 400입니다. UUID와 회원 이메일은 정확 일치, 제목·닉네임은 지정한 대상의 부분 일치입니다.

회원 상세의 거래·출석은 `/api/members/{id}/transactions`와 `/attendance`에서 같은 숫자 페이지 계약으로 조회합니다. URL 상태는 `transactionsPage/transactionsSize`, `attendancePage/attendanceSize`로 분리합니다. 거래 원장은 시각·사유·금액·거래 후 잔액만 노출하며 내부 ID와 가상의 transactionId를 사용하지 않습니다. 결제 상품의 `if_5000` 등은 엔터티 ID가 아닌 코드이므로 `productCode`로 표시합니다.
