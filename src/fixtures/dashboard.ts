import type {
  DailyMetrics,
  DashboardCharts,
  DashboardSummary,
  Distribution,
} from '@/features/dashboard/types';

export const summary: DashboardSummary = {
  asOf: '2026-10-21T09:00:00Z',
  todayStartsAt: '2026-10-20T15:00:00Z',
  members: {
    total: 4826,
    joinedToday: 42,
    withdrawnTotal: 126,
    withdrawnToday: 2,
  },
  chats: {
    startedTotal: 68410,
    startedToday: 386,
    turnsTotal: 914820,
    turnsToday: 4921,
  },
  stories: { total: 3240, createdToday: 28 },
  credits: {
    grantedTotal: 18420000,
    grantedToday: 84000,
    spentTotal: 14860000,
    spentToday: 68200,
  },
  payments: {
    completedTotal: 2186,
    completedToday: 19,
    amountKrwTotal: 18264000,
    amountKrwToday: 163200,
    refundedTotal: 48,
    refundedToday: 1,
  },
  moderation: { heldSubmissions: 12 },
};

const daily: DailyMetrics[] = Array.from({ length: 90 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 6, 24 + i)).toISOString().slice(0, 10),
  joined: 22 + ((i * 7) % 37),
  chats: 210 + ((i * 31) % 240),
  turns: 2600 + ((i * 137) % 3100),
  stories: 12 + ((i * 3) % 31),
  granted: 48000 + ((i * 2300) % 61000),
  spent: 38000 + ((i * 1700) % 45000),
  payments: 8 + ((i * 5) % 22),
  revenue: 38400 + ((i * 4800) % 144000),
  attendance: 160 + ((i * 19) % 230),
}));

function dist(
  chartId: string,
  title: string,
  description: string,
  unit: string,
  labels: string[],
  values: number[],
  href: (label: string, index: number) => string,
): Distribution {
  return {
    chartId,
    title,
    description,
    unit,
    points: labels.map((label, index) => ({
      label,
      value: values[index],
      href: href(label, index),
    })),
  };
}

const distributions: Distribution[] = [
  dist(
    'genre-depth',
    '장르별 채팅 깊이',
    '채팅 시작일 기준 · 복수 장르는 각각 포함 · 평균 현재 턴',
    '턴',
    ['로맨스', '판타지', '일상', '미스터리', 'SF'],
    [18.4, 24.8, 12.6, 21.3, 16.9],
    (l) => `/stories?genre=${encodeURIComponent(l)}`,
  ),
  dist(
    'turns',
    '턴 수 분포',
    '채팅 시작일 기준 · 구간별 채팅방 수',
    '개',
    [
      '0',
      '1',
      '2',
      '3~4',
      '5~6',
      '7~9',
      '10~14',
      '15~19',
      '20~29',
      '30~49',
      '50+',
    ],
    [410, 380, 284, 462, 349, 440, 627, 508, 420, 285, 174],
    (_, i) => `/chats?turnBucket=${i}`,
  ),
  dist(
    'started-as',
    '채팅 시작 시점 게스트·회원',
    '채팅 시작 당시 회원 여부 · 이후 전환 여부와 무관',
    '%',
    ['게스트', '회원'],
    [38, 62],
    (_, i) => `/chats?startedAs=${i ? 'MEMBER' : 'GUEST'}`,
  ),
  dist(
    'member-chats',
    '회원별 채팅방 생성 횟수',
    '해당 기간에 채팅방을 만든 회원만 집계',
    '명',
    ['1개', '2개', '3~4개', '5~9개', '10개+'],
    [812, 460, 392, 210, 127],
    (_, i) => `/members?chatBucket=${i}`,
  ),
  dist(
    'first-message',
    '첫 사용자 메시지까지 시간',
    '900초 이하만 통계 · 초과 42개, 입력 없음 410개 제외',
    '초',
    ['평균', 'P50', 'P75', 'P90'],
    [42, 19, 38, 94],
    () => '/chats?hasFirstMessage=true',
  ),
  dist(
    'ai-latency',
    '기능별 AI 호출 지연',
    '성공 호출 중 latency가 있는 호출의 평균 지연',
    '초',
    ['chat_response', 'story_creation', 'chat_image'],
    [3.8, 12.4, 8.6],
    (l) => (l === 'story_creation' ? '/stories' : `/chats?aiFeature=${l}`),
  ),
  dist(
    'ai-success',
    '기능별 AI 성공률',
    '완료된 호출(성공+실패) 중 성공 · 미완료 제외',
    '%',
    ['chat_response', 'story_creation', 'chat_image'],
    [99.2, 97.8, 98.4],
    (l) => (l === 'story_creation' ? '/stories' : `/chats?aiFeature=${l}`),
  ),
  dist(
    'characters',
    '제작 세션 입력 인물 수',
    '주변 인물만 0~5명 · 오리지널 제작 세션 포함',
    '세션',
    ['0명', '1명', '2명', '3명', '4명', '5명'],
    [82, 196, 421, 305, 128, 62],
    (_, i) => `/stories?supportingCharacterCount=${i}`,
  ),
];

export function getDashboardCharts(days: number): DashboardCharts {
  const selected = daily.slice(-days);

  return {
    asOf: summary.asOf,
    from: selected[0].date,
    to: selected[selected.length - 1].date,
    daily: selected,
    distributions: [
      ...distributions,
      dist(
        'attendance',
        '일별 출석 회원 수',
        'KST 날짜 · ATTENDANCE_REWARD의 고유 회원 수',
        '명',
        selected.map((d) => d.date),
        selected.map((d) => d.attendance),
        (l) => `/members?attendanceDate=${l}`,
      ),
    ],
  };
}
