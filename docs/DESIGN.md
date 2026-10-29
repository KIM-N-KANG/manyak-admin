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

- 사이드바 상단과 로그인 화면은 공용 `ManyakLogo`를 사용한다. 웹에서 가져온 마냑 심볼·워드마크 오른쪽에 학교안심 둥근미소 Bold로 변환한 ‘관리자’ SVG path를 배치한다. 마냑은 브랜드 초록, 관리자는 muted #4D4D4D를 사용하며 글자 높이·굵기와 기준선을 맞춘다. 전체는 174×32이고 사이드바 224px에서 좌우 25px, 상하 20px 여백을 유지한다. 런타임 폰트 요청은 없고 접근성 이름은 ‘마냑 관리자’다.
- SVG의 `role="img"`, `aria-label="마냑 관리자"`를 노출해 조합 로고 이름을 한 번만 읽힌다. 조합용 wrapper·추가 접근성 이름·‘관리자’ 전용 타이포그래피는 사용하지 않는다. 문서 제목과 메타데이터의 ‘마냑 관리자’ 표기는 유지한다.
- 파비콘은 글자 없는 초록 심볼 그대로의 투명 배경을 사용한다. App Router의 `src/app/icon.svg`는 `public/logo/manyak-symbol-green.svg`와 같고, `src/app/favicon.ico`는 같은 심볼의 16·32·48px PNG 프레임으로 구성한다. 모든 ICO 프레임은 8비트 RGBA로 인코딩한다. PWA·Apple용 `public/icons/`와 layout 아이콘 메타데이터는 유지한다.
- 목록 표는 정렬 가능한 머리글 버튼과 현재 정렬 열의 방향 화살표·`aria-sort`를 사용한다. 목록 아래 중앙에는 이전·다음과 처음·끝·현재 주변 번호를 배치하며, 생략 구간은 …로 표시한다. 현재 페이지는 짙은 초록 배경·흰 글자와 `aria-current="page"`로 구분하고 경계 이동은 비활성화한다.
- 페이지 머리는 제목과 작업 버튼·기간 선택기만 표시하고 제목 아래 소개 문장을 두지 않는다. 오류·빈 상태·기간 상한·알림 동의·위험 작업 확인 등 기능상 필요한 안내는 해당 영역에 유지한다. 오리지널의 계정·발행 상태·수정 시각은 본문 카드에 표시한다.
- 관리자 화면은 별도 상단 헤더 바나 워크스페이스 경로, 영문 eyebrow 표기를 두지 않는다. 사이드바 하단에 관리자 닉네임과 로그아웃을 표시한다. 비운영 fixture 미리보기에서는 닉네임을 ‘미리보기’로 표시하고 로그아웃 대신 작은 회색 글씨로 ‘고정 데이터 미리보기’를 표시한다. 페이지 제목 옆에는 환경 표시를 중복하지 않는다. 아래 영문 분석의 eyebrow 예시는 관리자 화면에 적용하지 않는다.
- 사이드바는 ‘대시보드·관리·알림’ 세 구역의 아코디언이다. 상위 버튼은 Hugeicons 아이콘·굵은 구역명·회전 화살표를 표시하고, 이동 없이 펼침만 바꾸며 `aria-expanded`와 `aria-controls`로 관계를 알린다. 하위 메뉴는 아이콘 없이 보통 굵기로 표시하고 들여쓰기·왼쪽 세로 안내선으로 묶는다. 현재 페이지 구역은 항상 펼치고 나머지 구역의 상태는 localStorage에 보존한다. 접힌 영역은 접근성 트리와 탭 이동에서 제외한다. 애니메이션은 150ms이며 reduced-motion에서는 끈다. 대시보드 구역은 개요, 성장, 스토리, 채팅, 결제, 운영 여섯 메뉴다. 개요는 숫자 카드 10개와 일별 추이를 담고 분포 카드는 스토리 제작, 채팅 참여, 운영 AI 품질에 나눈다. 메뉴는 번호 없이 이름만 표시한다. 활성 항목은 연한 초록 배경(#E6F6EF)과 짙은 초록 전경(#017A4E)을 사용한다. 개요는 정확한 경로, 그 밖의 메뉴는 자기 경로와 하위 경로로 활성 상태를 판별하며, 상세 화면에서는 해당 관리 메뉴를 활성화한다. 준비 중 화면은 제목과 설명 한 줄만 두고 큰 빈 카드를 배치하지 않는다.
- 닉네임 위의 ‘외부 도구’ 버튼은 작은 팝오버를 연다. 데스크톱(1024px 이상)은 버튼 오른쪽에서 아래쪽을 맞추고, 사이드바가 상단으로 바뀌는 모바일은 버튼 아래에서 왼쪽을 맞춘다. 화살표는 열림 여부와 무관하게 데스크톱에서 오른쪽(▸), 모바일에서 아래(▾)를 가리킨다. 열림 상태는 버튼의 활성 배경·전경색으로 표시한다. 팝오버는 224px 너비의 흰 카드·얇은 테두리·작은 그림자를 사용하고 화면 경계에서는 위치를 보정한다. Amplitude·OpenSearch Dashboards·OpenSearch UI·Sentry·Langfuse·Google Play Console·그로블 순서로 외부 링크 아이콘과 함께 표시하고 새 탭에서 연다. 바깥 클릭·Esc·버튼 재클릭으로 닫고 버튼으로 포커스를 돌려준다. `aria-expanded`와 `aria-controls`는 열림 상태와 팝오버 관계를 알린다. 닫힌 링크는 접근성 트리와 탭 이동에서 제외한다. 열고 닫을 때 불투명도와 4px 이동에 150ms 전환을 적용하며, reduced-motion에서는 전환과 이동을 끈다.

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

- **관리자 워드마크**: 사이드바와 로그인은 공용 `ManyakLogo`의 174×32 SVG를 사용한다. 마냑 로고 오른쪽에 학교안심 둥근미소 Bold의 ‘관리자’를 28px 기준 윤곽선(실제 글자 높이 약 25px, 기준선 y=24.5)으로 배치하고 `muted-foreground`를 적용한다. 런타임 폰트 요청 없이 SVG path로 표시하며 접근성 이름은 ‘마냑 관리자’다.
- **Manyak Green** (`{colors.primary}` — #01A76B): 로고·차트·아이콘·포커스의 기준색이다. CSS에서는 `oklch(0.6398 0.1458 159.17)`을 사용한다. 흰색과 대비는 3.12:1이므로 작은 글자나 흰 글자의 버튼 배경에는 사용하지 않는다.
- **Text Green** (`{colors.primary-text}` / `{colors.link}` — #017A4E): 작은 링크와 활성 메뉴의 전경, 주요 버튼·현재 페이지의 배경이다. 흰색 대비 5.39:1, 연한 메뉴 배경 #E6F6EF 대비 4.82:1, 캔버스 #FAFAFA 대비 5.17:1로 일반 글자 기준 4.5:1을 만족한다. 대비는 WCAG sRGB 상대 휘도 식으로 계산한다.
- **Deep / Soft Green**: 링크·버튼 hover는 `{colors.link-deep}` (#01613E), 강조 배경은 `{colors.link-soft}` (#E6F6EF)이다.
- **Ink** (`{colors.ink}` — #171717): 제목과 가장 진한 본문에 사용한다. 주요 버튼과 로고의 색으로 사용하지 않는다.
- **Chart palette**: 범주색 `--chart-1`~`--chart-5`는 #01A76B, #3B6FD4, #E07A1F, #8B5CD6, #D9467A이다. UI 강조색 제한과 별개로 차트에서만 이 범주색을 사용한다. 계열 개체마다 고정하고 값 순위로 색을 바꾸지 않는다. 주황은 흰 배경 대비 2.93:1이므로 끝 값 라벨과 수치 표를 함께 제공한다. 기준선은 muted 점선이며 계열은 범례와 실선·점선으로도 구분한다.

### 관리자 차트

차트 형태는 서버의 `chartId`로 선택하며 응답과 집계 정의를 바꾸지 않는다. 단위가 다른 지표는 차트를 나누고 이중 y축은 쓰지 않는다. 단일 계열은 제목으로 식별하고, 비교 계열에는 범례와 직접 라벨을 표시한다. 모든 차트에 호버 툴팁을 제공하고 선에는 십자선을 표시한다. 막대·도넛 조각·첫 입력 숫자 칸 클릭과 details 안 전체 수치 표의 링크는 기존 목록 이동을 유지한다. 데이터 전환 애니메이션은 꺼 reduced-motion에서도 움직임 없이 값을 읽을 수 있게 한다. 관리자는 라이트 모드만 사용한다.

| 위치 / chartId                    | 형태와 표시                                                                                                                                                                                      | 선택 이유                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 개요 요약 카드 10개               | 넓은 화면 2행 5열, DB 누적·오늘·기간 합계, 오늘 활성 사용자 합계, Play 누적·보고일 설치 수, 카드 안 차트 없음                                                                                    | 대표 숫자를 먼저 읽고 각 상세 화면으로 이동                     |
| 개요 DB 일별 추이 8개             | 넓은 화면 2행 4열 작은 선 그래프, 동일 날짜 범위·초록 단일 선·평균 점선·단일 y축·호버 툴팁·접힌 표                                                                                               | 지표 선택 없이 모든 DB 추이 비교                                |
| 사용자 활동 / Play 상세           | DAU·신규 방문자 상세는 사용자 활동 탭, 누적·활성 선과 설치·삭제 막대는 성장 앱 설치 탭                                                                                                           | 개요의 중복 차트 제거                                           |
| genre-depth                       | 장르별 평균 턴 수: 채팅 5개 이상만 응답 순서대로 상위 30개 세로 막대, 위 값 라벨·-40도 장르명·막대 수에 따른 최소 폭·가로 스크롤, 제외 개수 안내                                                 | 순위 비교와 많은 장르명 읽기, 평균값이므로 파레토선 없음        |
| turns / member-chats / characters | 구간 순서 유지, 간격이 좁은 히스토그램                                                                                                                                                           | 분포 모양 비교                                                  |
| started-as                        | 게스트·회원 도넛, 가운데 게스트 %, 조각 %, 조각 사이 2px, 도넛 아래 색 표시와 함께 게스트·회원 순서로 사용자 수·채팅 수 줄, 조각 툴팁에 비율·사용자 수·채팅 수, 수치 표에 비율·채팅 수·사용자 수 | 무엇의 비율인지와 사람 수·채팅 수를 함께 확인                   |
| first-message                     | 차트 대신 평균·P50·P75·P90 숫자 칸 4개(누르면 목록), 아래 0초~최댓값 가는 범위 막대에 P50~P90을 초록으로 칠하고 P75 세로선, 평균 chart-2 마름모, 카드는 내용 높이                                | 값 4개를 높은 차트에 그리면 찌그러져 숫자와 퍼짐을 바로 읽게 함 |
| creation-mode                     | 일반 제작·간편 제작 세로 막대, 턴 수 분포와 같은 히스토그램, 콘텐츠 구역에서 characters 앞                                                                                                       | 두 제작 방식의 스토리 수 비교                                   |
| ai-latency                        | 값 내림차순 가로 막대                                                                                                                                                                            | 긴 기능명과 지연 비교                                           |
| ai-success                        | 0~100 미터·% 값, 기능 고정 색, 95% 미만은 경고 아이콘·문구                                                                                                                                       | 한도 대비 성공률 확인                                           |

개요 기간 선택기는 페이지 상단에 둔다. 요약 카드 10개는 넓은 화면(xl 이상)에서 2행 5열, sm 이상에서 5행 2열, 작은 화면에서 1열로 표시한다. DB 카드 8개는 누적을 큰 대표 숫자, 오늘을 작은 보조 줄로 표시하고 선택 기간 합계는 charts.daily를 따른다. 카드에는 스파크라인과 어제 줄을 두지 않는다. 카드 아래에는 동일 기간의 DB 지표 8개를 작은 선 그래프로 표시한다. Amplitude와 Play는 카드에만 표시하고 상세 화면 링크로 연결한다. 결제 금액은 원 단위 천 단위 구분을 사용하고 실제 0은 0으로 표시한다. 선택 기간 값을 아직 받지 못했거나 실패하면 해당 상태를 표시한다.

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

회원·스토리·오리지널·채팅·결제·공지·감사 로그·캠페인 목록은 검색과 필터를 한 카드·한 폼에 둔다. 검색 입력은 첫 칸에서 가장 넓게 배치하고 안내는 placeholder로 제공한다. Enter와 적용 버튼은 작성 중인 q와 필터를 함께 제출하고 페이지를 1로 돌린다. 초기화는 전체 쿼리를 비운다. 기본 버튼·입력·select 높이는 36px이며 좌우 여백은 버튼 12px, 입력 10px이다. 사이드바 구역 버튼은 데스크톱에서 36px, 모바일에서 44px 터치 높이를 유지한다. 결과가 없으면 검색어와 지우기 동작을 표 안에 표시한다. 회원 상세 거래·출석 표도 각각 독립적인 숫자 페이지를 사용하며, 거래는 시각·사유·변동 이프·거래 후 잔액만 표시한다.

공지 작성은 제목 위에 태그 단일 선택을 두고 기본 선택 없이 시작한다. 공지사항(SERVICE), 업데이트(UPDATE), 점검(MAINTENANCE), 이벤트(EVENT), 홍보(PROMOTION) 순서이며 선택 전 저장은 비활성이다. 수정은 현재 태그를 선택하고, 목록 제목 앞과 상세 제목 옆에는 같은 중립 배지를 쓴다. 모르는 태그는 원문을 보존한다. 태그 도움말은 공용 HelpTooltip으로 제공한다. 게시는 알림 체크박스·유형 선택 없이 사유만 보내고, 알림 요청 이력 notifiedAt이 있으면 재게시해도 알림을 다시 요청하지 않는다는 확인 문구를 우선하고, 그 외에는 태그의 정보성·광고성에 맞는 확인 문구를 표시한다. 태그 도움말은 알림 내역에 표시되는 회원 범위와 설정·기기 조건에 따라 달라지는 푸시 발송을 구분한다. fixture도 태그로 캠페인 종류를 정하고 공지당 한 번만 알림을 요청한다. 공지 본문 아래 알림 묶음은 별도 제목(100자)·본문(300자)과 우측 하단 글자 수를 제공하며 공지 문구를 자동으로 채우지 않는다. 작성과 알림 요청 이력이 없는 수정에서는 두 문구가 모두 필요하다. 이력이 있으면 읽기 전용·잠김 안내를 제공하고 필수 검증과 PATCH에서 제외한다. null 문구인 기존 공지도 잠겼으면 다른 내용을 저장할 수 있고, 잠기지 않았으면 두 문구를 채워야 저장한다. 수정은 바뀐 필드와 사유만 보낸다. 알림 문구 도움말은 묶음 제목 옆 공용 HelpTooltip으로 제공하고 상세에는 별도 문구 또는 대시를 표시한다. fixture도 null 생략·형식 400·잠금 409 순서와 문구 없는 최초 게시 409를 유지하며 입력한 알림 문구로 캠페인을 만든다. 서버 계약 임시 보완은 OpenAPI의 x-contract-overlay로 표시하며 배포 후 실제 추출과 대조한다.

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

Google Play 설치 지표는 개요 요약 그리드의 앱 설치(Android) 카드로 표시한다. 누적 기기 설치 수를 대표 숫자로, 최신 보고일과 그날 기기 설치 수를 작은 줄에 표시한다. 날짜는 Play 원천의 태평양 날짜이며 반영 지연과 페이지 기간 미적용 기준은 물음표 도움말에 제공한다. 카드는 성장 앱 설치 탭으로 이동한다. 상세 탭의 누적 설치 계단선과 활성 기기 선은 단일 축·고정 범례·끝 수치·십자선 툴팁을 사용한다. 일별 설치는 0 위의 초록 막대, 삭제는 0 아래의 회색 막대이며 툴팁·표는 양수를 표시한다. 실패는 해당 카드·탭에 격리하고 503은 설치 지표 사용 불가와 재시도를 표시한다.

개요와 분석은 공용 기간 선택기를 사용한다. 기존 외부 도구 팝오버의 Base UI 포커스 처리와 150ms 전환 스타일을 재사용한다. 왼쪽에는 오늘·어제·최근 7/14/30/90일·이번 주·지난주·이번 달·지난달·최근 6개월·최근 1년 빠른 범위, 오른쪽에는 시작·끝 날짜와 적용 버튼을 둔다. KST 오늘까지 양끝 포함 최대 366일을 허용한다. 빠른 범위는 URL `range`로 저장해 방문 시 다시 계산하고, 직접 선택은 `from`·`to`로 저장한다. 기존 `days` 링크는 대응하는 빠른 범위로 변환한다. API에는 계산된 `from`·`to`만 보내며 요약 카드 기간 합계와 DB 차트가 함께 바뀐다. 오늘 활성 사용자 카드는 페이지 기간과 무관하게 KST 오늘 하루만 조회한다. 오늘·누적 수치는 summary를 유지한다.

개요의 오늘 활성 사용자 카드는 서버의 합계를 크게, 웹·앱를 보조 줄로 표시한다. 두 플랫폼을 더해 합계를 재계산하지 않으며 null은 세 값 모두 준비 중, 실제 0은 0으로 표시한다. Amplitude 일별 활성·신규 차트와 표는 개요에 두지 않고 카드 링크로 사용자 활동 탭에 이동한다. 준비 중 날짜가 있거나 오늘 값이 null이면 해당 Amplitude 쿼리만 60초마다 같은 범위로 다시 요청한다. 출처·팀 계정·플랫폼 집계 기준은 물음표 도움말에 제공한다.

### 관리자 웹 용어와 분석 구역

화면 계약은 하네스 `docs/domain/ADMIN/WEB/`를 따른다. 대시보드 메뉴는 개요, 성장, 스토리, 채팅, 결제, 운영 순서다. 경로는 `/dashboard`, `/analytics/growth`, `/analytics/stories`, `/analytics/chats`, `/analytics/payments`, `/analytics/ops`다. 관리 메뉴의 채팅 저장 단위는 ‘채팅’, 원장 메뉴는 ‘이프’, 화면 제목은 ‘이프 내역’이다. 원장 필터는 ‘이프 변동 유형’의 적립과 소모를 사용하며 관리자 직접 작업의 지급과 회수 이름은 유지한다. 사유 이름은 `src/features/credits/reason-label.ts`에서 관리한다.

개요 카드의 이프 지표는 ‘이프 적립’, ‘이프 소모’, 결제 지표는 ‘결제 건수’, ‘결제 금액 (환불 포함)’이다. 기간 범위는 `YYYY-MM-DD ~ YYYY-MM-DD (KST)`로 표시한다. 화면 문구는 em dash와 가운뎃점 나열을 쓰지 않는다.

분포 카드는 응답 순서를 유지해 도메인 영역에 배치한다. 채팅 참여는 genre-depth, turns, first-message이고 채팅 소유자는 started-as, member-chats다. 스토리 제작의 콘텐츠는 creation-mode, characters이며 운영 AI 품질은 ai-latency, ai-success다. 공용 DistributionCard 하나가 설명, 차트, 수치 표와 목록 이동을 처리한다. 제목과 설명은 응답을 그대로 사용한다. 장르 카드는 구역의 두 열을 모두 차지하며 기존 상위 30개 세로 막대와 전체 표를 유지한다. AI 기능의 표시 이름만 변환하고 차트와 표의 링크 값은 유지한다. 분포의 백분율은 이미 0~100 값이므로 곱하지 않고 소수 한 자리로 표시한다.

공통 실패는 ‘데이터 불러오기 실패’와 담당자 문의 안내, 서버 미구현은 ‘기능 준비 중’, Amplitude 503은 ‘Amplitude 지표를 불러올 수 없음’, Play 503은 ‘설치 지표 사용 불가’를 표시한다. 재시도는 해당 영역의 요청만 다시 보낸다. Play 일별 활성 기기의 null은 ‘보고서 값 없음’으로 표시하며 선을 잇거나 0으로 바꾸지 않는다.

### 지표 화면

성장(`/analytics/growth`), 스토리(`/analytics/stories`), 채팅(`/analytics/chats`), 결제(`/analytics/payments`), 운영(`/analytics/ops`)은 페이지 머리, 탭 막대, 하위 구분, 조건, 준비 중 알림, 영역 순서다. 결제는 탭 막대가 없다. 성장의 유입은 캠페인 추이, 유입 소스, 푸시 열람 하위 구분이고 운영의 서비스는 서비스와 요청, 저장소, DB 테이블 하위 구분이다. Base UI Tabs로 탭과 패널의 접근성 관계 및 방향키 이동을 제공한다. 성장, 스토리, 채팅, 결제와 해당 관리 목록의 제목 옆에는 쿼리 없는 상호 링크를 둔다.

성장의 기본 탭은 활동이고 사용자 활동과 세션을 최근 30일로 조회한다. 가입은 최근 7일의 신규 가입자 다음 웹 첫 접속, 앱 첫 접속, 게스트 한도 로그인 퍼널을 둔다. 스토리는 최근 7일의 제작에서 간편 제작 전환과 콘텐츠 분포, 간편 제작 실패율을 보인다. 채팅은 최근 7일의 참여에서 턴 도달률, 채팅 참여, 채팅 소유자, 상세 진입 채팅 전환을 순서대로 보인다. 옵션과 입력은 채팅 옵션 비중 다음 입력 방식을 최근 30일로 보인다. 결제는 개요와 공유하는 일별 추이에 결제 건수, 결제 금액, 이프 적립, 이프 소모를 이 순서로 담고 이프와 초대 신호 영역을 잇는다. 운영은 서비스, AI 품질, AI 비용이고 AI 품질은 분포 카드 다음 오류 표시 영역이다.

화면과 조건은 URL에 저장하고 현재 탭의 영역만 조회한다. 사이드바 지표 메뉴는 platform, segment, campaign을 유지하고 기간은 넘기지 않는다. 탭과 하위 구분을 바꿀 때는 tab만 바꾼다. 캠페인을 바꾸면 기간과 대상 스토리를 초기화한다. 예전 지표 경로는 ADMIN/WEB 2-1-1 이동 표에 따라 replace 이동하고 나머지 쿼리는 유지한다. 예전 분석의 days는 range로 바꾼다.

영역은 요청, 상태, 기간 상한을 따로 가진다. 같은 경로와 쿼리는 캐시를 공유하고 하나가 실패해도 다른 영역은 유지한다. 기간 선택기 상한은 영역 상한 가운데 가장 큰 값이다. 간편 제작 퍼널 20일, 상세 진입 및 전환 퍼널 31일, 유입 소스 10일, 그 밖의 일별 지표 366일이며 리텐션은 어제까지다. 가입, 제작, 참여에서 31일 초과는 퍼널 영역만 막는다. 상한을 넘는 빠른 범위는 비활성이다. 고른 기간은 자동으로 자르지 않고 맞추기 버튼만 끝 날짜를 보존해 범위를 바꾼다.

준비 중 날짜는 응답별로 재요청하되 탭의 첫 영역 위 알림 하나에 날짜를 합쳐 정렬한다. 영역은 제목과 출처, 집계 시각, 요약, 차트, 접힌 전체 수치 표 순서다. 일별 추이와 분포 영역에는 출처를 두지 않는다. 차트는 xl 이상 두 열이며 혼자 남는 마지막 카드, 장르별 평균 턴 수, 평균 세션 길이, 세션 길이 분포는 전체 폭이다. 세션 평균과 분포는 위아래 순서다.

일별 선은 단일 축, 고정 계열 순서와 색 및 선 모양, 범례, 마지막 준비된 점의 값, 십자선 툴팁과 동일 수치 표를 제공한다. 플랫폼 순서는 전체, 웹, 앱, 플랫폼 없음이고 색은 chart-1, chart-2, chart-3, chart-4이다. 선은 실선, 긴 점선(6,3), 짧은 점선(2,3), 1점 쇄선(8,3,2,3)이다. 광고 구분, 유입 소스, 가입 경로, 소유자, 입력 방식의 공용 계열은 `src/features/analytics/series.ts`에서 정한다. 모델 색은 코드별 고정 매핑 AURORA(chart-1), LITE(chart-2)이고 나머지 코드와 UNRECORDED는 muted-foreground이다. 표시 순서는 AURORA, LITE, 그 밖의 코드 글자순, UNRECORDED이며 기능은 AI 응답 생성, 선택지 생성, 실시간 이미지 생성, 스토리라인 생성, 간편 제작의 고정 색 순서다.

퍼널은 응답 순서의 가로 막대와 사용자 수 및 앞 단계 전환율을 표시한다. 첫 단계는 사용자 수만 보이고 수치 표의 전환율 칸은 빈칸이다. 소스와 게시글 순위는 상위 20개 가로 막대와 응답 순서 전체 표다. 도달률은 기준 턴 12개를 같은 간격으로 둔 전체, 게스트, 회원 선이며 리텐션은 비율이 클수록 진한 초록 칸의 코호트 표다. AI 비용 표는 기능 및 모델, 호출, 토큰, 비용 누락을 각각 구분한다.

MAU, 가중 평균과 서버 합계는 다시 계산하지 않는다. 준비 중 날짜는 0으로 채우지 않고 선을 끊고 표에 표시한다. 준비 중 날짜나 MAU null이 남으면 해당 요청을 60초마다 다시 보내고 완료 또는 탭 이탈 때 멈춘다. 그 외 자동 재시도와 초점 복귀 조회는 없다. 0은 그대로 표시하고 null 비율과 비용은 정본의 의미별 문구로 표시한다. 전환율과 스트림 오류율은 100%를 넘어도 자르지 않는다.

새 지표 BFF는 기존 서버 모드 프록시와 생성 Zod를 그대로 사용한다. 고정 데이터에서도 생성 연산 스키마로 검증하며 운영 환경의 fixture 차단을 유지한다. 기본 fixture에 준비 중 날짜, MAU null, 실제 0, 100% 초과 오류율, 비용 누락을 포함한다. 비운영 fixture 서버에만 `ADMIN_ANALYTICS_FIXTURE_SCENARIO=unavailable`을 설정하면 새 지표의 503 상태를 확인할 수 있다. 광고 캠페인 직접 입력 `FIXTURE_UNAVAILABLE`도 유입 분석의 503 확인에 쓴다.

차트·원장·Amplitude·설치 지표의 일반 설명은 제목 옆 물음표 도움말로 제공한다. `HelpTooltip`은 기존 Amplitude Base UI Tooltip 구현을 공유하며 hover와 키보드 포커스에서만 설명을 연다. 트리거와 팝업은 고유 ID와 aria-describedby로 연결한다. 서버 분포 description은 수정 없이 도움말에 표시한다. 선택 범위·집계 시각·기준일 같은 데이터와 오류·빈 상태·기간 상한·준비 중 안내는 해당 영역에 유지한다.

지표 화면 다섯 개의 카드·차트·표는 ADMIN/WEB 2-1-17 정의 표의 출처·대상·계산·날짜를 `features/analytics/metric-definitions-data.ts`에서 공유하고 제목 옆 도움말에 제공한다. 기존 정의성 설명은 해당 정의에 통합한다. 리텐션은 URL `cohort`의 방문자·가입자·채팅 시작자로 시작 집단을 선택하며 응답에 `cohort`가 없으면 방문자로 표시한다. 코호트 표에는 시작일·시작 인원을 쓰고 서버 이벤트 집단의 연결 끊김 안내를 정의 아래에 둔다. 앱 플랫폼 기록 시작일은 서버 v0.12.5의 운영 배포일인 2026-10-28(KST)을 상수로 두며, 상수가 비면 둘째 안내를 숨긴다.

성장 활동의 세션 영역의 평균 길이와 길이 분포는 기간·대상별로 각각 요청하고 독립 상태를 유지한다. 분포는 서버의 세션 수·중앙값 구간을 쓰고 9개 구간을 짧은 순서의 가로 막대로 표시한다. 플랫폼은 응답에서 선택해 재요청하지 않는다. Amplitude 퍼널 첫 단계가 0이면 이벤트 수신 없음만 표시하며 이벤트 횟수·사용자 수 계열은 준비된 날짜가 모두 0인 계열을 숨기고 범례에 상태를 표시한다. 비율·평균·서버 DB 값은 이 판정에서 제외한다. 기능 사용의 간편 제작 실패율은 `storyCompletion`으로 모든 날짜를 그리고 플랫폼 전체 기준을 표시한다. 해당 필드가 없으면 그 차트만 준비 중으로 둔다. 새 계약은 OpenAPI `metricDefinitions` 오버레이와 생성 Zod·연산 목록에 반영한다.

성장의 앱 설치 탭(`/analytics/growth?tab=installs`)은 Play 상세 차트를 제공한다. 광고 캠페인 선택을 숨기고 기간 선택기를 비활성인 전체 기간으로 표시한다. Google Play API만 요청하고 보고서 기준일·전체 범위를 사용한다. 누적·활성 기기는 선, 설치·삭제는 0 기준 위아래 막대로 표시하며 단일 축·고정 색·범례·전체 수치 표와 출처 툴팁을 유지한다. 개요의 앱 설치(Android) 카드에서 이 탭으로 연결한다. 예전 `/analytics/acquisition?tab=play-installs`는 이동 표에 없는 탭이므로 `/analytics/growth?tab=trend`로 이동한다. 새 성장 경로의 알 수 없는 탭은 기본 활동 탭을 표시한다.

### 개요 구성

개요에는 요약 카드 10개와 DB 작은 선 그래프 8개만 표시한다. 기존 8개 카드에 오늘 활성 사용자와 앱 설치(Android)를 합쳐 xl 이상 5열 2행으로 배치한다. 오늘 활성 사용자는 Amplitude 서버 합계를 대표 숫자로, 웹·앱를 보조 줄로 표시한다. 앱 설치는 누적 기기 설치 수를 대표 숫자로, 최신 보고일과 그날 기기 설치 수를 작은 줄로 표시한다. 두 카드의 출처·지연·집계 기준은 물음표 도움말로 제공한다. 오늘 활성 사용자는 사용자 활동(`/analytics/growth?tab=activity`), 앱 설치는 성장의 앱 설치 탭(`/analytics/growth?tab=installs`)으로 연결한다. Amplitude 구역 제목과 DAU·신규 사용자 차트는 개요에서 제거하며 성장 활동 탭을 사용한다. Play 상세 차트는 성장 앱 설치 탭에서 누적·활성 기기 선과 0 기준 위아래 설치·삭제 막대로 표시한다. 이 탭은 Play 보고서 전체 범위를 사용하므로 광고 캠페인 선택을 숨기고 기간 선택기는 비활성인 전체 기간으로 표시한다. 캠페인과 기간은 요청에 전달하지 않으며 URL의 기간은 다른 탭을 위해 유지한다. 실패와 재시도는 해당 카드·탭에 격리하며 Amplitude 준비 중은 60초 재요청을 유지한다.

개요 DB 추이는 지표 선택형 차트 대신 가입·채팅 시작·턴·스토리·이프 적립·이프 소모·결제 건수·결제 금액의 작은 선 그래프 8개로 표시한다. xl 이상에서 2행 4열, sm 이상 2열, 작은 화면 1열이며 같은 기간·날짜 축을 사용한다. 각 그래프는 단일 선·단일 y축과 기간 평균 점선, 날짜·값 툴팁, 날짜 목록 이동을 제공하며, 그래프 아래에 날짜별 8개 지표와 목록 링크를 담은 접힌 수치 표 하나를 둔다. 오늘 활성 사용자와 앱 설치는 카드만 제공한다.

캠페인 목록은 데이터 소스와 무관하게 제목·본문 검색, 종류 필터, 도달 회원·도달 기기·실패 기기 정렬을 제공한다. 캠페인 생성도 공개 스토리 검색·선택과 storyId 미리 채움을 지원하고, 확인 대화상자를 거친 요청만 기존 notifications → push 생성 operation 매핑으로 전달한다. 관련 OpenAPI 스냅샷은 배포된 서버 d33dc27의 dev 문서에서 추출했다. 목록의 query 객체는 기존 공통 검증기가 평탄한 쿼리를 묶어 생성 Zod로 검증한다. q·kind·storyId는 생성 스키마로 검증하고 sort 허용 값은 서버가 검증한다.

운영(`/analytics/ops`)의 서비스 탭은 서비스와 요청(services), 저장소(storage), DB 테이블(tables) 하위 구분을 둔다. 앞 두 탭은 오늘 기본·최대 31일의 from/to 요청 하나를 공유한다. DB 테이블은 기간 선택기를 ‘현재’로 비활성화하고 기존 URL 기간을 보존한 채 limit=20만 요청한다. 서비스 태스크·요청 합계와 단위별 선 차트, RDS·Redis·OpenSearch 구역, 테이블 크기 순위와 표를 제공한다. 서비스 순서는 서버·AI·알림이고 색은 chart-1·chart-2·chart-3, 선 모양은 실선·긴 점선·짧은 점선이다. Redis는 노드 ID 마지막 번호 순서로 정렬한다. 단일 축, 사용률 0~100%, 시각 간격의 누락 구간 null, 고정 범례·끝 값·호버 툴팁·접힌 수치 표를 사용한다.

인프라 용량은 바이트를 10^9/10^6으로 나눈 GB/MB, 응답 시간은 ms로 소수 한 자리까지 표시한다. 점 목록이 빈 요약 값은 ‘수집된 값 없음’이며 실제 0과 null 묶음의 설정 없음을 구분한다. 받은 시각(asOf)은 본문 설명 없이 출처 툴팁에 KST로 표시하며 태스크도 이 조회 시각 기준이다. 화면 제목 아래 설명 문장은 없다. 출처와 추정 행 수 도움말은 공용 HelpTooltip을 사용한다. 공용 기간 선택기는 선택적 maxDays로 인프라의 31일 상한을 적용하고 기존 화면 기본값 366일은 유지한다.

인프라 BFF는 생성 operation과 Zod를 사용하며 서버 모드는 공통 프록시로 전달한다. OpenAPI는 배포된 서버 9538df4의 dev 문서에서 추출한다. 원본의 인프라 JSON 객체 와일드카드 응답 미디어는 생성 입력에서만 application/json으로 정규화한다. from/to의 기간 의미 검증은 서버가 수행하며 fixture는 같은 기간 규칙을 적용한다. 비운영 fixture는 ADMIN_INFRA_FIXTURE_SCENARIO=complete로 Redis 두 노드를, unavailable로 CloudWatch 503을, empty로 빈 점 목록과 실제 0의 구분을 표시하며 기본 응답은 Redis 설정 없음이다. 운영 fixture 차단은 기존 공통 정책을 따른다.

개요의 가입자 카드는 탈퇴 회원을 포함한 누적 가입자를 대표 숫자로, 오늘 가입과 선택 기간의 가입 합계를 보조 줄로 표시한다. 카드는 excludeDeleted 없는 회원 목록으로 연결한다. 제목 옆 공용 HelpTooltip에 현재 회원 수와 누적 탈퇴 수 및 팀 계정 제외 기준을 정본 문구로 제공한다. 도움말 버튼은 카드 링크 밖에 두어 포커스와 클릭이 목록 이동으로 이어지지 않는다.

사용자 신규 가입자 탭의 누적 가입자 차트는 서버가 준 서비스 시작부터의 누계를 그대로 표시하며 선택 기간의 첫날을 0으로 다시 계산하지 않는다. 신규 가입자 요약은 일별 가입 수의 기간 합이다. 오늘까지 조회하면 누적 차트 마지막 값과 개요 가입자 카드가 같고, 가입 경로·일별 가입과 함께 탈퇴 회원도 포함한다. fixture는 회원 가입일로 일별 가입과 전체 누계를 계산한다. 가입자 계약은 배포된 서버 5086a8d의 실제 dev OpenAPI에서 추출했다. members.active·withdrawn을 포함하며 수동 overlay는 사용하지 않는다.

개요 요약의 QueryState는 인라인 변형을 사용한다. 서버 DB 공통 요약 상태와 Amplitude·Play 카드 안에는 별도 오류 박스·배경·패딩을 만들지 않고 제목과 테두리 없는 텍스트 재시도를 표시한다. 정본의 전체 오류 설명은 제목 옆 도움말에서 호버·포커스로 제공한다. 초기 DB 요약 로딩은 카드 골격으로, Amplitude·Play 카드와 기간 합계 로딩은 인라인 스켈레톤으로 표시한다. 요약 카드는 고정 최소 높이 없이 내용에 맞추고 같은 행의 카드끼리만 grid stretch로 높이를 맞춘다. 정상·로딩·실패 문구를 자르거나 스크롤로 숨기지 않는다. 차트·목록·상세 영역의 기본 QueryState 패널은 유지한다.

공용 탭은 `components/ui/tabs.tsx`에서 Base UI의 방향키 이동과 탭·패널 관계를 유지한다. 탭 버튼 링은 `focus-visible`에서만 표시하고, 대화형 자식이 있는 패널 자체는 탭 순서와 마우스 포커스에서 제외한다.

인프라·분석·Play 선 차트의 끝 값과 첫 사용자 입력 시간의 백분위·평균 라벨은 공용 `ChartEndLabels`가 실제 축 좌표를 기준으로 배치한다. 가로 범위가 겹치는 라벨 묶음은 세로 간격을 최소 18px로 유지하고 차트 위아래 경계를 보정한다. 라벨이 이동하면 연결선을 표시하며 데이터 점·선·단일 축·고정 색과 범례는 유지한다.

AI 기능 chat_image는 ‘실시간 이미지 생성’으로 표시한다. AI 품질 성공률과 지연은 기능 순서·색을 고정하고 실시간 이미지 막대는 같은 호출일·상태·지연 조건의 채팅 목록에 연결한다. 성공률 경고는 고정 계열 색을 바꾸지 않고 기존 경고 문구·아이콘으로 구분한다. 채팅 fixture도 chat_image 필터를 받는다.

AI 비용 탭은 Langfuse 출처로 표시하며 받은 시각·USD/KRW 환율·장당 원가·서버 DB 호출/토큰 기준을 공용 출처 툴팁에 둔다. 금액에는 실패한 호출의 비용도 포함하지만 호출·토큰은 성공한 호출만 센다. 간편 제작에는 표지·인물 이미지 비용이 포함되고 실시간 이미지는 별도 장당 원가를 적용하며 두 원가에서 제외한다. 모델 정보 없음 경고는 표시하지 않는다.

AI 비용 차트는 다섯 기능의 고정 순서·chart-1~5를 유지하며 각 기능의 null이 아닌 비용만 더한다. 비용 기록이 하나도 없는 기능은 null로 두고 실제 0원과 구분한다. pendingDates 날짜는 선을 끊고 알림과 수치 표에 준비 중을 표시하며 60초 뒤 같은 요청을 다시 보내고 모두 준비되면 멈춘다. 비용 표의 null은 날짜에 따라 준비 중 또는 비용 기록 없음이고 실시간 이미지 행의 토큰 세 칸은 해당 없음이다. 총 비용·턴당·스토리당 원가는 서버 값을 그대로 사용한다. unpricedModels·unmapped·토큰 누락 안내는 해당 값이 있을 때만 표시하며 미연결 추적 비용은 기능별 계열에 넣지 않는다. AI 비용 503은 탭 안에서 Langfuse 설정 안내와 다시 시도를 제공한다.

채팅 턴 도달률은 `TurnReachChart`에서 기준 턴 1, 2, 3, 4, 5, 6, 7, 10, 15, 20, 30, 50을 같은 간격으로 놓은 전체·게스트·회원 선으로 표시한다. 채팅 0인 구분은 선을 그리지 않고 범례에 채팅 없음을 표시한다. 수치 표는 기준 턴이 행이며 첫 행에 구분별 채팅 수를 둔다. 스토리 상세도 같은 기준 턴 12개를 2·4·6열 반응형 격자로 배치한다.

서비스 CPU·메모리 선은 평균만 그리고 툴팁과 표는 평균 / 최대를 함께 표시한다. 최대는 cpuMax·memoryMax이며 값이 빠진 구간은 값 없음으로 표시한다. 채팅 옵션은 턴 합계 카드, 모델별 턴 수 선, 모델별 채팅/턴 수와 각 비중 표를 제공한다. 턴 집계는 AI 응답 생성일 기준이며 삭제된 채팅의 턴도 포함한다.

장르별 평균 턴 수는 `MIN_GENRE_CHATS=5` 이상인 장르만 응답 순서대로 최대 30개 표시한다. 5개 미만은 수치 표에만 차트 제외(채팅 5개 미만)로 표시하고 모든 장르의 평균·채팅 수·총 턴 수와 목록 링크를 보존한다. 툴팁도 이 세 값을 표시하며 적격 장르가 없으면 전용 빈 상태를 표시한다.

채팅 옵션 비중 표는 byModel·turnsByModel 키의 합집합을 행으로 사용하고 없는 쪽 값은 0이다. 채팅 합이 0이면 채팅 비중에 채팅 없음, 턴 합이 0이면 턴 비중에 턴 없음을 표시하며 서로의 상태에 영향을 주지 않는다. UNRECORDED는 기록 전으로 표시한다. 채팅 수는 현재 선택 모델, 턴 수는 그 턴을 실제로 만든 모델 기준이고 게스트 턴은 라이트다. 이 기준은 물음표 툴팁의 목록에, 출처·삭제 채팅·기록 전 집계 안내는 출처 툴팁에 제공한다.

기준 턴 도달률 선과 인프라 평균·최대 표시는 공용 ChartEndLabels의 축 좌표·겹침 회피를 함께 사용한다. 인프라 선과 끝 라벨의 좌표는 평균을 유지하고 최대는 툴팁·표에 제공한다.

지표 개정 계약은 배포된 서버 d52e820의 실제 dev OpenAPI로 추출했다. cpuMax·memoryMax, turnsByModel, 장르 chats·totalTurns와 retention·reached 배열을 확인하고 수동 overlay를 제거했다. 장르 표본 필드는 실제 계약의 nullable 숫자를 허용하며 차트 표본 필터는 값이 없으면 제외한다. 기준 턴 12개는 서버 구현·통합 테스트와 웹 공통 기준을 따른다.

검수 제출(`/moderation/submissions`)은 관리 구역의 스토리 다음 메뉴다. 목록은 모든 상태의 접수 시각 최신순이며 상태·접수일·검색어·회원/스토리 조건·정렬·페이지를 URL에 저장한다. 기본 요청은 page=1, size=20, sort=createdAt, order=desc다. 표 안에서 가로 스크롤하고 아래 가운데 페이지 번호로 이동한다. 접수 시각 링크는 키보드 상세 진입 경로이며 행 클릭도 같은 상세로 이동한다. 스토리·회원 링크와 해제 버튼은 행 이동과 분리한다.

상세(`/moderation/submissions/{id}`)는 제출본 ID·종류·상태·회원과 스토리 링크 뒤에 처리 경과와 검수 대상 필드를 표시한다. xl 이상에서는 두 카드를 1:2 두 열로, 작은 화면에서는 한 열로 배치한다. 검수 대상 필드는 제목·한 줄 소개·소개·기본 주인공 이름·장르·공개 범위·인물 이름 7개다. 설정 본문·시작 설정·주요 사건·인물 설명·이미지 URL·객체 키를 표시하지 않는다. 위반 위치는 표시 이름으로 바꾸고 미등록 경로·코드는 원문을 보존한다. 위반 전체와 이미지 이름·검수 상태·오류 표를 제공한다. 설명은 제목·열 머리의 공용 HelpTooltip에만 둔다.

보류 행·상세만 해제할 수 있고 관리자 승인·반려 변경 기능은 없다. 공용 해제 훅의 Base UI 모달은 최대 448px이며 사유 1~500자·공백 금지 검증, 입력 초기 포커스·트랩·취소 시 초점 복귀를 제공한다. 처리 중에는 입력·확인·취소와 Esc·바깥 닫기를 막는다. 성공하면 닫고 목록 및 해당 상세 캐시를 다시 요청하며 상태 알림을 4초 표시한다. 404·409는 오류를 대화상자에 유지한 채 목록·상세를 다시 요청하므로 원래 해제 행이 사라져도 대화상자가 닫히지 않는다. 사유는 대화상자를 닫을 때 지우며 별도 브라우저 저장소에 보관하지 않는다.

BFF 세 경로(검수 제출 목록·상세, 보류 해제)는 생성 operation·Zod와 기존 관리자 프록시의 세션·출처·인증·원문 오류 전달을 사용한다. 서버 계약은 배포된 서버 4eb8776의 실제 dev OpenAPI로 추출하고 검수 제출 overlay를 제거했다. 생성된 공통 사유 스키마를 사용하고 UI는 사유 1~500자·공백 금지를 검증한다. 실제 OpenAPI에 없는 문자열 의미 검증은 서버가 담당하며 fixture는 그 동작을 재현한다. 비운영 fixture는 41개 제출본의 모든 상태·반려된 새 스토리·복수 위반·미등록 기준을 제공하고 해제 후 메모리 안의 상태를 대기로 바꾼다. fixture 상태는 프로세스가 재시작되면 초기화된다. 운영에서는 기존 fixture 차단을 유지한다.

검수 회차 도움말은 실행 구분 번호와 실행 횟수의 차이를 설명한다. 위반 위치는 정본에 나열한 하위 필드 이름과 이미지 번호를 보존하고 미정 경로는 원문을 표시한다. 해제 404에서는 상세 캐시의 이전 데이터를 초기화한 뒤 목록·상세를 다시 요청한다.

AI 비용의 Langfuse 추가 필드 pendingDates·usdKrwRate·unmapped는 배포된 서버 4eb8776의 실제 dev OpenAPI 추출본에 포함되어 있으며 수동 overlay는 사용하지 않는다. 기존 BFF 경로·생성 쿼리 검증·인증 및 응답 전달은 유지한다.

개요 요약 카드는 오늘 활성 사용자, 가입자, 채팅 시작, 턴, 스토리, 이프 적립, 이프 소모, 결제 건수, 결제 금액 (환불 포함), 앱 설치(Android) 순서다. DB 일별 추이의 지표 순서는 유지하며 카드의 같은 행 높이는 grid stretch로 맞춘다.

로딩은 `components/ui/skeleton.tsx`의 muted 블록과 `components/admin/loading-ui.tsx`의 카드·인라인·차트·막대·표·상세·폼 골격으로 표시한다. 표와 목록은 실제 열 수 및 px-5/py-4 행 간격을 사용한 머리 행과 본문 10행이고, 퍼널·순위는 막대 5개다. 개요는 기존 10개 카드의 칸과 DB 추이 8개의 격자·200px 차트 영역을 예약하며, 누적과 오늘 값이 있으면 기간 합계 한 줄만 대체한다. 분석 탭은 탭별 카드·차트 개수에 맞춘 MetricsSkeleton을 사용한다. 숨김 블록에는 링크나 입력을 넣지 않는다.

스켈레톤은 200ms 뒤 나타나며 한 번 보이면 최소 300ms 유지한다. 초기 useApi 요청은 이 표시 구간 안에 끝나면 결과·오류 공개를 최소 표시 시점까지 보류한다. 캐시에 이전 값이 있는 재요청은 이 보류를 적용하지 않고 TanStack Query의 이전 값을 유지한다. Suspense의 클라이언트 전환은 공용 LoadingBoundary에서 같은 시간을 적용한다. 서버 렌더와 하이드레이션 전에는 대체 스켈레톤을 즉시 표시하고, 루트 loading.tsx도 서버 HTML에 ShellSkeleton을 포함한다. 하이드레이션 후에는 지속되는 루트 경계가 표시를 이어받는다. 초기 빠른 응답은 회색 블록을 보이지 않으며 기다리는 동안 자리 크기는 예약한다.

기다리는 영역은 aria-busy이고 상태 알림 문구 '데이터를 불러오는 중입니다…'만 sr-only로 둔다. 회색 블록은 aria-hidden이다. 배경은 muted, 불투명도 애니메이션 주기는 1.5초이고 motion-reduce에서는 정지한다. 실패·사용 불가·준비 중·실제 0의 처리와 문구는 유지한다.

회원 상세 요약은 채팅 다음에 누적 턴(turnCount)을 천 단위 쉼표와 턴 단위로 표시하고 그 뒤에 소모 이프를 둔다. 누적 턴 라벨 옆 공용 HelpTooltip은 삭제·게스트 이관 채팅 포함과 재생성 제외 기준을 설명한다. DetailGrid는 항목별 선택적 도움말을 받으며 회원 목록 열에는 누적 턴을 추가하지 않는다. 회원 상세 turnCount는 서버 0f350d8의 실제 dev OpenAPI 추출본에 포함되어 있으며 수동 overlay는 사용하지 않는다.

성장 유입의 푸시 열람(push)은 최근 7일 기본·최대 366일이며 캠페인 목록을 요청하거나 기다리지 않는다. 기간 선택기와 URL을 공유하고 출처는 Amplitude, 도움말은 웹 열람 기준과 서버 도달 회원의 차이를 설명한다. 관리자 캠페인 표는 응답 순서, 활동 알림 표는 스토리 완성·검수 완료·출석 리마인드 고정 순서다. 공지는 제목 앞 중립 배지를 쓰고 마지막 발송 시작은 KST로 표시한다. 측정 상태는 측정 시작 전·링크 없음·발송 기록 없음으로 열람 수와 비율을 대체하고, 실제 0과 100% 초과 비율은 그대로 표시한다. 부분 집계·활동 집계 시작 안내와 열 머리 도움말을 제공한다. asOf가 null이면 기준 시각을 생략하고 pendingDates가 비었으면 재요청하지 않는다. 준비 날짜가 남으면 기존 60초 재요청을 사용한다. 로딩은 두 표(6열·4열)의 공용 스켈레톤이다. 서버 PR #400 계약은 OpenAPI overlay로 구분하고 배포 후 실제 추출로 대조한다.

플랫폼 표시 이름은 웹과 앱으로 통일하고 요청의 web/android와 응답 값은 유지한다. 전체·평균·MAU를 플랫폼 값으로 재계산하지 않는다. 앱은 국내와 해외 로그인 사용자 조건의 합이며 상세 집계 기준은 출처 도움말에 표시한다. Google Play 설치의 Android 표기는 유지한다.

AI 비용은 `expiredDates`의 날짜 수와 보관 일수 안내를 요약 아래 표시한다. null 비용은 pendingDates, expiredDates, 조합별 기록 없음 순으로 판정하며 날짜 경계로 추정하지 않는다. 일별 비용은 계열별 null만 끊고 실시간 이미지 비용은 준비 중·만료 날짜에도 실제 값을 유지한다. 원가 null은 해당 기능 호출 수가 있으면 계산할 수 없음, 없으면 호출 없음이다. asOf null은 받은 시각 문장만 생략한다. 만료 날짜만으로 재요청하지 않고 준비 중 날짜가 있으면 기존 60초 재요청을 유지한다. ADMIN BACKEND 4-2-32의 미배포 필드는 OpenAPI 스키마 x-contract-overlay에 구분한다.

스토리와 채팅 목록의 삭제 필터는 기존 필터 줄에서 제외·포함·삭제된 행만을 선택한다. 제외는 쿼리를 보내지 않고 포함과 삭제만은 `deleted=include|only`를 보낸다. 회원 상세의 스토리·채팅과 스토리 상세의 채팅 범위 목록은 기존 `usePagedList`를 재사용하며 URL의 `storiesDeleted`, `chatsDeleted`를 목록마다 독립적으로 유지한다. 알 수 없는 값은 제외로 표시하고 요청에서 뺀다. 삭제된 행은 기존 중립 상태 배지로 상세 링크 옆에 "삭제됨"을 표시하고 상세 제목 옆에 같은 배지와 "삭제 시각 (KST)" 및 날짜·시분을 둔다. 시각은 상세 응답만 사용하며 스토리 설정에는 반복하지 않는다. 채팅에 연결된 스토리 이름에는 삭제 표시를 두지 않는다. 차트와 요약 카드의 목록 링크는 삭제 필터 없이 연다. 미배포 서버 계약은 `docs/openapi/admin.json`의 `x-contract-overlay`에 스펙 `6cd5e3c`와 서버 의존 이슈를 기록하고 생성 Zod로 BFF 쿼리를 검증한다. 서버 배포 후 실제 OpenAPI로 다시 추출한다.

스토리 상세 머리의 공개 중단 버튼은 소유 회원이 있는 사용자 스토리이며 삭제·공개 중단 시각이 모두 null일 때 표시한다. 공용 ConfirmDialog는 기존 기본값을 유지하며 선택적 본문·확인 라벨·유효성·초점 ref를 받는다. 공개 중단은 네 사유의 라디오 선택, 기타의 필수 입력 사유(100자), 선택 메모(500자)와 도움말을 제공한다. 처리 중에는 입력과 닫기를 잠그고 성공하면 상세·목록 캐시를 무효화하며 상세를 재조회한다. 409는 상세 재조회, 404는 목록 캐시만 무효화하고 입력과 대화상자를 유지한다. 목록과 상세는 삭제 배지 다음에 같은 모양의 공개 중단 배지를 두며 상세 머리에 KST 시각과 사유를 표시한다. 기타는 입력 사유를 함께 표시하고 내부 메모는 저장하거나 다시 표시하지 않는다. 서버 미배포 계약은 OpenAPI의 x-contract-overlay.storyTakedown에 기록하고 배포 후 실제 OpenAPI로 대조한다.
