# 마냑 관리자 개발 지침

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

- `src/api/generated/`는 직접 작성·수정하지 않는다. 관리자 API 스펙이 준비된 뒤 `.env.local`의 서버 전용 `API_BASE_URL`을 설정하고 `pnpm api:generate`로 생성한다. 지금은 생성물이 없다.
- API 호출은 생성된 TanStack Query 훅을 사용한다. mutator는 `src/api/mutator/custom-instance.ts`이며 응답은 `{ data, status, headers }`다. 응답 status를 확인한 뒤 data를 사용한다.
- 브라우저는 manyak-server를 직접 호출하지 않고 동일 출처 Next route handler(`/api/...`)를 거친다. `API_BASE_URL`을 클라이언트에 노출하지 않는다.
- 인증과 BFF route handler는 아직 구현하지 않았다. 추후 구글 id token을 서버의 관리자 로그인 API로 전달하고, 받은 관리자 토큰은 Next 서버가 httpOnly 쿠키에 저장한다.
- 관리자 토큰은 localStorage, sessionStorage, 클라이언트 상태 등 JS에서 읽을 수 있는 곳에 두지 않는다. 서버에서만 쿠키를 읽어 업스트림 인증을 처리한다. next-auth를 도입하지 않는다.

## 커밋

- 명시적인 요청 없이 커밋·push하지 않는다.
- 요청된 커밋은 `chore(KNK-1729): ...`처럼 작업 종류와 실제 Jira 키로 목적을 명확하게 쓴다. 이슈 키를 임의로 만들지 않는다.
- pre-commit에서 `pnpm lint-staged`로 ESLint·Prettier를 실행한다. 네 가지 검증을 통과한 뒤 커밋한다.

## Zod 검증

- BFF route handler(`src/app/api/**`)는 브라우저에서 받은 요청 본문과 쿼리를 manyak-server로 전달하기 전에 Zod로 검증한다. 검증에 실패하면 HTTP 400으로 응답한다.
- 서버 계약과 같은 스키마는 직접 작성하지 않고 Orval이 생성하는 `src/api/generated/zod/`의 스키마를 사용한다. 직접 작성하는 Zod 스키마는 화면 전용 폼 검증에만 사용한다.
