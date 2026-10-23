export const screens = {
  acquisition: {
    title: '유입 분석',
    tabs: [
      ['trend', '캠페인 추이'],
      ['creation', '간편 제작 퍼널'],
      ['story-detail', '상세 진입 퍼널'],
      ['sources', '유입 소스'],
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
  ['web-first-visit', 'Web 첫 접속'],
  ['android-first-visit', 'Android 첫 접속'],
  ['story-creation', '간편 제작'],
  ['story-detail-chat', '상세 진입 채팅'],
  ['guest-limit-login', '게스트 한도 로그인'],
] as const;
export const platformOptions = [
  ['all', '전체'],
  ['web', 'Web'],
  ['android', 'Android'],
] as const;
export const segments = [
  ['all', '전체'],
  ['ads', '광고 유입'],
  ['nonAds', '광고 외 유입'],
] as const;
export const approximation =
  '로그인 성공은 구글과 카카오 경로를 더한 근사치라 두 경로를 모두 거친 사용자는 두 번 셉니다. 앞 단계보다 클 수 있습니다.';
export const sourceHelp = {
  acquisition:
    'Amplitude 출처 지표입니다. 집계가 몇 분 늦게 반영될 수 있습니다. 유입 분석은 팀 계정을 제외하지 않습니다. 국가가 한국이거나 국가 정보가 없는 Web 사용자만 집계하며 신규 가입자는 플랫폼 조건 없이 집계합니다.',
  users:
    'Amplitude 출처 지표입니다. 집계가 몇 분 늦게 반영될 수 있습니다. 국가가 한국이거나 국가 정보가 없는 사용자만 집계하며 팀 계정은 제외하지 않습니다. 플랫폼 정보가 없는 사용자는 전체와 플랫폼 없음에 들어갑니다. 같은 사람이 여러 플랫폼에서 활동하면 플랫폼별 값의 합이 전체보다 클 수 있습니다.',
  signups:
    '서버 DB 출처 지표입니다. 팀 계정은 제외합니다. 가입 경로는 처음 연결한 소셜 계정 기준입니다. 누적 가입자는 서비스 시작부터 센 값이며 탈퇴한 회원을 포함합니다.',
  conversion:
    'Amplitude 출처 지표입니다. 집계가 몇 분 늦게 반영될 수 있습니다.',
  'turn-reach':
    '서버 DB 출처 지표입니다. 팀 계정은 제외합니다. 게스트와 회원은 채팅의 현재 소유자 기준입니다.',
  quality:
    'Amplitude 출처 지표입니다. 집계가 몇 분 늦게 반영될 수 있습니다. 국가가 한국이거나 국가 정보가 없는 사용자만 집계하며 팀 계정은 제외하지 않습니다. 스트림 오류율은 두 이벤트의 건수 비율이라 100%를 넘을 수 있습니다.',
  'chat-options':
    '서버 DB 출처 지표입니다. 팀 계정은 제외합니다. 삭제되지 않은 채팅을 생성일 기준으로 집계합니다.',
  'ai-cost':
    '서버 DB 출처 지표입니다. 팀 계정의 호출도 포함합니다. 성공한 호출만 집계하며 이미지 생성 비용은 포함하지 않습니다.',
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
  (({ AURORA: '오로라', LITE: '라이트' }) as Record<string, string>)[value] ??
  value;
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
