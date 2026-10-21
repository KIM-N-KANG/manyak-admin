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

브라우저 요청은 Next route handler를 거치는 BFF 구조를 사용합니다. 향후 구글 id token을 관리자 로그인 API에 전달하고 받은 관리자 토큰을 httpOnly 쿠키에 저장합니다. 토큰을 JS에서 읽을 수 있는 저장소에 보관하지 않습니다. 현재 `/api/dashboard/{summary,charts}`, `/api/{stories,members,payments,chats}`와 각 `/{id}` route handler는 고정 데이터를 반환합니다. 인증과 서버 전달은 다음 작업에서 구현합니다. 서버 전달 전에는 Orval 생성 Zod 스키마로 요청을 검증해야 합니다. 현재는 고정 데이터 조회 조건만 검사하며 직접 작성한 서버 계약 Zod 스키마는 없습니다.

## 화면과 데이터 경계

- `/`: KST 기준 숫자 카드, 7·30·90일 추이, 이용 분포 9종. 차트의 수치 목록에서도 키보드로 상세 목록에 이동할 수 있습니다.
- `/stories`, `/members`, `/payments`, `/chats`: URL 쿼리 필터와 정렬, `items` / `nextCursor` 커서 페이지(API 기본 50건, 화면은 12건 요청), `/{id}` 상세 연결을 제공합니다.
- `/login`: Google 로그인 버튼 UI, `/campaigns`, `/notices`, `/audit-logs`: 준비 중 화면입니다.
- 응답 타입은 `src/features/<도메인>/types.ts`에 있습니다. 회원·결제의 기존 계약 필드를 유지하고, 차트와 목록·상세 확장을 별도 타입으로 정의했습니다. 대시보드 숫자 카드는 회원·채팅 시작·턴·스토리·이프 지급·소진·결제 이력·금액의 8개이며 각각 누적과 오늘 값을 제공합니다.
- API 생성물이 없는 동안 `src/features/shared/use-api.ts`가 TanStack Query와 기존 mutator를 연결합니다. 서버 계약 확정 후 생성 훅으로 대체할 수 있으며 화면 응답 구조는 BFF에서 맞춥니다.
- 가상 이메일 `member1@example.com`부터 `member1240@example.com`까지 정확 일치 검색이 가능합니다. 응답에는 이메일을 포함하지 않습니다. 대화 원문과 인증 토큰도 응답에 없습니다.
- 목록의 `from`, `to`는 KST 날짜로 생성·가입·결제 완료·채팅 시작일에 적용합니다. `attendanceDate`, `creditDate`, `turnDate`는 관련 활동일 필터입니다. 이프는 `creditDirection=granted|spent`로 방향과 ADMIN 2-4의 사유를 함께 검사하며, 회원 목록과 상세는 회원별 원장을 공유합니다. `chatFrom/chatTo`, `aiFrom/aiTo`, `creationFrom/creationTo`는 각각 채팅 생성일·AI 호출일·제작 세션 생성일 기준입니다. 숫자 카드와 추이·분포는 목록과 같은 고정 원천을 집계합니다. 회원의 `chatCount`는 전체 채팅방 수이며 `periodChatCount`는 선택 기간에 생성한 수입니다.
- 분포의 정의는 Grafana `service-stats`를 기준으로 합니다. 첫 사용자 입력 시간은 900초 이내, 입력 인물 수는 주변 인물만, AI 지연은 성공 호출만, 성공률은 완료 호출만 집계합니다. 결제 건수와 금액은 환불을 포함한 완료 이력 주문을 집계하고 같은 목록으로 이동합니다. 실제 DB 집계와 팀 계정 제외는 서버 연동 단계에서 구현합니다.
