// @vitest-environment jsdom
import { createElement } from 'react';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { DashboardAnalysisScreen } from '@/features/dashboard/analysis-screen';
import {
  chartNumber,
  periodAverage,
  rankedPoints,
} from '@/features/dashboard/chart-data';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { DistributionChart } from '@/features/dashboard/distribution-chart';
import type {
  ChartPoint,
  DashboardCharts,
  DashboardSummary,
  Distribution,
} from '@/features/dashboard/types';
import { getDashboardAnalytics } from '@/fixtures/analytics';
import { getDashboardCharts, summary } from '@/fixtures/dashboard';

const state = vi.hoisted(() => ({
  charts: undefined as DashboardCharts | undefined,
  summary: undefined as DashboardSummary | undefined,
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams('days=7'),
  useRouter: () => ({ push: state.push }),
}));
vi.mock('@/features/shared/use-api', () => ({
  useApi: (url: string) => ({
    data: url.includes('/summary')
      ? state.summary
      : url.includes('/analytics')
        ? getDashboardAnalytics(7)
        : state.charts,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

beforeEach(() => {
  state.charts = getDashboardCharts(7);
  state.summary = structuredClone(summary);
  state.push.mockReset();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const point = (label: string, value: number): ChartPoint => ({
  label,
  value,
  link: { list: 'chats', params: { feature: label } },
});
const distribution = (
  chartId: string,
  points: ChartPoint[],
  unit = '개',
): Distribution => ({
  chartId,
  title: `${chartId} 차트`,
  description: '테스트 설명',
  unit,
  points,
});

function draw(data: Distribution) {
  const onSelect = vi.fn();
  const view = render(
    createElement(DistributionChart, { distribution: data, onSelect }),
  );

  return { ...view, onSelect };
}

it('장르 상위 30개를 값 내림차순 세로 막대로 그리며 정렬 후에도 원래 링크를 선택한다', async () => {
  const points = Array.from({ length: 35 }, (_, index) =>
    point(`장르${index}`, index + 1),
  );
  const data = distribution('genre-depth', points, '턴');
  const { container, onSelect } = draw(data);
  const bars = container.querySelectorAll('.recharts-bar-rectangle');

  expect(bars).toHaveLength(30);
  expect(
    screen.getByText('상위 30개 · 외 5개 장르는 아래 표에서 확인하세요.'),
  ).toBeTruthy();

  const scroll = screen.getByRole('region', {
    name: '장르별 평균 턴 수 차트 가로 스크롤',
  });

  expect(scroll.classList.contains('overflow-x-auto')).toBe(true);
  expect(scroll.getAttribute('tabindex')).toBe('0');
  expect(
    scroll.querySelector<HTMLElement>('[data-slot="chart"]')?.style.minWidth,
  ).toBe('2600px');

  const ticks = container.querySelectorAll(
    '.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value',
  );

  expect(Array.from(ticks).map((node) => node.textContent)).toEqual(
    points
      .toReversed()
      .slice(0, 30)
      .map((p) => p.label),
  );
  expect(ticks[0].getAttribute('transform')).toContain('rotate(-40');
  fireEvent.click(bars[0]);
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(points[34]));
  expect(points[0].value).toBe(1);
  expect(rankedPoints(data).at(-1)?.value).toBe(6);
});

it('30개 제한은 장르에만 적용하고 AI 지연은 전체를 가로 순위로 그린다', () => {
  const data = distribution(
    'ai-latency',
    [point('B', 1), point('A', 10), point('C', 5)],
    '초',
  );
  const { container, onSelect } = draw(data);

  expect(
    Array.from(
      container.querySelectorAll(
        '.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value',
      ),
    ).map((node) => node.textContent),
  ).toEqual(['A', 'C', 'B']);
  fireEvent.click(container.querySelectorAll('.recharts-bar-rectangle')[1]);
  expect(onSelect).toHaveBeenCalledWith(data.points[2]);
  expect(
    rankedPoints(
      distribution(
        'ai-latency',
        Array.from({ length: 31 }, (_, i) => point(String(i), i)),
      ),
    ),
  ).toHaveLength(31);
});

it.each(['turns', 'member-chats', 'characters'])(
  '%s 히스토그램은 구간 순서와 클릭 링크를 유지한다',
  (chartId) => {
    const data = distribution(chartId, [
      point('0', 2),
      point('1', 8),
      point('2~3', 4),
    ]);
    const { container, onSelect } = draw(data);

    expect(
      Array.from(
        container.querySelectorAll(
          '.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value',
        ),
      ).map((node) => node.textContent),
    ).toEqual(['0', '1', '2~3']);
    fireEvent.click(container.querySelectorAll('.recharts-bar-rectangle')[2]);
    expect(onSelect).toHaveBeenCalledWith(data.points[2]);
  },
);

it('게스트·회원 비율은 도넛 조각·퍼센트 라벨·범례·가운데 게스트 값으로 표시한다', () => {
  const guest = {
    ...point('게스트', 60),
    link: { list: 'chats' as const, params: { startedAs: 'GUEST' } },
  };
  const member = {
    ...point('회원', 40),
    link: { list: 'chats' as const, params: { startedAs: 'MEMBER' } },
  };
  const { container, onSelect } = draw(
    distribution('started-as', [guest, member], '%'),
  );
  const sectors = container.querySelectorAll('.recharts-pie-sector');

  expect(sectors).toHaveLength(2);
  expect(screen.getByText('60%')).toBeTruthy();
  expect(screen.getByText('게스트 60%')).toBeTruthy();
  expect(screen.getByText('회원 40%')).toBeTruthy();
  expect(
    container.querySelector('.recharts-legend-wrapper')?.textContent,
  ).toContain('게스트');
  expect(
    container.querySelector('.recharts-sector')?.getAttribute('stroke-width'),
  ).toBe('2');
  fireEvent.click(sectors[1]);
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining(member));
});

it('채팅방이 없는 비율에서는 가짜 도넛 대신 빈 상태를 표시한다', () => {
  const { container } = draw(
    distribution('started-as', [point('게스트', 0), point('회원', 0)], '%'),
  );

  expect(screen.getByText('집계된 채팅방이 없습니다.')).toBeTruthy();
  expect(container.querySelector('.recharts-pie-sector')).toBeNull();
});

it('첫 메시지 백분위는 한 축 위 연결 점이며 평균은 별도 마름모이고 점 링크를 보존한다', () => {
  const data = distribution(
    'first-message',
    [
      point('평균', 120),
      point('P50', 80),
      point('P75', 150),
      point('P90', 220),
    ],
    '초',
  );
  const { container, onSelect } = draw(data);

  expect(container.querySelectorAll('.recharts-scatter-symbol')).toHaveLength(
    4,
  );
  expect(container.querySelector('.recharts-scatter-line')).toBeTruthy();
  expect(screen.getByText('P50 80초')).toBeTruthy();
  expect(screen.getByText('P90 220초')).toBeTruthy();
  expect(screen.getByText('평균 120초')).toBeTruthy();
  expect(
    container.querySelector('.recharts-legend-wrapper')?.textContent,
  ).toContain('평균 (마름모)');
  fireEvent.click(container.querySelectorAll('.recharts-scatter-symbol')[1]);
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining(data.points[2]),
  );
});

it('성공률은 0~100 트랙과 % 수치이며 95% 미만에만 경고 아이콘과 문구를 표시한다', () => {
  const data = distribution(
    'ai-success',
    [point('지연 감지', 94.9), point('스토리', 95), point('채팅', 100)],
    '%',
  );
  const { container, onSelect } = draw(data);

  expect(
    container.querySelectorAll('.recharts-bar-background-rectangle'),
  ).toHaveLength(3);
  expect(screen.getAllByText(/성공률 95% 미만/)).toHaveLength(1);
  expect(screen.getByText('94.9%')).toBeTruthy();
  expect(
    screen.getByText(/성공률 95% 미만/).querySelector('[aria-hidden="true"]')
      ?.textContent,
  ).toBe('⚠');
  fireEvent.click(container.querySelectorAll('.recharts-bar-rectangle')[0]);
  expect(onSelect).toHaveBeenCalledWith(data.points[0]);
});

it('개요 카드 8개의 스파크라인과 일별 2px 선·평균 점선을 실제 SVG로 그린다', () => {
  const { container } = render(createElement(DashboardScreen));
  const sparklines = container.querySelectorAll('[aria-label$="기간별 추이"]');

  expect(sparklines).toHaveLength(8);

  for (const sparkline of sparklines) {
    expect(sparkline.querySelector('.recharts-line-curve')).toBeTruthy();
    expect(sparkline.querySelector('.recharts-cartesian-axis')).toBeNull();
    expect(sparkline.querySelector('.recharts-cartesian-grid')).toBeNull();
  }

  const daily = container.querySelector('[aria-label="가입 일별 추이"]')!;

  expect(
    daily.querySelector('.recharts-line-curve')?.getAttribute('stroke-width'),
  ).toBe('2');
  expect(daily.querySelector('.recharts-area')).toBeNull();
  expect(daily.querySelectorAll('.recharts-line-dot')).toHaveLength(0);
  expect(
    daily
      .querySelector('.recharts-reference-line-line')
      ?.getAttribute('stroke-dasharray'),
  ).toBe('4 4');
  expect(daily.textContent).toContain(
    `기간 평균 ${chartNumber(periodAverage(state.charts!.daily.map((day) => day.joined)))}`,
  );

  const analytics = screen.getByRole('region', {
    name: 'Amplitude 사용자 지표',
  });

  expect(analytics.querySelectorAll('.recharts-line')).toHaveLength(2);
  expect(analytics.querySelectorAll('.recharts-label-list')).toHaveLength(2);

  const last = getDashboardAnalytics(7).daily.at(-1)!;

  expect(analytics.textContent).toContain(
    `활성 ${chartNumber(last.activeUsers)}`,
  );
  expect(analytics.textContent).toContain(`신규 ${chartNumber(last.newUsers)}`);

  expect(
    analytics.querySelector('.recharts-legend-wrapper')?.textContent,
  ).toContain('활성');
  expect(screen.getByText(/Amplitude 일별 수치/)).toBeTruthy();
  expect(screen.getByText('일별 수치와 목록 이동')).toBeTruthy();
});

it('미리보기는 35개 장르 중 상위 30개와 나머지 안내·전체 표를 표시하고 이전 서버 제목도 바꿔 표시한다', () => {
  const genre = state.charts!.distributions.find(
    (item) => item.chartId === 'genre-depth',
  )!;

  expect(genre.title).toBe('장르별 평균 턴 수');
  expect(genre.points).toHaveLength(35);
  expect(rankedPoints(genre).every((point) => point.value > 0)).toBe(true);
  state.charts = {
    ...state.charts!,
    distributions: [{ ...genre, title: '장르별 채팅 깊이' }],
  };

  const { container } = render(createElement(DashboardAnalysisScreen));

  expect(
    screen.getByRole('heading', { name: '장르별 평균 턴 수' }),
  ).toBeTruthy();
  expect(
    screen.getByText('상위 30개 · 외 5개 장르는 아래 표에서 확인하세요.'),
  ).toBeTruthy();
  expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(
    30,
  );

  const details = screen.getByText('수치 및 관련 목록').closest('details')!;

  expect(within(details).getAllByRole('link')).toHaveLength(35);
  expect(
    within(details)
      .getByRole('link', { name: '로맨스 →' })
      .getAttribute('href'),
  ).toContain('genre=%EB%A1%9C%EB%A7%A8%EC%8A%A4');
});

it('일별 선의 호버에는 십자선·날짜 툴팁을 표시하고 클릭하면 해당 날짜 목록으로 이동한다', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 320, 200),
  );

  const { container } = render(createElement(DashboardScreen));
  const daily = container.querySelector('[aria-label="가입 일별 추이"]')!;
  const wrapper = daily.querySelector('.recharts-wrapper')!;

  fireEvent.mouseMove(wrapper, { clientX: 170, clientY: 90 });
  await waitFor(() =>
    expect(daily.querySelector('.recharts-cross')).toBeTruthy(),
  );

  const tooltip = daily.querySelector('.recharts-tooltip-wrapper')!;
  const selectedDate = state.charts!.daily.find((day) =>
    tooltip.textContent?.includes(day.date),
  )?.date;

  expect(selectedDate).toBeTruthy();
  fireEvent.click(wrapper, { clientX: 170, clientY: 90 });
  await waitFor(() =>
    expect(state.push).toHaveBeenCalledWith(
      `/members?from=${selectedDate}&to=${selectedDate}`,
    ),
  );
});

it('오늘 0과 누적을 함께 표시하고 KST 어제·기간 합계와 원 단위 천 구분을 계산한다', () => {
  const daily = state.charts!.daily.at(-1)!;

  state.charts = {
    ...state.charts!,
    daily: [
      { ...daily, date: '2026-10-19', joined: 2, revenue: 1000 },
      { ...daily, date: '2026-10-20', joined: 4, revenue: 12345 },
      { ...daily, date: '2026-10-21', joined: 0, revenue: 0 },
    ],
  };
  state.summary = {
    ...state.summary!,
    asOf: '2026-10-20T15:03:00Z',
    todayStartsAt: '2026-10-20T15:00:00Z',
    members: { total: 1234, joinedToday: 0 },
    payments: {
      ...state.summary!.payments,
      amountKrwTotal: 1234567,
      amountKrwToday: 0,
    },
  };
  render(createElement(DashboardScreen));

  const memberCard = screen.getByRole('link', { name: /^회원/ });
  const paymentCard = screen.getByRole('link', { name: /^결제 금액/ });

  for (const card of [memberCard, paymentCard]) {
    expect(within(card).getByText('오늘', { selector: 'dt' })).toBeTruthy();
    expect(within(card).getByText('누적', { selector: 'dt' })).toBeTruthy();
    expect(within(card).getByText('0')).toBeTruthy();
  }

  expect(within(memberCard).getByText('1,234')).toBeTruthy();
  expect(
    within(memberCard).getByText('최근 7일 6 명 · 어제 4 명'),
  ).toBeTruthy();
  expect(within(paymentCard).getByText('1,234,567')).toBeTruthy();
  expect(
    within(paymentCard).getByText('최근 7일 13,345 원 · 어제 12,345 원'),
  ).toBeTruthy();
});

it('어제 원장이 없는 경우 실제 0으로 채우지 않고 미확인 값을 표시한다', () => {
  state.charts = {
    ...state.charts!,
    daily: state.charts!.daily.filter((day) => day.date !== '2026-10-20'),
  };
  render(createElement(DashboardScreen));

  const memberCard = screen.getByRole('link', { name: /^회원/ });

  expect(within(memberCard).getByText(/어제 — 명/)).toBeTruthy();
});
