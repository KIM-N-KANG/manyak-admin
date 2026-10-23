import { genreDepthTitle } from '@/features/dashboard/chart-data';
import type { DateRange } from '@/features/dashboard/date-range';
import type {
  ChartLink,
  DailyMetrics,
  DashboardCharts,
  DashboardSummary,
  Distribution,
} from '@/features/dashboard/types';
import { isCreditMetric } from '@/features/members/credit-metrics';
import { chatBucket, turnBounds } from '@/fixtures/cohorts';
import {
  aiCalls,
  chats,
  creationSessions,
  getChatCounts,
  getMemberTransactions,
  members,
  payments,
  stories,
} from '@/fixtures/entities';
import { inPeriod, kstDate } from '@/fixtures/query';
import { rangeDaily } from '@/fixtures/range-daily';

const asOf = '2026-10-21T09:00:00Z';
const today = kstDate(asOf);
const ledger = members.flatMap((member) =>
  getMemberTransactions(member.memberId),
);
const sum = <T>(rows: T[], value: (row: T) => number) =>
  rows.reduce((total, row) => total + value(row), 0);
const isToday = (value: string) => kstDate(value) === today;
const completedOrders = payments.filter((order) => Boolean(order.completedAt));

export const summary: DashboardSummary = {
  asOf,
  todayStartsAt: '2026-10-20T15:00:00Z',
  members: {
    total: members.filter((m) => m.status !== 'DELETED').length,
    joinedToday: members.filter((m) => isToday(m.createdAt)).length,
  },
  chats: {
    startedTotal: chats.length,
    startedToday: chats.filter((c) => isToday(c.startedAt)).length,
    turnsTotal: sum(chats, (c) => c.turnCount),
    turnsToday: sum(
      chats.filter((c) => isToday(c.lastActiveAt)),
      (c) => c.turnCount,
    ),
  },
  stories: {
    total: stories.length,
    createdToday: stories.filter((s) => isToday(s.createdAt)).length,
  },
  credits: {
    grantedTotal: sum(
      ledger.filter((t) => isCreditMetric(t, 'granted')),
      (t) => t.amount,
    ),
    grantedToday: sum(
      ledger.filter(
        (t) => isToday(t.createdAt) && isCreditMetric(t, 'granted'),
      ),
      (t) => t.amount,
    ),
    spentTotal: sum(
      ledger.filter((t) => isCreditMetric(t, 'spent')),
      (t) => -t.amount,
    ),
    spentToday: sum(
      ledger.filter((t) => isToday(t.createdAt) && isCreditMetric(t, 'spent')),
      (t) => -t.amount,
    ),
  },
  payments: {
    completedTotal: completedOrders.length,
    completedToday: completedOrders.filter((p) => isToday(p.completedAt))
      .length,
    amountKrwTotal: sum(completedOrders, (p) => p.priceKrw),
    amountKrwToday: sum(
      completedOrders.filter((p) => isToday(p.completedAt)),
      (p) => p.priceKrw,
    ),
  },
};

const daily: DailyMetrics[] = Array.from({ length: 366 }, (_, i) => ({
  date: new Date(Date.UTC(2025, 9, 21 + i)).toISOString().slice(0, 10),
  joined: 0,
  chats: 0,
  turns: 0,
  stories: 0,
  granted: 0,
  spent: 0,
  payments: 0,
  revenue: 0,
  attendance: 0,
}));
const byDate = new Map(daily.map((d) => [d.date, d]));

for (const member of members) {
  const day = byDate.get(kstDate(member.createdAt));

  if (day) day.joined++;
}

for (const chat of chats) {
  const start = byDate.get(kstDate(chat.startedAt));

  if (start) start.chats++;

  const active = byDate.get(kstDate(chat.lastActiveAt));

  if (active) active.turns += chat.turnCount;
}

for (const story of stories) {
  const day = byDate.get(kstDate(story.createdAt));

  if (day) day.stories++;
}

for (const order of completedOrders) {
  const day = byDate.get(kstDate(order.completedAt));

  if (day) {
    day.payments++;
    day.revenue += order.priceKrw;
  }
}

for (const transaction of ledger) {
  const day = byDate.get(kstDate(transaction.createdAt));

  if (day) {
    if (isCreditMetric(transaction, 'granted'))
      day.granted += transaction.amount;

    if (isCreditMetric(transaction, 'spent')) day.spent -= transaction.amount;
  }
}

for (const member of members) {
  const dates = new Set(
    getMemberTransactions(member.memberId)
      .filter((t) => t.reason === 'ATTENDANCE_REWARD' && t.amount > 0)
      .map((t) => kstDate(t.createdAt)),
  );

  for (const date of dates) {
    const day = byDate.get(date);

    if (day) day.attendance++;
  }
}

function distribution(
  chartId: string,
  title: string,
  description: string,
  unit: string,
  labels: string[],
  value: (label: string, index: number) => number,
  link: (label: string, index: number) => ChartLink,
): Distribution {
  return {
    chartId,
    category:
      chartId === 'started-as' || chartId === 'member-chats'
        ? 'users'
        : chartId === 'characters'
          ? 'content'
          : chartId.startsWith('ai-')
            ? 'ai-quality'
            : 'engagement',
    title,
    description,
    unit,
    points: labels.map((label, index) => ({
      label,
      value: value(label, index),
      link: link(label, index),
    })),
  };
}

function average(values: number[]) {
  return values.length ? sum(values, (v) => v) / values.length : 0;
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;

  const sorted = values.toSorted((a, b) => a - b);
  const at = (sorted.length - 1) * p;
  const lo = Math.floor(at);

  return sorted[lo] + (sorted[Math.ceil(at)] - sorted[lo]) * (at - lo);
}

export function getDashboardCharts(days: number | DateRange): DashboardCharts {
  const selected =
    typeof days === 'number'
      ? daily.slice(-days)
      : rangeDaily(daily, days, {
          joined: 0,
          chats: 0,
          turns: 0,
          stories: 0,
          granted: 0,
          spent: 0,
          payments: 0,
          revenue: 0,
          attendance: 0,
        });
  const from = typeof days === 'number' ? selected[0].date : days.from;
  const to =
    typeof days === 'number' ? selected[selected.length - 1].date : days.to;
  const period = new URLSearchParams({ from, to });
  const periodChats = chats.filter((c) => inPeriod(c.startedAt, period));
  const counts = [...getChatCounts(from, to).values()];
  const calls = aiCalls.filter((call) => inPeriod(call.createdAt, period));
  const sessions = creationSessions.filter((session) =>
    inPeriod(session.createdAt, period),
  );
  const eligible = periodChats
    .filter(
      (c) => c.firstMessageSeconds !== null && c.firstMessageSeconds <= 900,
    )
    .map((c) => c.firstMessageSeconds!);
  const link = (
    list: ChartLink['list'],
    filters: Record<string, string> = {},
    prefix = '',
  ) => {
    const q = new URLSearchParams(filters);

    q.set(prefix ? prefix + 'From' : 'from', from);
    q.set(prefix ? prefix + 'To' : 'to', to);

    return { list, params: Object.fromEntries(q) };
  };
  const features = [
    'chat_response',
    'choice_generation',
    'storyline_generation',
    'story_completion',
  ];
  const aiLink = (feature: string, latency: boolean) =>
    link(
      ['storyline_generation', 'story_completion'].includes(feature)
        ? 'stories'
        : 'chats',
      {
        aiFeature: feature,
        aiStatus: latency ? 'SUCCEEDED' : 'FINISHED',
        ...(latency ? { hasLatency: 'true' } : {}),
      },
      'ai',
    );

  return {
    asOf,
    from,
    to,
    daily: selected,
    distributions: [
      distribution(
        'genre-depth',
        genreDepthTitle,
        '채팅 시작일 기준, 복수 장르는 각각 포함, 평균 현재 턴',
        '턴',
        [
          ...new Set(
            stories.flatMap((story) =>
              story.genre.split(',').map((genre) => genre.trim()),
            ),
          ),
        ],
        (label) =>
          average(
            periodChats
              .filter((c) =>
                c.story.genre
                  .split(',')
                  .map((g) => g.trim())
                  .includes(label),
              )
              .map((c) => c.turnCount),
          ),
        (label) => link('stories', { genre: label }, 'chat'),
      ),
      distribution(
        'turns',
        '턴 수 분포',
        '채팅 시작일 기준, 구간별 채팅 수',
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
        (_, i) =>
          periodChats.filter(
            (c) =>
              c.turnCount >= turnBounds[i][0] &&
              c.turnCount <= turnBounds[i][1],
          ).length,
        (_, i) => link('chats', { turnBucket: String(i) }),
      ),
      distribution(
        'started-as',
        '채팅 소유자 게스트와 회원',
        '현재 소유 회원 유무 기준, 게스트 이관은 회원으로 집계',
        '%',
        ['게스트', '회원'],
        (_, i) =>
          periodChats.length
            ? (periodChats.filter(
                (c) => c.startedAs === (i ? 'MEMBER' : 'GUEST'),
              ).length /
                periodChats.length) *
              100
            : 0,
        (_, i) => link('chats', { startedAs: i ? 'MEMBER' : 'GUEST' }),
      ),
      distribution(
        'member-chats',
        '회원별 채팅 생성 횟수',
        '해당 기간에 채팅을 만든 회원만 집계, 가입일과 무관',
        '명',
        ['1개', '2개', '3~4개', '5~9개', '10개+'],
        (_, i) => counts.filter((count) => chatBucket(count) === i).length,
        (_, i) => link('members', { chatBucket: String(i) }, 'chat'),
      ),
      distribution(
        'first-message',
        '첫 사용자 입력까지 걸린 시간',
        `900초 이하만 통계, 초과 ${periodChats.filter((c) => c.firstMessageSeconds !== null && c.firstMessageSeconds > 900).length}개, 입력 없음 ${periodChats.filter((c) => c.firstMessageSeconds === null).length}개 제외`,
        '초',
        ['평균', 'P50', 'P75', 'P90'],
        (_, i) =>
          i ? percentile(eligible, [0, 0.5, 0.75, 0.9][i]) : average(eligible),
        () => link('chats', { hasFirstMessage: 'true' }),
      ),
      distribution(
        'ai-latency',
        '기능별 AI 평균 호출 시간',
        'AI 호출 생성일 기준, 성공 호출 중 지연값이 있는 호출의 평균',
        '초',
        features,
        (feature) =>
          average(
            calls
              .filter(
                (c) =>
                  c.feature === feature &&
                  c.status === 'SUCCEEDED' &&
                  c.latencySeconds !== null,
              )
              .map((c) => c.latencySeconds!),
          ),
        (feature) => aiLink(feature, true),
      ),
      distribution(
        'ai-success',
        '기능별 AI 성공률',
        'AI 호출 생성일 기준, 완료 호출(성공+실패) 중 성공, 미완료 제외',
        '%',
        features,
        (feature) => {
          const finished = calls.filter(
            (c) => c.feature === feature && c.status !== 'STARTED',
          );

          return finished.length
            ? (finished.filter((c) => c.status === 'SUCCEEDED').length /
                finished.length) *
                100
            : 0;
        },
        (feature) => aiLink(feature, false),
      ),
      distribution(
        'characters',
        '간편 제작별 입력 주변 인물 수',
        '제작 세션 생성일 기준, 주변 인물만 0~5명, 오리지널 포함',
        '건',
        ['0명', '1명', '2명', '3명', '4명', '5명'],
        (_, i) =>
          sessions.filter((s) => s.supportingCharacterCount === i).length,
        (_, i) =>
          link('stories', { supportingCharacterCount: String(i) }, 'creation'),
      ),
    ],
  };
}
