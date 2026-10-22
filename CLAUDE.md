# 마냑 관리자 개발 지침

작업 시작 시 `../knk-harness/AGENTS.md`를 읽으세요. 이후에는 작업과 관련된 문서와 스킬만 확인하세요.

## 명령어와 검증

- `pnpm install`: 의존성 설치. package.json의 packageManager 버전을 사용한다.
- `pnpm dev`: 개발 서버, `pnpm build`: 프로덕션 빌드, `pnpm start`: 빌드 실행.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`: 코드·설정 변경 후 모두 통과시킨다.
- `pnpm format`: 소스 포맷, `pnpm api:generate`: 관리자 OpenAPI로 API 코드 생성.

## 구조와 스타일

- `src/app`은 App Router 페이지·레이아웃·route handler, `src/features`는 도메인 로직, `src/components`는 공용 UI, `src/lib`는 유틸, `src/api`는 API 계층이다.
- `@/` 별칭은 `src/`를 가리킨다. 파일명은 kebab-case, named export가 기본이며 App Router 규약 파일은 default export를 사용한다.
- shadcn Base UI와 cva 패턴을 사용한다. 조건부 클래스는 `@/lib/utils`의 `cn`으로 병합한다.
- Tailwind v4 토큰은 `src/app/globals.css`, 디자인 기준은 `docs/DESIGN.md`다. Pretendard와 시스템 모노 글꼴, 라이트 모드만 사용한다.
- React Compiler를 사용한다. 불필요한 `useMemo`·`useCallback`을 추가하지 않는다.
- 단위 테스트는 `tests/`에 소스 구조를 따라 `*.test.ts`로 작성한다.

## Orval과 BFF

- `src/api/generated/`는 직접 작성·수정하지 않는다. 전체 관리자 API는 `.env.local`의 서버 전용 `API_BASE_URL`을 설정하고 `pnpm api:generate`로 생성한다. 로그인은 서버에서 추출한 `docs/openapi/admin-auth.json`으로 `pnpm api:generate:auth`를 실행해 Zod를 생성한다. 생성 파일은 직접 수정하지 않는다.
- API 생성물이 준비되면 생성된 TanStack Query 훅을 사용한다. 현재 고정 데이터 화면은 `src/features/shared/use-api.ts`로 TanStack Query와 기존 mutator를 연결한다. mutator는 `src/api/mutator/custom-instance.ts`이며 응답은 `{ data, status, headers }`다. 생성 훅의 data는 2xx 응답만 담고, non-2xx 응답은 `FetchError`로 오류 채널에 전달된다.
- 브라우저는 manyak-server를 직접 호출하지 않고 동일 출처 Next route handler(`/api/...`)를 거친다. `API_BASE_URL`을 클라이언트에 노출하지 않는다.
- Google Identity Services의 ID token은 `/api/auth/login`을 거쳐 서버 관리자 로그인 API로 전달한다. 관리자 토큰은 호스트 전용 `__Host-manyak-admin` httpOnly·Secure·SameSite=Lax 쿠키에 저장한다. `src/proxy.ts`와 관리자 레이아웃이 보호하며 로그아웃·서버 401은 쿠키를 삭제한다.
- `ADMIN_DATA_SOURCE`는 기본 fixture이다. server 모드는 `src/proxy.ts`가 공통 `/api/admin-upstream/[...path]` route handler로 rewrite한다. 경로 매핑은 `src/api/admin-endpoints.ts`, 서버 호출은 `src/api/admin-upstream.ts`에 모은다. PR #353 기준 로그인 외 데이터 API는 503으로 거부한다. 구현 완료와 생성 Zod 검증이 확보된 엔드포인트만 활성화한다. `src/features/auth/preview.ts`의 단일 판정으로 fixture(빈 값 포함)이며 `VERCEL_ENV !== production`인 환경만 세션 없이 미리보기를 허용한다. 이때 닉네임은 미리보기이며 로그인·업스트림 요청도 서버를 호출하지 않는다. 운영은 ADMIN_DATA_SOURCE=server 필수이다. production에서 server가 아니면 모든 데이터 BFF를 503으로 차단하고 fixture 핸들러를 실행하지 않는다. 로그인은 실제 서버 인증을 유지한다.
- 관리자 토큰은 localStorage, sessionStorage, 클라이언트 상태 등 JS에서 읽을 수 있는 곳에 두지 않는다. 서버에서만 쿠키를 읽어 업스트림 인증을 처리한다. next-auth를 도입하지 않는다.

## 커밋

- 명시적인 요청 없이 커밋·push하지 않는다.
- 요청된 커밋은 `chore(KNK-1729): ...`처럼 작업 종류와 실제 Jira 키로 목적을 명확하게 쓴다. 이슈 키를 임의로 만들지 않는다.
- pre-commit에서 `pnpm lint-staged`로 ESLint·Prettier를 실행한다. 네 가지 검증을 통과한 뒤 커밋한다.

## Zod 검증

- BFF route handler(`src/app/api/**`)는 브라우저에서 받은 요청 본문과 쿼리를 manyak-server로 전달하기 전에 Zod로 검증한다. 검증에 실패하면 HTTP 400으로 응답한다.
- 서버 계약과 같은 스키마는 직접 작성하지 않고 Orval이 생성하는 `src/api/generated/zod/`의 스키마를 사용한다. 직접 작성하는 Zod 스키마는 화면 전용 폼 검증에만 사용한다.

## 주석 컨벤션

- 주석(JSDoc·인라인)은 '~(이)다' 평서형으로 작성합니다 (예: "…를 반환한다."). 존댓말(~합니다)과 명사형 종결 단편(~보정. / ~무시.)은 쓰지 않되, 첫 줄 명사구 요약(예: "…를 관리하는 훅.")은 허용합니다. `src/api/generated/`는 재생성 대상이므로 예외입니다.
