---
version: alpha
name: Vercel Analysis
description: Geist 기반 레이아웃·여백·Pretendard·회색 톤을 사용하는 마냑 관리자 디자인이다. 브랜드 색과 로고는 마냑을 따른다. 주요 버튼·링크·포커스·활성 메뉴는 마냑 초록을 사용한다.

colors:
  primary: '#01a76b'
  on-primary: '#ffffff'
  ink: '#171717'
  body: '#4d4d4d'
  mute: '#8f8f8f'
  faint: '#a1a1a1'
  hairline: '#ebebeb'
  hairline-soft: '#f2f2f2'
  canvas: '#fafafa'
  canvas-elevated: '#ffffff'
  link: '#01a76b'
  link-deep: '#017a4e'
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
    backgroundColor: '{colors.primary}'
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
    backgroundColor: '{colors.primary}'
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

브랜드 색과 로고는 마냑을 따른다. 레이아웃·여백·글꼴·회색 톤은 기존 Vercel Geist 분석을 유지한다. 본문과 제목은 near-black ink (`{colors.ink}` — #171717), 배경은 near-white canvas (`{colors.canvas}` — #fafafa), 카드와 입력은 hairline border를 사용한다. 주요 버튼·링크·포커스·활성 메뉴에는 마냑 브랜드 초록 `{colors.primary}` (#01A76B)을 적용한다. CSS의 기준값은 마냑 웹과 같은 `oklch(0.6398 0.1458 159.17)`이며 주요 버튼의 전경은 흰색이다.

### Brand assets

- 사이드바 상단과 로그인 화면은 웹과 같은 `ManyakLogo`만 사용한다. 로고 옆에 ‘관리자’ 텍스트나 배지를 덧붙이지 않는다. 로고는 manyak-web의 `src/components/layout/manyak-logo.tsx`를 그대로 복사한 `src/components/admin/manyak-logo.tsx`이며, 심볼과 도형 워드마크를 포함한 89×32 SVG다. 로고의 모든 선·면은 `currentColor`로 마냑 브랜드 초록을 따른다. ‘마냑’을 일반 텍스트로 대체하거나 원래 글꼴을 추정하지 않는다.
- SVG의 `role="img"`, `aria-label="마냑"`을 그대로 노출해 로고 이름은 ‘마냑’으로 한 번만 읽힌다. 조합용 wrapper·추가 접근성 이름·‘관리자’ 전용 타이포그래피는 사용하지 않는다. 문서 제목과 메타데이터의 ‘마냑 관리자’ 표기는 유지한다.
- 파비콘은 글자 없는 초록 심볼 그대로의 투명 배경을 사용한다. App Router의 `src/app/icon.svg`는 `public/logo/manyak-symbol-green.svg`와 같고, `src/app/favicon.ico`는 같은 심볼의 16·32·48px PNG 프레임으로 구성한다. 모든 ICO 프레임은 8비트 RGBA로 인코딩한다. PWA·Apple용 `public/icons/`와 layout 아이콘 메타데이터는 유지한다.
- 목록 표는 정렬 가능한 머리글 버튼과 현재 정렬 열의 방향 화살표·`aria-sort`를 사용한다. 목록 아래 중앙에는 이전·다음과 처음·끝·현재 주변 번호를 배치하며, 생략 구간은 …로 표시한다. 현재 페이지는 브랜드 초록과 `aria-current="page"`로 구분하고 경계 이동은 비활성화한다.
- 관리자 화면은 별도 상단 헤더 바나 워크스페이스 경로, 영문 eyebrow 표기를 두지 않는다. 사이드바 하단의 운영 표기와 로그인 링크도 두지 않는다. 데이터 화면의 ‘고정 데이터 미리보기’는 페이지 제목 옆에 작은 회색 글씨로 표시한다. 아래 영문 분석의 eyebrow 예시는 관리자 화면에 적용하지 않는다.
- 사이드바 메뉴는 번호 없이 이름만 표시한다. 활성 항목은 연한 초록 배경과 브랜드 초록 전경을 사용한다.

Typography does the heavy lifting. **Pretendard** sets the display headline in tightly-tracked weight-600 (the hero h1 runs -2.4px letter-spacing), and **system monospace (`ui-monospace, SFMono-Regular, Menlo, monospace`)** appears as small uppercase eyebrows labeling sections like a technical spec sheet. Buttons split into two shapes by context: the marketing CTAs are fully rounded brand-green **pills** (`{rounded.pill}` — 100px, "Start Deploying" / "Get a Demo"), while nav and in-app controls use a tight 6px square (`{rounded.sm}`, "Sign Up" / "Log In"). The contrast between the rounded marketing pill and the square app button is itself a deliberate signal of which surface you're on.

Surfaces barely lift. Cards are white (`{colors.canvas-elevated}`) on the #fafafa canvas, separated by a 1px hairline (`{colors.hairline}` — #ebebeb) and, at most, a whisper-soft layered shadow. Feature sections are built from precise grids of these hairline cards, often holding thin node-graph or code-editor illustrations rendered in the same ink-on-white palette. The page reads like documentation that happens to be selling something — engineered, exact, and with brand green reserved for actions and navigation.

**Key Characteristics:**

- A single near-black ink (`{colors.ink}`) carries headings, body, and borders on a near-white canvas (`{colors.canvas}`) — near-zero chromatic chrome.
- 마냑 초록은 주요 동작과 활성 상태에 사용하고, 차트는 마냑 초록 한 색으로 통일하며 같은 색의 명도·투명도·선 스타일로만 계열을 구분한다. 레거시 Vercel 그라디언트는 참고 자료로만 남기며 관리자 화면에 추가하지 않는다.
- Two button shapes by context: rounded brand-green **pills** (`{rounded.pill}`) for marketing CTAs, tight 6px squares (`{rounded.sm}`) for nav/app controls.
- Pretendard for tightly-tracked display type (`{typography.display-xl}` at -2.4px), system monospace (`ui-monospace, SFMono-Regular, Menlo, monospace`) for uppercase technical eyebrows (`{typography.mono-eyebrow}`).
- Hairline-bordered white cards (`{colors.hairline}` on `{colors.canvas-elevated}`) in precise grids; depth via 1px border + whisper shadow, never heavy elevation.
- The classic Vercel gradient trio (develop/preview/ship) survives as a named accent system: `{colors.gradient-develop-start}`→end, preview, ship.
- Color-block page rhythm: white hero with mesh gradient → logo strip → hairline feature-card grid → code-editor band → template cards → brand-green CTA band → grey footer.

## Colors

> Source pages analyzed: the home page, the AI Gateway page, the customers page, and the pricing page. The ink/canvas/hairline trio remains the layout reference. 마냑 관리자에서는 브랜드 색과 로고는 마냑을 따른다.

### Brand & Accent

- **Manyak Green** (`{colors.primary}` / `{colors.link}` — #01A76B): 주요 버튼·링크·포커스·활성 메뉴의 기준색이다. CSS에서는 `oklch(0.6398 0.1458 159.17)`을 사용하며 버튼 전경은 `{colors.on-primary}` (흰색)이다.
- **Deep / Soft Green**: 링크 hover는 `{colors.link-deep}` (#017A4E), 강조 배경은 `{colors.link-soft}` (#E6F6EF)이다.
- **Ink** (`{colors.ink}` — #171717): 제목과 가장 진한 본문에 사용한다. 주요 버튼과 로고의 색으로 사용하지 않는다.
- **Chart palette**: 모든 막대·선·영역은 `--primary`의 마냑 초록을 사용한다. `--chart-1`은 primary 100%, `--chart-2`~`--chart-5`는 같은 초록의 80%·60%·40%·20% 투명도 단계다. 한 차트에서 여러 계열이 필요하면 이 단계나 실선·점선만 사용하고 다른 색상은 쓰지 않는다. 축·라벨·툴팁·수치 목록으로 색상 외에도 지표를 구분한다.

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

- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button-lg}`, fully rounded `{rounded.pill}` (100px), padding `0px 14px`.

**`button-secondary`** — the white marketing pill ("Get a Demo")

- Background `{colors.canvas-elevated}`, text `{colors.ink}`, type `{typography.button-lg}`, rounded `{rounded.pill}`, padding `0px 14px`. Same pill shape as primary, inverted fill.

**`button-primary-sm`** — the compact brand-green nav CTA ("Sign Up")

- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button-md}`, tight square `{rounded.sm}` (6px), padding `0px 6px`.

**`button-ghost-sm`** — the white nav/app button ("Log In", "Ask AI")

- Background `{colors.canvas-elevated}`, text `{colors.ink}`, 1px hairline `{colors.hairline}`, type `{typography.button-md}`, rounded `{rounded.sm}`, padding `0px 6px`.

**`button-category-pill`** — the category-tab pill ("AI Apps", "Web Apps", "Ecommerce")

- Background `{colors.canvas-elevated}`, text `{colors.ink}`, type `{typography.button-md}`, rounded `{rounded.pill-category}` (64px), padding `0px 16px`.

**`button-icon-circular`** — circular icon / carousel control

- Background `{colors.canvas-elevated}`, text `{colors.ink}`, 1px hairline `{colors.hairline}`, type `{typography.body-lg}`, rounded `{rounded.full}`, no padding.

### Inputs & Forms

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
- 브랜드 색과 로고는 마냑을 따른다. 주요 동작·링크·포커스·활성 메뉴는 초록, 차트는 같은 초록의 투명도 단계와 선 스타일만 사용한다.
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
