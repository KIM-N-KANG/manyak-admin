export const screens = {
  acquisition: {
    title: '유입 분석',
    tabs: [
      ['trend', '캠페인 추이'],
      ['creation', '간편 제작 퍼널'],
      ['story-detail', '상세 진입 퍼널'],
      ['sources', '유입 소스'],
      ['push', '푸시 열람'],
      ['installs', '앱 설치'],
    ],
  },
  users: {
    title: '사용자',
    tabs: [
      ['activity', '사용자 활동'],
      ['retention', '리텐션'],
      ['sessions', '세션'],
      ['signups', '신규 가입자'],
    ],
  },
  conversion: {
    title: '전환',
    tabs: [
      ['funnels', '전환 퍼널'],
      ['turn-reach', '채팅 턴 도달률'],
    ],
  },
  quality: {
    title: '기능과 품질',
    tabs: [
      ['client', '기능 사용과 안정성'],
      ['chat-options', '채팅 옵션 비중'],
      ['ai-cost', 'AI 비용'],
    ],
  },
} as const;
export type AnalyticsScreenName = keyof typeof screens;
export const funnels = [
  ['web-first-visit', '웹 첫 접속'],
  ['android-first-visit', '앱 첫 접속'],
  ['story-creation', '간편 제작'],
  ['story-detail-chat', '상세 진입 채팅'],
  ['guest-limit-login', '게스트 한도 로그인'],
] as const;
export const platformOptions = [
  ['all', '전체'],
  ['web', '웹'],
  ['android', '앱'],
] as const;
/** 유입 분석 간편 제작 퍼널의 광고 구분(URL `adSegment`)이다. 서버로 보내지 않는다. */
export const adSegments = [
  ['all', '전체'],
  ['ads', '광고 유입'],
  ['nonAds', '광고 외 유입'],
] as const;
/** 지표 화면 공통 대상(URL·요청 `segment`)이다. */
export const audiences = [
  ['all', '전체'],
  ['guest', '게스트'],
  ['member', '회원'],
] as const;
/** 플랫폼 선택을 쓰는 탭이다. 스펙 2-1-2 "4. 플랫폼과 대상" 표와 맞춘다. */
export const platformTabs: readonly string[] = [
  'activity',
  'retention',
  'sessions',
  'signups',
  'funnels',
  'turn-reach',
  'client',
  'chat-options',
];
/** 대상 선택을 쓰는 탭이다. 이 탭만 요청에 `segment`를 싣는다. */
export const segmentTabs: readonly string[] = [
  'sessions',
  'turn-reach',
  'client',
  'chat-options',
];
/** 고른 구분을 적용하지 못한 값의 제목 옆 표시 문구다. 적용하지 못한 구분이 없으면 null이다. */
export function basisText(platform: boolean, segment: boolean) {
  return platform && segment
    ? '플랫폼과 대상 전체 기준'
    : platform
      ? '플랫폼 전체 기준'
      : segment
        ? '대상 전체 기준'
        : null;
}
/** 플랫폼과 대상, 서버 DB 탭 안 Amplitude 값의 화면 문구다. 스펙 2-1-2, 2-1-6~2-1-8 문구 표와 맞춘다. */
export const platformText = {
  segmentLabel: '대상',
  segmentHelp:
    'Amplitude에서는 이벤트 발생 당시 회원 식별자가 있으면 회원, 없으면 게스트로 구분합니다. 서버 DB에서는 채팅의 현재 소유자가 회원인지 게스트인지로 구분합니다.',
  funnelHelp:
    '웹과 앱을 합산한 전환 퍼널은 제공하지 않습니다. 플랫폼에서 전체를 선택하면 간편 제작, 상세 진입 채팅, 게스트 한도 로그인은 웹 기준으로 표시합니다. 웹 첫 접속과 앱 첫 접속은 플랫폼 선택과 관계없이 각각 웹과 앱 기준으로 표시합니다.',
  messagesPerUserEmpty:
    '전체 값이 없습니다. 플랫폼을 웹이나 앱으로 골라 주세요.',
  signupCard: '가입 이벤트 기준 신규 가입자',
  signupHelp:
    'Amplitude의 가입 이벤트로 셉니다. 국가가 한국이거나 국가 정보가 없는 사용자만 셉니다. 구글과 카카오 경로별 수를 더하므로 같은 날 두 경로로 가입하면 두 번 셉니다. 팀 계정이 포함돼 서버 DB 신규 가입자와 다를 수 있습니다.',
  reachTitle: '1턴 대비 도달률',
  reachHelp:
    'Amplitude의 AI 응답 저장 이벤트로 셉니다. 선택 기간에 기준 턴 응답을 저장한 채팅 수를 같은 기간에 1턴 응답을 저장한 채팅 수로 나누며 재생성은 뺍니다. 게스트와 회원은 응답을 저장할 때 회원 식별자가 있었는지로 가릅니다. 삭제된 채팅과 팀 계정이 포함되고 100%를 넘을 수 있습니다.',
  personaTitle: '페르소나 시작 클릭 비중',
  personaHelp:
    'Amplitude의 채팅 시작 버튼 클릭 가운데 페르소나를 주인공으로 고른 클릭의 비중입니다. 주인공 종류가 기록된 클릭만 분모에 듭니다. 국가가 한국이거나 국가 정보가 없는 사용자만 세고 팀 계정을 포함합니다. 클릭 수라 실제 채팅 생성 수와 다를 수 있습니다.',
  personaEmpty: '집계 대상 클릭 없음',
  modelTurnsTitle: '응답 저장 기준 모델별 턴 수',
  modelTurnsHelp:
    'Amplitude의 AI 응답 저장 이벤트를 선택 기간에 저장된 턴 기준으로 그 턴을 만든 모델별로 셉니다. 국가가 한국이거나 국가 정보가 없는 사용자만 세며 그 밖 국가에서 로그인한 앱 사용자는 넣지 않습니다. 재생성은 세지 않고 팀 계정을 포함합니다.',
};
/** 서버가 적용한 `segment`를 조건 표시 문구로 바꾼다. */
export const audienceText = (segment?: string) =>
  segment
    ? `${platformText.segmentLabel} ${audiences.find(([key]) => key === segment)?.[1] ?? segment}`
    : null;
export const approximation =
  '로그인 성공은 구글과 카카오 경로를 더한 근사치라 두 경로를 모두 거친 사용자는 두 번 셉니다. 앞 단계보다 클 수 있습니다.';
export const sourceHelp = {
  push: 'Amplitude 출처 지표입니다. 웹 기준으로 푸시를 눌러 연 페이지 조회를 날짜별 고유 사용자로 세어 더합니다. 도달 회원은 서버 발송 결과이며 팀 계정을 제외하지 않습니다.',
  acquisition:
    'Amplitude 출처 지표입니다. 집계가 몇 분 늦게 반영될 수 있습니다. 유입 분석은 팀 계정을 제외하지 않습니다. 국가가 한국이거나 국가 정보가 없는 사용자를 집계합니다. 앱 신규 가입자는 광고 구분 없이 따로 세고, 나머지 지표는 웹 사용자만 셉니다.',
  users:
    'Amplitude 출처 지표입니다. 집계가 몇 분 늦게 반영될 수 있습니다. 국가가 한국이거나 국가 정보가 없는 사용자를 집계하고 앱 활성 사용자는 그 밖 국가에서 로그인한 사용자도 더하며 팀 계정은 제외하지 않습니다. 신규 방문자, 리텐션, 사용자당 전송 수, 평균 세션 길이는 국가가 한국이거나 국가 정보가 없는 사용자만 셉니다. 플랫폼 정보가 없는 사용자는 전체에만 들어갑니다. 활성 사용자와 신규 방문자의 전체는 조건별 사용자 수를 더한 값이라 같은 날 여러 조건으로 활동한 사람은 두 번 셉니다. 리텐션과 평균 세션 길이의 전체는 국내 조건으로 별도 조회한 값입니다.',
  signups:
    '서버 DB 출처 지표입니다. 팀 계정은 제외합니다. 가입 경로는 처음 연결한 소셜 계정 기준입니다. 누적 가입자는 서비스 시작부터 센 값이며 탈퇴한 회원을 포함합니다. 탈퇴 뒤 같은 소셜 계정으로 다시 가입한 회원은 새 계정만 셉니다.',
  conversion:
    'Amplitude 출처 지표입니다. 집계가 몇 분 늦게 반영될 수 있습니다. 웹과 앱 모두 국가가 한국이거나 국가 정보가 없는 사용자만 집계합니다. 팀 계정은 제외하지 않습니다.',
  'turn-reach':
    '서버 DB 출처 지표입니다. 팀 계정은 제외합니다. 게스트와 회원은 채팅의 현재 소유자 기준입니다.',
  quality:
    'Amplitude 출처 지표입니다. 집계가 몇 분 늦게 반영될 수 있습니다. 국가가 한국이거나 국가 정보가 없는 사용자를 집계하고 앱은 그 밖 국가에서 로그인한 사용자도 더하며 팀 계정은 제외하지 않습니다. 전체와 앱 값은 조건별 건수와 사용자 수를 더한 값이라 여러 조건으로 활동한 사람은 사용자 수에 두 번 들 수 있습니다. 스트림 오류율은 두 이벤트의 건수 비율이라 100%를 넘을 수 있습니다.',
  'chat-options':
    '서버 DB 출처 지표입니다. 팀 계정은 제외합니다. 채팅 수는 삭제되지 않은 채팅을 생성일 기준으로 집계하며 채팅에 지금 선택된 모델로 셉니다. 턴 수는 AI 응답이 생성된 날 기준이고 그 턴을 만든 모델로 세며 삭제된 채팅의 턴도 셉니다. 모델 기록 전의 턴은 "기록 전"으로 셉니다.',
  'ai-cost':
    'Langfuse 출처 지표이며 {받은 시각} KST에 받은 값입니다. 금액은 Langfuse가 모델 단가로 계산한 비용을 1달러 {환율}원으로 바꾼 값이고 호출 수와 토큰 수는 서버 DB 기록입니다. 팀 계정의 호출도 포함합니다. 금액은 실패한 호출 과정의 비용도 포함하고 호출 수와 토큰 수는 성공한 호출만 셉니다. 실시간 이미지는 장당 {장당 원가}원으로 계산하며 턴당 원가와 스토리당 원가에는 넣지 않습니다. 간편 제작에는 표지와 인물 이미지 비용이 포함됩니다.',
};
export function pick<T extends string>(
  value: string | null,
  values: readonly (readonly [T, string])[],
  fallback: T,
): T {
  return values.find(([key]) => key === value)?.[0] ?? fallback;
}
export function eventLabel(event: string, turnNumber?: number | null) {
  const labels: Record<string, string> = {
    client_onboarding_viewed: '환영 다이얼로그 조회',
    client_onboarding_createButton_clicked: '제작 버튼 클릭',
    client_storyCreate_storyGeneration_requested: '스토리라인 생성 요청',
    client_storyCreate_storylineOption_selected: '스토리라인 선택',
    client_storyCreate_storyCompletion_requested: '간편 제작 요청',
    client_storyCreate_completed: '간편 제작 완료',
    client_chat_messageInput_submitted: '채팅 메시지 전송',
    client_login_viewed: '로그인 화면 조회',
    client_storyDetail_viewed: '스토리 상세 조회',
    client_storyDetail_chatStartButton_clicked: '채팅 시작 클릭',
    client_guestLimitDialog_shown: '게스트 한도 안내 표시',
    client_guestLimitDialog_loginButton_clicked: '로그인 버튼 클릭',
    login_succeeded: '로그인 성공 (구글과 카카오 합)',
  };

  return event === 'client_chat_messageInput_submitted' && turnNumber != null
    ? `턴 ${turnNumber} 채팅 메시지 전송`
    : (labels[event] ?? event);
}
export const modelLabel = (value: string) =>
  (
    ({ AURORA: '오로라', LITE: '라이트', UNRECORDED: '기록 전' }) as Record<
      string,
      string
    >
  )[value] ?? value;
export const percent = (value: number | null, missing = '계산할 수 없음') =>
  value === null
    ? missing
    : `${(value * 100).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
export const ratio = (n: number, d: number) => (d === 0 ? null : n / d);
export function metricNumber(
  value: number,
  unit: string,
  minimumFractionDigits = 0,
) {
  return `${value.toLocaleString('ko-KR', { minimumFractionDigits, maximumFractionDigits: unit === '원' ? 2 : 1 })}${unit}`;
}
