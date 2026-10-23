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
import { playInstalls } from '@/fixtures/play-installs';

const state = vi.hoisted(() => ({
  charts: undefined as DashboardCharts | undefined,
  chartsPending: false,
  chartsError: false,
  search: 'days=7',
  summary: undefined as DashboardSummary | undefined,
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(state.search),
  useRouter: () => ({ push: state.push, replace: vi.fn() }),
}));
vi.mock('@/features/shared/use-api', () => ({
  useApi: (url: string) => ({
    data: url.includes('/play-installs')
      ? playInstalls
      : url.includes('/summary')
        ? state.summary
        : url.includes('/analytics')
          ? getDashboardAnalytics(7)
          : state.charts,
    isPending: url.includes('/charts') && state.chartsPending,
    isError: url.includes('/charts') && state.chartsError,
    error:
      url.includes('/charts') && state.chartsError
        ? new Error('Charts unavailable')
        : null,
    refetch: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T10:00:00Z'));
  state.charts = getDashboardCharts(7);
  state.chartsPending = false;
  state.chartsError = false;
  state.search = 'days=7';
  state.summary = structuredClone(summary);
  state.push.mockReset();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
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
  category: 'engagement',
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
    screen.getByText('상위 30개, 외 5개 장르는 아래 표에서 확인해 주세요.'),
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
  expect(screen.getByText('60.0%')).toBeTruthy();
  expect(screen.getByText('게스트 60.0%')).toBeTruthy();
  expect(screen.getByText('회원 40.0%')).toBeTruthy();
  expect(
    container.querySelector('.recharts-legend-wrapper')?.textContent,
  ).toContain('게스트');
  expect(
    container.querySelector('.recharts-sector')?.getAttribute('stroke-width'),
  ).toBe('2');
  fireEvent.click(sectors[1]);
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining(member));
});

it('채팅이 없는 비율에서는 가짜 도넛 대신 빈 상태를 표시한다', () => {
  const { container } = draw(
    distribution('started-as', [point('게스트', 0), point('회원', 0)], '%'),
  );

  expect(screen.getByText('집계된 채팅이 없습니다.')).toBeTruthy();
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

it('요약 카드에는 차트를 넣지 않고 바로 아래의 기존 일별 차트로 추이를 통합한다', () => {
  const { container } = render(createElement(DashboardScreen));
  const summary = screen.getByRole('region', { name: '요약 지표' });
  const cards = within(summary).getAllByRole('link');

  expect(cards).toHaveLength(8);
  expect(summary.className).toContain('sm:grid-cols-2');
  expect(summary.className).toContain('xl:grid-cols-4');

  for (const card of cards) expect(card.querySelector('svg')).toBeNull();

  expect(
    container.querySelectorAll('[aria-label$="기간별 추이"]'),
  ).toHaveLength(0);
  expect(summary.textContent).not.toContain('어제');
  expect(container.textContent).not.toContain('오늘은 KST 자정부터');

  const trendHeading = screen.getByRole('heading', { name: '일별 추이' });
  const analyticsHeading = screen.getByRole('heading', {
    name: 'Amplitude 사용자 지표',
  });

  expect(
    summary.compareDocumentPosition(trendHeading) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    trendHeading.compareDocumentPosition(analyticsHeading) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  const selectable = Array.from(
    screen.getByRole('combobox', { name: '지표' }).querySelectorAll('option'),
  ).map((option) => option.value);

  expect(selectable).toEqual(
    expect.arrayContaining([
      'joined',
      'chats',
      'turns',
      'stories',
      'granted',
      'spent',
      'payments',
      'revenue',
    ]),
  );

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

  expect(analytics.querySelectorAll('.recharts-line')).toHaveLength(6);
  expect(analytics.querySelectorAll('.recharts-label-list')).toHaveLength(6);

  const last = getDashboardAnalytics(7).daily.at(-1)!;

  expect(analytics.textContent).toContain(
    `합계 ${chartNumber(last.activeUsers.total)}`,
  );
  expect(analytics.textContent).toContain(
    `합계 ${chartNumber(last.newUsers.total)}`,
  );

  expect(
    analytics.querySelector('.recharts-legend-wrapper')?.textContent,
  ).toContain('Web');

  for (const plot of analytics.querySelectorAll('.recharts-line-chart')) {
    const curves = plot.querySelectorAll('.recharts-line-curve');

    expect(
      Array.from(curves).map((line) => line.getAttribute('stroke')),
    ).toEqual([
      'var(--color-total)',
      'var(--color-web)',
      'var(--color-android)',
    ]);
    expect(curves[1].getAttribute('stroke-dasharray')).toBe('6 3');
    expect(curves[2].getAttribute('stroke-dasharray')).toBe('2 3');
    expect(plot.querySelectorAll('.recharts-yAxis')).toHaveLength(1);
    expect(plot.querySelector('.recharts-legend-wrapper')!.textContent).toBe(
      '합계WebAndroid',
    );
  }

  expect(screen.getByText(/Amplitude 일별 수치/)).toBeTruthy();
  expect(screen.getByText('일별 수치와 목록 이동')).toBeTruthy();
});

it('미리보기는 35개 장르 중 상위 30개와 나머지 안내·전체 표를 표시하고 서버 제목을 표시한다', () => {
  const genre = state.charts!.distributions.find(
    (item) => item.chartId === 'genre-depth',
  )!;

  expect(genre.title).toBe('장르별 평균 턴 수');
  expect(genre.points).toHaveLength(35);
  expect(rankedPoints(genre).every((point) => point.value > 0)).toBe(true);
  state.charts = {
    ...state.charts!,
    distributions: [{ ...genre, title: '서버 장르 제목' }],
  };

  const { container } = render(createElement(DashboardAnalysisScreen));

  expect(screen.getByRole('heading', { name: '서버 장르 제목' })).toBeTruthy();
  expect(
    screen.getByText('상위 30개, 외 5개 장르는 아래 표에서 확인해 주세요.'),
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

it('누적을 대표 숫자, 오늘 0과 기간 합계를 보조로 표시하고 원 단위 천 구분을 유지한다', () => {
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

  const cumulative = within(memberCard).getByText('1,234').closest('dd')!;
  const today = within(memberCard).getByText('0').closest('dd')!;

  expect(cumulative.className).toContain('sm:text-3xl');
  expect(today.parentElement!.className).toContain('text-sm');
  expect(within(memberCard).getByText('1,234')).toBeTruthy();
  expect(within(memberCard).getByText('최근 7일 합계 6명')).toBeTruthy();
  expect(within(paymentCard).getByText('1,234,567')).toBeTruthy();
  expect(within(paymentCard).getByText('최근 7일 합계 13,345원')).toBeTruthy();
});

it.each([
  [true, false, '불러오는 중'],
  [false, true, '불러오기 실패'],
] as const)(
  '차트 값이 없으면 단위 없이 상태를 표시한다: %s, %s',
  (pending, error, status) => {
    state.charts = undefined;
    state.chartsPending = pending;
    state.chartsError = error;
    render(createElement(DashboardScreen));

    for (const label of ['회원', '채팅 시작', '이프 적립']) {
      const card = screen.getByRole('link', { name: new RegExp(`^${label}`) });

      expect(within(card).getByText(`최근 7일 합계 ${status}`)).toBeTruthy();
    }
  },
);

it.each(['success', 'pending', 'error'])(
  '직접 선택한 기간의 합계 또는 로드 상태만 표시한다: %s',
  (status) => {
    state.search = 'from=2026-10-01&to=2026-10-10';
    state.chartsPending = status === 'pending';
    state.chartsError = status === 'error';
    state.charts =
      status === 'success' ? { ...state.charts!, daily: [] } : undefined;
    render(createElement(DashboardScreen));

    const memberCard = screen.getByRole('link', { name: /^회원/ });
    const total =
      status === 'success'
        ? '0명'
        : status === 'pending'
          ? '불러오는 중'
          : '불러오기 실패';

    expect(
      within(memberCard).getByText(`2026-10-01 ~ 2026-10-10 합계 ${total}`),
    ).toBeTruthy();
  },
);

it('정본의 구역 순서와 서버 제목·설명을 유지하고 기능 표시 이름만 바꾼다', () => {
  render(createElement(DashboardAnalysisScreen));

  const categories = ['사용자', '채팅 참여', '콘텐츠', 'AI 품질'];

  expect(
    screen
      .getAllByRole('region')
      .filter((node) =>
        categories.includes(node.getAttribute('aria-label') ?? ''),
      )
      .map((node) => node.getAttribute('aria-label')),
  ).toEqual(categories);

  for (const item of state.charts!.distributions) {
    expect(screen.getByRole('heading', { name: item.title })).toBeTruthy();
    expect(screen.getByText(item.description)).toBeTruthy();
  }

  expect(screen.getAllByText('간편 제작 →')).toHaveLength(2);
  expect(screen.queryByText('story_completion →')).toBeNull();
  expect(screen.getByRole('region', { name: '콘텐츠' }).textContent).toContain(
    '값 (건)',
  );
});
