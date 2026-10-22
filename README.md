# 마냑 관리자

관리자 화면을 만들기 위한 Next.js App Router 초기 구성입니다. 첫 화면은 디자인 토큰을 확인하는 버튼과 카드 예시이며, 로그인·관리자 기능·BFF route handler는 아직 없습니다.

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
- TanStack Query 프로바이더, sonner 토스트, Vitest 샘플 테스트
- ESLint·Prettier, husky pre-commit·lint-staged
- PR 및 dev push에서 lint·typecheck·test·build 실행, 배포는 Vercel에서 설정

```text
src/
  app/                  # 페이지, 루트 레이아웃, 전역 토큰
  assets/fonts/         # Pretendard Variable
  components/providers/ # TanStack Query 프로바이더
  components/ui/        # 버튼, 카드, 토스트
  features/             # 추후 관리자 도메인 로직
  lib/                  # cn, QueryClient
  api/mutator/          # Orval용 BFF fetch
tests/lib/              # 유틸 샘플 테스트
```

디자인 기준은 [docs/DESIGN.md](docs/DESIGN.md), 개발 규칙은 [AGENTS.md](AGENTS.md)와 [CLAUDE.md](CLAUDE.md)에 있습니다. 루트 메타데이터는 검색 엔진의 색인과 링크 추적을 비활성화합니다.

## API와 인증 준비

`.env.example`에는 값이 없는 서버 전용 키 `API_BASE_URL`만 정의합니다. 관리자 API가 준비되면 `.env.local`에 서버 주소를 설정하고 실행합니다.

```bash
pnpm api:generate
```

Orval은 `/v3/api-docs`에서 TanStack Query 클라이언트와 Zod 스키마를 `src/api/generated/`에 생성합니다. 초기 구성에는 생성물이 없으며 서버 스펙이 없으므로 지금 생성하지 않습니다.

브라우저 요청은 Next route handler를 거치는 BFF 구조를 사용합니다. 향후 구글 id token을 관리자 로그인 API에 전달하고 받은 관리자 토큰을 httpOnly 쿠키에 저장합니다. 토큰을 JS에서 읽을 수 있는 저장소에 보관하지 않습니다. 현재 mutator가 사용하는 `/api/...` route handler는 향후 API·인증 작업에서 구현합니다.
