---
version: alpha
name: Vercel Analysis
description: Geist 기반 레이아웃·여백·Pretendard·회색 톤을 사용하는 마냑 관리자 디자인이다. 브랜드 색과 로고는 마냑을 따른다. 주요 버튼·링크·포커스·활성 메뉴는 마냑 초록을 사용한다.

colors:
  primary: '#01a76b'
  primary-text: '#017a4e'
  on-primary: '#ffffff'
  ink: '#171717'
  body: '#4d4d4d'
  mute: '#8f8f8f'
  faint: '#a1a1a1'
  hairline: '#ebebeb'
  hairline-soft: '#f2f2f2'
  canvas: '#fafafa'
  canvas-elevated: '#ffffff'
  link: '#017a4e'
  link-deep: '#01613e'
  link-soft: '#e6f6ef'
  chart-1: '#01a76b'
  chart-2: 'color-mix(in oklab, var(--primary) 80%, transparent)'
  chart-3: 'color-mix(in oklab, var(--primary) 60%, transparent)'
  chart-4: 'color-mix(in oklab, var(--primary) 40%, transparent)'
  chart-5: 'color-mix(in oklab, var(--primary) 20%, transparent)'
  error: '#ee0000'
  error-deep: '#c50000'
  warning: '#f5a623'
  warning-soft: '#ffefcf'
  warning-deep: '#ab570a'
  violet: '#7928ca'
  violet-soft: '#d8ccf1'
  cyan: '#50e3c2'
  cyan-soft: '#aaffec'
  pink: '#ff0080'
  magenta: '#eb367f'
  gradient-develop-start: '#007cf0'
  gradient-develop-end: '#00dfd8'
  gradient-preview-start: '#7928ca'
  gradient-preview-end: '#ff0080'
  gradient-ship-start: '#ff4d4d'
  gradient-ship-end: '#f9cb28'

typography:
  display-xl:
    fontFamily: Pretendard, Arial, sans-serif
    fontSize: 48px
    fontWeight: 600
    lineHeight: 48px
    letterSpacing: -2.4px
  heading-lg:
    fontFamily: Pretendard, Arial, sans-serif
    fontSize: 32px
    fontWeight: 600
    lineHeight: 40px
    letterSpacing: -1.28px
  heading-md:
    fontFamily: Pretendard, Arial, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: -0.4px
  label-sm:
    fontFamily: Pretendard, Arial, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: -0.28px
  mono-eyebrow:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, monospace
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0
  body-lg:
    fontFamily: Pretendard, Arial, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0
  body-md:
    fontFamily: Pretendard, Arial, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0
  body-sm:
    fontFamily: Pretendard, Arial, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0
  button-lg:
    fontFamily: Pretendard, Arial, sans-serif
    fontSize: 16px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0
  button-md:
    fontFamily: Pretendard, Arial, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0
  code:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, monospace
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0

rounded:
  none: 0px
  sm: 6px
  md: 12px
  lg: 16px
  pill-category: 64px
  pill: 100px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 40px
  3xl: 64px
  4xl: 96px
  section: 128px

components:
  nav-bar:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.body}'
    typography: '{typography.body-md}'
    borderColor: '{colors.hairline}'
    padding: '{spacing.sm} {spacing.lg}'
  nav-link:
    textColor: '{colors.body}'
    typography: '{typography.body-md}'
    rounded: '{rounded.full}'
    padding: '{spacing.xs} {spacing.sm}'
  button-primary:
    backgroundColor: '{colors.primary-text}'
    textColor: '{colors.on-primary}'
    typography: '{typography.button-lg}'
    rounded: '{rounded.pill}'
    padding: '0px 14px'
  button-secondary:
    backgroundColor: '{colors.canvas-elevated}'
    textColor: '{colors.ink}'
    typography: '{typography.button-lg}'
    rounded: '{rounded.pill}'
    padding: '0px 14px'
  button-primary-sm:
    backgroundColor: '{colors.primary-text}'
    textColor: '{colors.on-primary}'
    typography: '{typography.button-md}'
    rounded: '{rounded.sm}'
    padding: '0px 6px'
  button-ghost-sm:
    backgroundColor: '{colors.canvas-elevated}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    typography: '{typography.button-md}'
    rounded: '{rounded.sm}'
    padding: '0px 6px'
  button-category-pill:
    backgroundColor: '{colors.canvas-elevated}'
    textColor: '{colors.ink}'
    typography: '{typography.button-md}'
    rounded: '{rounded.pill-category}'
    padding: '0px 16px'
  button-icon-circular:
    backgroundColor: '{colors.canvas-elevated}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.full}'
    padding: '0px'
  text-input:
    backgroundColor: '{colors.canvas-elevated}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    typography: '{typography.body-md}'
    rounded: '{rounded.sm}'
    padding: '{spacing.xs} {spacing.sm}'
  feature-card:
    backgroundColor: '{colors.canvas-elevated}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    typography: '{typography.body-md}'
    rounded: '{rounded.md}'
    padding: '{spacing.lg}'
  feature-card-elevated:
    backgroundColor: '{colors.canvas-elevated}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    typography: '{typography.body-md}'
    rounded: '{rounded.md}'
    padding: '{spacing.lg}'
  pricing-card:
    backgroundColor: '{colors.canvas-elevated}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    typography: '{typography.body-md}'
    rounded: '{rounded.lg}'
    padding: '{spacing.xl}'
  code-block:
    backgroundColor: '{colors.canvas-elevated}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    typography: '{typography.code}'
    rounded: '{rounded.md}'
    padding: '{spacing.md}'
  logo-strip:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.mute}'
    typography: '{typography.body-md}'
    padding: '{spacing.xl} {spacing.lg}'
  hero-band:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.display-xl}'
    padding: '{spacing.section} {spacing.lg}'
  cta-band:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.display-xl}'
    padding: '{spacing.4xl} {spacing.lg}'
  footer:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.body}'
    typography: '{typography.body-md}'
    borderColor: '{colors.hairline}'
    padding: '{spacing.3xl} {spacing.lg}'
---

## Overview

브랜드 색과 로고는 마냑을 따른다. 레이아웃·여백·글꼴·회색 톤은 기존 Vercel Geist 분석을 유지한다. 본문과 제목은 near-black ink (`{colors.ink}` — #171717), 배경은 near-white canvas (`{colors.canvas}` — #fafafa), 카드와 입력은 hairline border를 사용한다. 로고·차트·아이콘·포커스에는 마냑 브랜드 초록 `{colors.primary}` (#01A76B)을 적용한다. CSS의 기준값은 마냑 웹과 같은 `oklch(0.6398 0.1458 159.17)`이다. 작은 링크·활성 메뉴 글자에는 `{colors.primary-text}` (#017A4E)를 쓰고, 주요 버튼과 현재 페이지는 이 짙은 초록 배경에 흰 글자를 사용한다.

### Brand assets

- 사이드바 상단과 로그인 화면은 웹과 같은 `ManyakLogo`만 사용한다. 사이드바 로고는 가로 가운데 정렬하고 상하 여백은 20px로 둔다. 로고 옆에 ‘관리자’ 텍스트나 배지를 덧붙이지 않는다. 로고는 manyak-web의 `src/components/layout/manyak-logo.tsx`를 그대로 복사한 `src/components/admin/manyak-logo.tsx`이며, 심볼과 도형 워드마크를 포함한 89×32 SVG다. 로고의 모든 선·면은 `currentColor`로 마냑 브랜드 초록을 따른다. ‘마냑’을 일반 텍스트로 대체하거나 원래 글꼴을 추정하지 않는다.
- SVG의 `role="img"`, `aria-label="마냑"`을 그대로 노출해 로고 이름은 ‘마냑’으로 한 번만 읽힌다. 조합용 wrapper·추가 접근성 이름·‘관리자’ 전용 타이포그래피는 사용하지 않는다. 문서 제목과 메타데이터의 ‘마냑 관리자’ 표기는 유지한다.
- 파비콘은 글자 없는 초록 심볼 그대로의 투명 배경을 사용한다. App Router의 `src/app/icon.svg`는 `public/logo/manyak-symbol-green.svg`와 같고, `src/app/favicon.ico`는 같은 심볼의 16·32·48px PNG 프레임으로 구성한다. 모든 ICO 프레임은 8비트 RGBA로 인코딩한다. PWA·Apple용 `public/icons/`와 layout 아이콘 메타데이터는 유지한다.
- 목록 표는 정렬 가능한 머리글 버튼과 현재 정렬 열의 방향 화살표·`aria-sort`를 사용한다. 목록 아래 중앙에는 이전·다음과 처음·끝·현재 주변 번호를 배치하며, 생략 구간은 …로 표시한다. 현재 페이지는 짙은 초록 배경·흰 글자와 `aria-current="page"`로 구분하고 경계 이동은 비활성화한다.
- 관리자 화면은 별도 상단 헤더 바나 워크스페이스 경로, 영문 eyebrow 표기를 두지 않는다. 사이드바 하단에 관리자 닉네임과 로그아웃을 표시한다. 비운영 fixture 미리보기에서는 닉네임을 ‘미리보기’로 표시하고 로그아웃 대신 작은 회색 글씨로 ‘고정 데이터 미리보기’를 표시한다. 페이지 제목 옆에는 환경 표시를 중복하지 않는다. 아래 영문 분석의 eyebrow 예시는 관리자 화면에 적용하지 않는다.
- 사이드바는 ‘대시보드·관리·알림’ 세 구역의 아코디언이다. 상위 버튼은 Hugeicons 아이콘·굵은 구역명·회전 화살표를 표시하고, 이동 없이 펼침만 바꾸며 `aria-expanded`와 `aria-controls`로 관계를 알린다. 하위 메뉴는 아이콘 없이 보통 굵기로 표시하고 들여쓰기·왼쪽 세로 안내선으로 묶는다. 현재 페이지 구역은 항상 펼치고 나머지 구역의 상태는 localStorage에 보존한다. 접힌 영역은 접근성 트리와 탭 이동에서 제외한다. 애니메이션은 150ms이며 reduced-motion에서는 끈다. 개요는 숫자 카드·일별 추이·Amplitude, 분석은 분포 차트를 담는다. 메뉴는 번호 없이 이름만 표시한다. 활성 항목은 연한 초록 배경(#E6F6EF)과 짙은 초록 전경(#017A4E)을 사용한다. 개요와 분석은 각각 활성 상태를 판별하며, 상세 화면에서는 해당 관리 메뉴를 활성화한다. 준비 중 화면은 제목과 설명 한 줄만 두고 큰 빈 카드를 배치하지 않는다.
- 닉네임 위의 ‘외부 도구’ 아코디언은 기존 메뉴와 같은 글자·포커스·들여쓰기·안내선을 사용한다. Amplitude·OpenSearch 로그·Sentry·Langfuse·그로블 링크에는 외부 링크 아이콘을 표시하고 새 탭에서 연다.

Typography does the heavy lifting. **Pretendard** sets the display headline in tightly-tracked weight-600 (the hero h1 runs -2.4px letter-spacing), and **system monospace (`ui-monospace, SFMono-Regular, Menlo, monospace`)** appears as small uppercase eyebrows labeling sections like a technical spec sheet. Buttons split into two shapes by context: the marketing CTAs are fully rounded brand-green **pills** (`{rounded.pill}` — 100px, "Start Deploying" / "Get a Demo"), while nav and in-app controls use a tight 6px square (`{rounded.sm}`, "Sign Up" / "Log In"). The contrast between the rounded marketing pill and the square app button is itself a deliberate signal of which surface you're on.

Surfaces barely lift. Cards are white (`{colors.canvas-elevated}`) on the #fafafa canvas, separated by a 1px hairline (`{colors.hairline}` — #ebebeb) and, at most, a whisper-soft layered shadow. Feature sections are built from precise grids of these hairline cards, often holding thin node-graph or code-editor illustrations rendered in the same ink-on-white palette. The page reads like documentation that happens to be selling something — engineered, exact, and with brand green reserved for actions and navigation.

**Key Characteristics:**

- A single near-black ink (`{colors.ink}`) carries headings, body, and borders on a near-white canvas (`{colors.canvas}`) — near-zero chromatic chrome.
- 마냑 초록은 주요 동작과 활성 상태에 사용하고, 차트는 마냑 초록을 주색으로 쓰고 비교 계열은 회색·점선으로 구분하며 성공률 경고에는 기존 경고색을 사용한다. 레거시 Vercel 그라디언트는 참고 자료로만 남기며 관리자 화면에 추가하지 않는다.
- Two button shapes by context: rounded brand-green **pills** (`{rounded.pill}`) for marketing CTAs, tight 6px squares (`{rounded.sm}`) for nav/app controls.
- Pretendard for tightly-tracked display type (`{typography.display-xl}` at -2.4px), system monospace (`ui-monospace, SFMono-Regular, Menlo, monospace`) for uppercase technical eyebrows (`{typography.mono-eyebrow}`).
- Hairline-bordered white cards (`{colors.hairline}` on `{colors.canvas-elevated}`) in precise grids; depth via 1px border + whisper shadow, never heavy elevation.
- The classic Vercel gradient trio (develop/preview/ship) survives as a named accent system: `{colors.gradient-develop-start}`→end, preview, ship.
- Color-block page rhythm: white hero with mesh gradient → logo strip → hairline feature-card grid → code-editor band → template cards → brand-green CTA band → grey footer.

## Colors

> Source pages analyzed: the home page, the AI Gateway page, the customers page, and the pricing page. The ink/canvas/hairline trio remains the layout reference. 마냑 관리자에서는 브랜드 색과 로고는 마냑을 따른다.

### Brand & Accent

- **Manyak Green** (`{colors.primary}` — #01A76B): 로고·차트·아이콘·포커스의 기준색이다. CSS에서는 `oklch(0.6398 0.1458 159.17)`을 사용한다. 흰색과 대비는 3.12:1이므로 작은 글자나 흰 글자의 버튼 배경에는 사용하지 않는다.
- **Text Green** (`{colors.primary-text}` / `{colors.link}` — #017A4E): 작은 링크와 활성 메뉴의 전경, 주요 버튼·현재 페이지의 배경이다. 흰색 대비 5.39:1, 연한 메뉴 배경 #E6F6EF 대비 4.82:1, 캔버스 #FAFAFA 대비 5.17:1로 일반 글자 기준 4.5:1을 만족한다. 대비는 WCAG sRGB 상대 휘도 식으로 계산한다.
- **Deep / Soft Green**: 링크·버튼 hover는 `{colors.link-deep}` (#01613E), 강조 배경은 `{colors.link-soft}` (#E6F6EF)이다.
- **Ink** (`{colors.ink}` — #171717): 제목과 가장 진한 본문에 사용한다. 주요 버튼과 로고의 색으로 사용하지 않는다.
- **Chart palette**: 주계열은 `--primary`의 마냑 초록, 비교 계열은 회색(`--muted-foreground`), 95% 미만 성공률은 경고색(`--warning-foreground`)을 사용한다. `--chart-1`은 primary 100%, `--chart-2`~`--chart-5`는 같은 초록의 80%·60%·40%·20% 투명도 단계다. 여러 계열은 범례·직접 라벨과 실선·점선으로도 구분한다. 축·라벨·툴팁·수치 목록으로 색상 외에도 지표를 구분한다.

### 관리자 차트

차트 형태는 서버의 `chartId`로 선택하며 응답과 집계 정의를 바꾸지 않는다. 단위가 다른 지표는 차트를 나누고 이중 y축은 쓰지 않는다. 단일 계열은 제목으로 식별하고, 비교 계열에는 범례와 직접 라벨을 표시한다. 모든 차트에 호버 툴팁을 제공하고 선에는 십자선을 표시한다. 막대·점·도넛 조각 클릭과 details 안 전체 수치 표의 링크는 기존 목록 이동을 유지한다. 데이터 전환 애니메이션은 꺼 reduced-motion에서도 움직임 없이 값을 읽을 수 있게 한다. 관리자는 라이트 모드만 사용한다.

| 위치 / chartId                    | 형태와 표시                                                                                                                    | 선택 이유                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 개요 요약 카드 8개                | 오늘·누적을 같은 크기로 나란히, 작은 최근 N일 합계·어제 줄, 오른쪽 선택 기간 스파크라인(축·격자 없음)                          | 상시 보는 오늘·누적과 선택 기간 합계·흐름 비교           |
| 개요 일별 추이                    | 2px 선, 호버 때만 점, 기간 평균 점선                                                                                           | 추이와 평균 대비 높낮이                                  |
| Amplitude                         | 활성(초록 실선)·신규(회색 점선) 2계열, 범례·끝점 라벨                                                                          | 같은 단위의 사용자 비교                                  |
| genre-depth                       | 장르별 평균 턴 수: 값 내림차순 상위 30개 세로 막대, 위 값 라벨·-40도 장르명·막대 수에 따른 최소 폭·가로 스크롤, 제외 개수 안내 | 순위 비교와 많은 장르명 읽기, 평균값이므로 파레토선 없음 |
| turns / member-chats / characters | 구간 순서 유지, 간격이 좁은 히스토그램                                                                                         | 분포 모양 비교                                           |
| started-as                        | 게스트·회원 도넛, 가운데 게스트 %, 조각 %·범례, 조각 사이 2px                                                                  | 두 범주의 부분과 전체 비교                               |
| first-message                     | 같은 초 축 위 P50·P75·P90 점 연결, 평균은 회색 마름모, 값 라벨                                                                 | 분포의 위치와 퍼짐 비교                                  |
| ai-latency                        | 값 내림차순 가로 막대                                                                                                          | 긴 기능명과 지연 비교                                    |
| ai-success                        | 0~100 미터·% 값, 95% 미만은 경고색·아이콘·문구                                                                                 | 한도 대비 성공률 확인                                    |

개요 기간 선택기는 페이지 상단에 둔다. 요약 카드의 오늘·누적은 summary 값을 유지하며, 최근 N일 합계와 오른쪽 스파크라인은 선택 기간 charts.daily를 따른다. 어제 값은 summary의 KST 오늘 시작 직전 날짜에 해당하는 일별 값이다. 모든 카드에 같은 구성을 사용하며 결제 금액은 원 단위 천 단위 구분으로 표시한다. 실제 0은 그대로 보여 주고, 아직 받지 못한 기간 값이나 없는 어제 값은 —로 표시한다.

알림 도달 차트는 기존 형태를 유지한다.

### Surface

- **Canvas** (`{colors.canvas}` — #fafafa): the default page background — the near-white sheet everything sits on.
- **Elevated** (`{colors.canvas-elevated}` — #ffffff): pure white for cards, buttons, inputs, and code blocks lifted off the canvas.
- **Hairline-Soft Surface** (`{colors.hairline-soft}` — #f2f2f2): the faintest grey fill for subtle alternating panels and inset wells.

### Text

- **Ink** (`{colors.ink}` — #171717): primary headings and high-emphasis text.
- **Body** (`{colors.body}` — #4d4d4d): standard paragraph and secondary copy, nav links.
- **Mute** (`{colors.mute}` — #8f8f8f): lower-emphasis captions, logo-strip labels, metadata.
- **Faint** (`{colors.faint}` — #a1a1a1): the lowest tier — placeholders, disabled labels.

### Borders

- **Hairline** (`{colors.hairline}` — #ebebeb): the 1px border on every card, input, and divider — the structural workhorse of the system.

### Semantic

- **Error** (`{colors.error}` — #ee0000): validation / destructive, with a deep press tier `{colors.error-deep}` (#c50000).
- **Warning** (`{colors.warning}` — #f5a623): caution states, with soft `{colors.warning-soft}` and deep `{colors.warning-deep}` tiers.
- **Success** maps to `{colors.primary}` (#01A76B) — 브랜드 초록을 긍정 상태에도 사용한다.

### Brand Gradient

다음은 원래 Vercel 분석의 참고 색이다. 마냑 관리자의 브랜드·버튼·메뉴·차트 팔레트에는 적용하지 않는다:

- **Develop**: `{colors.gradient-develop-start}` (#007cf0) → `{colors.gradient-develop-end}` (#00dfd8) — blue to cyan.
- **Preview**: `{colors.gradient-preview-start}` (#7928ca) → `{colors.gradient-preview-end}` (#ff0080) — violet to pink.
- **Ship**: `{colors.gradient-ship-start}` (#ff4d4d) → `{colors.gradient-ship-end}` (#f9cb28) — red to amber.
  These, blended together, form the hero's multi-stop mesh.

## Typography

### Font Family

The admin uses **Pretendard**, loaded locally with `next/font/local` and exposed as `--font-pretendard`, for all UI and prose (with `Arial, sans-serif` fallbacks). Code, technical tokens, and section eyebrows use the system monospace stack `ui-monospace, SFMono-Regular, Menlo, monospace`. No additional font is loaded.

### Hierarchy

| Token                       | Size | Weight | Line Height | Letter Spacing | Use                                                                                            |
| --------------------------- | ---- | ------ | ----------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `{typography.display-xl}`   | 48px | 600    | 48px        | -2.4px         | Hero headline                                                                                  |
| `{typography.heading-lg}`   | 32px | 600    | 40px        | -1.28px        | Major section headings                                                                         |
| `{typography.heading-md}`   | 20px | 600    | 28px        | -0.4px         | Sub-section / card headings                                                                    |
| `{typography.label-sm}`     | 14px | 500    | 20px        | -0.28px        | Strong labels, nav emphasis                                                                    |
| `{typography.mono-eyebrow}` | 12px | 500    | 16px        | 0              | Uppercase system monospace (`ui-monospace, SFMono-Regular, Menlo, monospace`) section eyebrows |
| `{typography.body-lg}`      | 16px | 400    | 24px        | 0              | Lead paragraphs, large body                                                                    |
| `{typography.body-md}`      | 14px | 400    | 20px        | 0              | Default body, nav links, table cells                                                           |
| `{typography.body-sm}`      | 12px | 400    | 16px        | 0              | Captions, footnotes, metadata                                                                  |
| `{typography.button-lg}`    | 16px | 500    | 20px        | 0              | Marketing pill button labels                                                                   |
| `{typography.button-md}`    | 14px | 500    | 20px        | 0              | Nav / app button labels                                                                        |
| `{typography.code}`         | 14px | 400    | 20px        | 0              | Code blocks, inline code (system monospace (`ui-monospace, SFMono-Regular, Menlo, monospace`)) |

### Principles

- Display type is defined by tight negative tracking — the larger the heading, the tighter (-2.4px at hero scale, -1.28px at section scale). Body type sits at neutral spacing.
- Weight is binary: 600 for headings and 500 for buttons/labels; everything else is 400. There is no light or black weight, and no italic.
- system monospace (`ui-monospace, SFMono-Regular, Menlo, monospace`) is reserved for two roles only — code, and the small uppercase eyebrow labels that introduce sections like spec-sheet headers.

### Note on Font Fallbacks

Pretendard is bundled locally. If it cannot load, UI text falls back to `Arial, sans-serif`; code and technical labels use `ui-monospace, SFMono-Regular, Menlo, monospace`.

## Layout

### Spacing System

- **Base unit**: 4px. The scale steps 4 → 8 → 12 → 16 → 24 → 32 → 40 → 64 → 96 → 128px.
- **Tokens**: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.2xl}` 40px · `{spacing.3xl}` 64px · `{spacing.4xl}` 96px · `{spacing.section}` 128px.
- **Card interiors** sit at `{spacing.lg}`–`{spacing.xl}` (24–32px); **section bands** run `{spacing.4xl}`–`{spacing.section}` (96–128px) of vertical rhythm.
- **Button padding** is horizontal-only — marketing pills run `0px 14px`, nav buttons `0px 6px` — with height set by line-height rather than vertical padding.

### Grid & Container

- Centered max-width container (~1200px) with comfortable gutters; the hero and CTA bands center their content.
- Feature sections use 2-up, 3-up, and 4-up hairline-card grids that collapse toward 1-up on narrow widths.
- The pricing page uses a multi-column tier grid; the customers page a logo / case-study grid.

### Whitespace Philosophy

Whitespace is structural. The near-white canvas and generous section padding do the separating work; cards are grouped by thin hairlines rather than heavy backgrounds. The page breathes — large vertical gaps between bands, tight internal rhythm inside cards.

### Responsive Strategy

#### Breakpoints

| Name    | Width   | Key Changes                                                                              |
| ------- | ------- | ---------------------------------------------------------------------------------------- |
| Mobile  | ≤ 640px | Single-column stacks; nav → menu trigger; hero type scales down; pill CTAs go full-width |
| Tablet  | 768px   | 2-up card grids; condensed nav                                                           |
| Laptop  | 1024px  | 3–4-up grids; full nav row                                                               |
| Desktop | 1200px+ | Centered max-width container, full multi-column grids                                    |

#### Touch Targets

Marketing pill CTAs (`{components.button-primary}`) and nav buttons clear the 44px WCAG-AAA target via line-height-driven height. Circular icon buttons (`{components.button-icon-circular}`) keep adequate hit area.

#### Collapsing Strategy

The nav row collapses behind a menu trigger; multi-column hairline-card grids reflow to a single column; code-editor and node-graph illustrations scale or scroll rather than shrink illegibly; the pricing tier grid stacks vertically.

#### Image Behavior

The hero mesh gradient is a CSS/SVG composition that scales fluidly. Feature illustrations (node graphs, code editors) are vector/HTML, ink-on-white, scaling crisply. Customer logos sit in a greyscale strip. No heavy raster photography.

## Elevation & Depth

| Level        | Treatment                                                                                  | Use                                                 |
| ------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| 0 — Flat     | 1px hairline (`{colors.hairline}`), no shadow                                              | Default feature cards, inputs, dividers, the canvas |
| 1 — Whisper  | Border + `0px 1px 1px rgba(0,0,0,0.04)` micro-shadow                                       | Lightly-raised cards                                |
| 2 — Floating | Layered soft shadow (`0px 2px 2px` + `0px 8px 16px -4px` low-alpha black) + inset hairline | Menus, modals, tooltips                             |

Depth is deliberately minimal. The system prefers a crisp 1px hairline plus the near-white-on-white surface step to a shadow; when a surface floats, it uses a finely-layered, very-low-alpha shadow stack rather than a single heavy drop.

### Decorative Depth

The hero **mesh gradient** is the only atmospheric element — a soft multi-stop bloom of the brand accent colors against the white canvas. Feature illustrations (ink node-graphs, code editors) add a sense of product depth without color. No glows, no heavy gradients elsewhere.

## Shapes

### Border Radius Scale

| Token                     | Value  | Use                                             |
| ------------------------- | ------ | ----------------------------------------------- |
| `{rounded.none}`          | 0px    | Full-bleed bands, dividers                      |
| `{rounded.sm}`            | 6px    | Nav / app buttons, inputs                       |
| `{rounded.md}`            | 12px   | Feature cards, code blocks                      |
| `{rounded.lg}`            | 16px   | Pricing cards, larger panels                    |
| `{rounded.pill-category}` | 64px   | Category-tab pills (AI Apps / Web Apps)         |
| `{rounded.pill}`          | 100px  | Marketing CTA pills                             |
| `{rounded.full}`          | 9999px | Circular icon buttons, avatars, nav ghost links |

The radius language is bimodal: tight 6px squares for functional chrome, full pills for marketing CTAs and category tabs, with 12–16px on content cards in between.

### Geometry

Cards are rectangles at 12–16px radius; marketing buttons and category tabs are full pills; icon buttons and avatars are circular. Illustrations are line-weight vector graphics in ink on white.

## Components

> No hover states are documented. Each spec covers Default and (where extracted) pressed/active states. Variants live as separate `components:` entries.

### Navigation

**`nav-bar`** — top navigation

- Background `{colors.canvas}`, bottom hairline `{colors.hairline}`, text `{colors.body}`, type `{typography.body-md}`, padding `{spacing.sm} {spacing.lg}`. Uses only the shared Manyak SVG logo with its 마냑 accessible name and the existing navigation spacing.

**`nav-link`** — individual nav item

- Body-grey text `{colors.body}`, type `{typography.body-md}`, fully rounded hit area `{rounded.full}`, padding `{spacing.xs} {spacing.sm}`. Transparent until interacted.

### Buttons

**`button-primary`** — the brand-green marketing pill ("Start Deploying", "Deploy")

- Background `{colors.primary-text}`, text `{colors.on-primary}`, type `{typography.button-lg}`, fully rounded `{rounded.pill}` (100px), padding `0px 14px`.

**`button-secondary`** — the white marketing pill ("Get a Demo")

- Background `{colors.canvas-elevated}`, text `{colors.ink}`, type `{typography.button-lg}`, rounded `{rounded.pill}`, padding `0px 14px`. Same pill shape as primary, inverted fill.

**`button-primary-sm`** — the compact brand-green nav CTA ("Sign Up")

- Background `{colors.primary-text}`, text `{colors.on-primary}`, type `{typography.button-md}`, tight square `{rounded.sm}` (6px), padding `0px 6px`.

**`button-ghost-sm`** — the white nav/app button ("Log In", "Ask AI")

- Background `{colors.canvas-elevated}`, text `{colors.ink}`, 1px hairline `{colors.hairline}`, type `{typography.button-md}`, rounded `{rounded.sm}`, padding `0px 6px`.

**`button-category-pill`** — the category-tab pill ("AI Apps", "Web Apps", "Ecommerce")

- Background `{colors.canvas-elevated}`, text `{colors.ink}`, type `{typography.button-md}`, rounded `{rounded.pill-category}` (64px), padding `0px 16px`.

**`button-icon-circular`** — circular icon / carousel control

- Background `{colors.canvas-elevated}`, text `{colors.ink}`, 1px hairline `{colors.hairline}`, type `{typography.body-lg}`, rounded `{rounded.full}`, no padding.

### Inputs & Forms

회원·스토리·오리지널·채팅방·결제·공지·감사 로그·캠페인 목록은 검색과 필터를 한 카드·한 폼에 둔다. 검색 입력은 첫 칸에서 가장 넓게 배치하고 안내는 placeholder로 제공한다. Enter와 적용 버튼은 작성 중인 q와 필터를 함께 제출하고 페이지를 1로 돌린다. 초기화는 전체 쿼리를 비운다. 기본 버튼·입력·select 높이는 36px이며 좌우 여백은 버튼 12px, 입력 10px이다. 사이드바 구역 버튼은 데스크톱에서 36px, 모바일에서 44px 터치 높이를 유지한다. 결과가 없으면 검색어와 지우기 동작을 표 안에 표시한다. 회원 상세 거래·출석 표도 각각 독립적인 숫자 페이지를 사용하며, 거래는 시각·사유·변동 이프·거래 후 잔액만 표시한다.

**`text-input`** — default form field

- Background `{colors.canvas-elevated}`, ink text `{colors.ink}`, 1px hairline `{colors.hairline}`, type `{typography.body-md}`, rounded `{rounded.sm}`, padding `{spacing.xs} {spacing.sm}`.

### Cards & Containers

**`feature-card`** — flat hairline content card

- Background `{colors.canvas-elevated}`, 1px hairline `{colors.hairline}`, ink text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.md}`, padding `{spacing.lg}`. The workhorse grid tile, often holding a node-graph or code illustration.

**`feature-card-elevated`** — lifted card variant

- Same chrome as `feature-card` with the Level-2 floating shadow for menus / featured tiles.

**`pricing-card`** — pricing tier card

- Background `{colors.canvas-elevated}`, 1px hairline `{colors.hairline}`, ink text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.lg}`, padding `{spacing.xl}`.

**`code-block`** — code / terminal surface

- Background `{colors.canvas-elevated}`, ink text `{colors.ink}`, 1px hairline `{colors.hairline}`, monospace `{typography.code}`, rounded `{rounded.md}`, padding `{spacing.md}`. Syntax rendered in the ink-and-accent palette.

### Bands

**`logo-strip`** — customer logo band

- Background `{colors.canvas}`, mute text `{colors.mute}`, type `{typography.body-md}`, padding `{spacing.xl} {spacing.lg}`. A greyscale row of customer wordmarks.

**`hero-band`** — full-width hero section

- Background `{colors.canvas}` with the mesh gradient, ink text `{colors.ink}`, display type `{typography.display-xl}`, padding `{spacing.section} {spacing.lg}`.

**`cta-band`** — end-of-page call-to-action band ("Start Deploying")

- Background `{colors.canvas}`, ink text `{colors.ink}`, display type `{typography.display-xl}`, padding `{spacing.4xl} {spacing.lg}`, with a `{components.button-primary}` pill.

### Footer

**`footer`** — site footer

- Background `{colors.canvas}`, top hairline `{colors.hairline}`, body-grey text `{colors.body}`, type `{typography.body-md}`, padding `{spacing.3xl} {spacing.lg}`. Multi-column link groups under the wordmark.

## Do's and Don'ts

### Do

- Keep the canvas near-white (`{colors.canvas}`) and let near-black ink (`{colors.ink}`) carry headings and borders. Use Manyak Green for primary CTAs.
- 브랜드 색과 로고는 마냑을 따른다. 주요 동작·링크·포커스·활성 메뉴는 초록, 차트는 초록 주계열과 회색 비교 계열을 사용하고 성공률 경고는 경고색·아이콘·문구로 함께 표시한다.
- Use the two button shapes by context: brand-green pill (`{components.button-primary}`) for marketing CTAs, 6px square (`{components.button-primary-sm}`) for nav/app.
- Define cards and inputs with a 1px hairline (`{colors.hairline}`) before any shadow — flat is the default.
- Set display headings in Pretendard 600 with tight negative tracking; label sections with uppercase system monospace (`ui-monospace, SFMono-Regular, Menlo, monospace`) eyebrows (`{typography.mono-eyebrow}`).
- Step the grey text ladder deliberately: `{colors.ink}` → `{colors.body}` → `{colors.mute}` → `{colors.faint}`.

### Don't

- Don't fill large surfaces with the accent colors — violet/cyan/pink/blue live in the gradient and illustrations, not as chrome.
- Don't mix the button shapes within one context — marketing CTAs stay pills, app/nav controls stay 6px squares.
- Don't pile on shadows — depth is a 1px hairline plus, at most, a finely-layered low-alpha shadow stack.
- Don't set body copy in pure black (`#000000`) — the brand's ink is #171717 and body steps to `{colors.body}`.
- Don't add a second decorative system — the mesh gradient is the only flourish; everything else is ink on white.
- Don't loosen the display tracking — large Pretendard headings carry tight negative letter-spacing by design.
