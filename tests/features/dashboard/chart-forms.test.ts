// @vitest-environment jsdom
import { createElement } from 'react';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { InfraChart } from '@/features/analytics/infra/infra-chart';
import { DashboardAnalysisScreen } from '@/features/dashboard/analysis-screen';
import {
  aiFeatureLabel,
  aiFeatures,
  chartNumber,
  periodAverage,
  rankedPoints,
} from '@/features/dashboard/chart-data';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { DistributionChart } from '@/features/dashboard/distribution-chart';
import { getDistributionHref } from '@/features/dashboard/links';
import type {
  ChartPoint,
  DashboardCharts,
  DashboardSummary,
  Distribution,
} from '@/features/dashboard/types';
import { getDashboardAnalytics } from '@/fixtures/analytics';
import { getDashboardCharts, summary } from '@/fixtures/dashboard';
import { infraMetricsFixture } from '@/fixtures/infra';
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
  chats: 5,
  totalTurns: value * 5,
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
  const data = distribution('genre-depth', points.toReversed(), '턴');
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
  expect(container.querySelector('.recharts-legend-wrapper')?.textContent).toBe(
    '백분위평균',
  );

  const legendItems = container.querySelectorAll('.recharts-legend-item');
  const meanLegend = Array.from(legendItems).find(
    (item) => item.textContent === '평균',
  )!;
  const percentileLegend = Array.from(legendItems).find(
    (item) => item.textContent === '백분위',
  )!;
  const diamond = meanLegend.querySelector('path')!;

  expect(diamond.getAttribute('d')).toMatch(
    /^M[^A-Z]+L[^A-Z]+L[^A-Z]+L[^A-Z]+Z$/,
  );

  const coordinates = diamond
    .getAttribute('d')!
    .match(/-?\d+(?:\.\d+)?/g)!
    .map(Number);

  expect(coordinates).toHaveLength(8);
  expect([
    coordinates[0],
    coordinates[3],
    coordinates[4],
    coordinates[7],
  ]).toEqual([0, 0, 0, 0]);
  expect(coordinates[1]).toBeLessThan(0);
  expect(coordinates[2]).toBeGreaterThan(0);
  expect(coordinates[5]).toBeGreaterThan(0);
  expect(coordinates[6]).toBeLessThan(0);
  expect(diamond.getAttribute('fill')).toBe('var(--chart-2)');
  expect(percentileLegend.querySelector('path')?.getAttribute('d')).toContain(
    'A',
  );
  expect(percentileLegend.querySelector('path')?.getAttribute('fill')).toBe(
    'var(--primary)',
  );
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

  expect(cards).toHaveLength(10);
  expect(summary.className).toContain('sm:grid-cols-2');
  expect(summary.className).toContain('xl:grid-cols-5');

  for (const card of cards) expect(card.querySelector('svg')).toBeNull();

  expect(
    container.querySelectorAll('[aria-label$="기간별 추이"]'),
  ).toHaveLength(0);
  expect(summary.textContent).not.toContain('어제');
  expect(container.textContent).not.toContain('오늘은 KST 자정부터');

  const trendHeading = screen.getByRole('region', { name: '일별 지표 추이' });

  expect(
    screen.queryByRole('heading', { name: 'Amplitude 사용자 지표' }),
  ).toBeNull();
  expect(
    summary.compareDocumentPosition(trendHeading) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    within(summary)
      .getByRole('link', { name: '오늘 활성 사용자' })
      .getAttribute('href'),
  ).toBe('/analytics/users?tab=activity');
  expect(
    within(summary)
      .getByRole('link', { name: '앱 설치(Android)' })
      .getAttribute('href'),
  ).toBe('/analytics/acquisition?tab=installs');

  expect(screen.queryByRole('combobox', { name: '지표' })).toBeNull();

  const trends = within(trendHeading).getAllByRole('heading');

  expect(trends.map((node) => node.textContent)).toEqual([
    '가입',
    '채팅 시작',
    '턴',
    '스토리 생성',
    '이프 적립',
    '이프 소모',
    '결제 건수',
    '결제 금액 (환불 포함)',
  ]);
  expect(trendHeading.className).toContain('xl:grid-cols-4');

  for (const chart of trendHeading.querySelectorAll('[data-slot="chart"]')) {
    expect(chart.querySelectorAll('.recharts-yAxis')).toHaveLength(1);
    expect(chart.querySelectorAll('.recharts-line-curve')).toHaveLength(1);
    expect(
      chart
        .querySelector('.recharts-reference-line-line')
        ?.getAttribute('stroke-dasharray'),
    ).toBe('4 4');
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
  expect(daily.closest('[data-slot=card]')!.textContent).toContain(
    `기간 평균 ${chartNumber(periodAverage(state.charts!.daily.map((day) => day.joined)))}`,
  );

  expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(8);
  expect(screen.queryByText(/Amplitude 일별 수치/)).toBeNull();
  expect(screen.queryByLabelText('일별 기기 설치 수와 앱 삭제 수')).toBeNull();

  const tableDetails = screen
    .getByText('일별 수치와 목록 이동')
    .closest('details')!;

  expect(trendHeading.querySelectorAll('details')).toHaveLength(1);
  expect(tableDetails.hasAttribute('open')).toBe(false);
  expect(within(tableDetails).getAllByRole('columnheader')).toHaveLength(9);
  expect(within(tableDetails).getAllByRole('row')).toHaveLength(
    state.charts!.daily.length + 1,
  );

  for (const row of within(tableDetails).getAllByRole('row').slice(1)) {
    expect(within(row).getAllByRole('link')).toHaveLength(8);
  }
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
    members: { total: 1234, active: 1200, withdrawn: 34, joinedToday: 0 },
    payments: {
      ...state.summary!.payments,
      amountKrwTotal: 1234567,
      amountKrwToday: 0,
    },
  };
  render(createElement(DashboardScreen));

  const memberCard = screen.getByRole('link', { name: /^가입자/ });
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

    for (const label of ['가입자', '채팅 시작', '이프 적립']) {
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

    const memberCard = screen.getByRole('link', { name: /^가입자/ });
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
    expect(screen.queryByText(item.description)).toBeNull();
    expect(
      screen.getByRole('button', { name: `${item.title} 집계 안내` }),
    ).toBeTruthy();
  }

  expect(screen.getAllByText('간편 제작 →')).toHaveLength(2);
  expect(screen.queryByText('story_completion →')).toBeNull();
  expect(screen.getByRole('region', { name: '콘텐츠' }).textContent).toContain(
    '값 (건)',
  );
});

it('분포 설명은 본문에 없고 제목 옆 도움말에 포커스하면 응답 문구 그대로 열린다', async () => {
  render(createElement(DashboardAnalysisScreen));

  const item = state.charts!.distributions[0];

  expect(screen.queryByText(item.description)).toBeNull();

  const button = screen.getByRole('button', {
    name: `${item.title} 집계 안내`,
  });

  act(() => button.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
  expect(tooltip.textContent).toBe(item.description);
});

it('가입자 카드는 탈퇴 포함 누적과 오늘 값을 표시하고 전체 집계 문구를 포커스 도움말로 제공한다', async () => {
  state.summary!.members = {
    total: 1300,
    active: 1240,
    withdrawn: 60,
    joinedToday: 12,
  };
  render(createElement(DashboardScreen));

  const card = screen.getByRole('link', { name: /^가입자/ });

  expect(card.getAttribute('href')).toBe('/members');
  expect(within(card).getByText('1,300')).toBeTruthy();
  expect(within(card).getByText('12')).toBeTruthy();
  expect(screen.queryByRole('tooltip')).toBeNull();

  const button = screen.getByRole('button', { name: '가입자 집계 안내' });

  expect(button.closest('a')).toBeNull();
  act(() => button.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
  expect(tooltip.textContent).toBe(
    '탈퇴한 회원을 포함한 누적 가입자 수입니다. 현재 회원 1,240명, 누적 탈퇴 60명이며 팀 계정은 제외합니다.',
  );
  fireEvent.keyDown(button, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  expect(document.activeElement).toBe(button);
});

it('인프라의 근접한 끝 값과 첫 입력 시간 라벨은 실제 SVG에서 최소 18px 간격을 유지한다', () => {
  const data = infraMetricsFixture('2026-10-20', '2026-10-20');
  const at = data.alb!.requests.at(-1)!.at;
  const series = ['서버', 'AI', '알림'].map((label, i) => ({
    key: `s${i}`,
    label,
    color: 'var(--primary)',
    points: [{ at, value: 28 - i * 0.05 }],
  }));
  const view = render(
    createElement(InfraChart, { title: 'CPU 사용률', data, series, unit: '%' }),
  );
  const labels = Array.from(
    view.container.querySelectorAll('.chart-end-labels text'),
  );

  expect(labels).toHaveLength(3);
  expect(labels.map((node) => node.textContent)).toContain('알림 27.9%');

  const ys = labels
    .map((node) => Number(node.getAttribute('y')))
    .toSorted((a, b) => a - b);

  expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(18);
  expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(18);
  expect(
    view.container.querySelectorAll('.chart-end-labels line').length,
  ).toBeGreaterThan(0);
  view.unmount();

  const { container } = draw(
    distribution(
      'first-message',
      ['P50', 'P75', 'P90', '평균'].map((label) => point(label, 120)),
      '초',
    ),
  );
  const percentileLabels = Array.from(
    container.querySelectorAll('.chart-end-labels text'),
  );

  expect(percentileLabels).toHaveLength(4);

  const positions = percentileLabels
    .map((node) => Number(node.getAttribute('y')))
    .toSorted((a, b) => a - b);

  for (let i = 1; i < positions.length; i++)
    expect(positions[i] - positions[i - 1]).toBeGreaterThanOrEqual(18);
});

it('요약 카드 10개는 고정 최소 높이 없이 같은 행의 내용 높이에 맞춘다', () => {
  render(createElement(DashboardScreen));

  const grid = screen.getByRole('region', { name: '요약 지표' });

  expect(grid.children).toHaveLength(10);
  expect(grid.className).toContain('items-stretch');

  for (const card of grid.children)
    expect(card.className).not.toMatch(/(?:min-)?h-(?:\d|\[)/);

  const dbLink = within(grid).getByRole('link', { name: /가입자.*누적/ });

  expect(dbLink.className).toContain('h-full');
});

it('AI 품질은 기능 다섯 개의 고정 순서와 색을 유지하며 실시간 이미지 막대는 채팅 목록으로 이동한다', () => {
  const source = state.charts!.distributions.find(
    (d) => d.chartId === 'ai-success',
  )!;

  source.points.reverse();
  render(createElement(DashboardAnalysisScreen));

  const card = screen
    .getByRole('heading', { name: source.title })
    .closest('[data-slot="card"]')!;
  const charts = Array.from(card.querySelectorAll('[data-slot="chart"]'));

  expect(charts).toHaveLength(5);
  expect(charts.map((c) => c.getAttribute('aria-label'))).toEqual(
    aiFeatures.map((key) => `${aiFeatureLabel(key)} 성공률`),
  );
  charts.forEach((chart, i) =>
    expect(chart.querySelector('style')!.textContent).toContain(
      `var(--chart-${i + 1})`,
    ),
  );
  fireEvent.click(charts[2].querySelector('.recharts-bar-rectangle')!);

  const link = source.points.find((p) => p.label === 'chat_image')!.link;

  expect(link.list).toBe('chats');
  expect(link.params.aiFeature).toBe('chat_image');
  expect(state.push).toHaveBeenCalledWith(getDistributionHref(link));
});

it('AI 지연도 값 순위 대신 다섯 기능 순서·색을 쓰고 이미지 호출일 링크를 보존한다', () => {
  const source = state.charts!.distributions.find(
    (d) => d.chartId === 'ai-latency',
  )!;

  source.points.reverse();
  render(createElement(DashboardAnalysisScreen));

  const card = screen
    .getByRole('heading', { name: source.title })
    .closest('[data-slot="card"]')!;
  const ticks = card.querySelectorAll('.recharts-cartesian-axis-tick-value');
  const bars = card.querySelectorAll('.recharts-bar-rectangle');

  expect(
    Array.from(ticks)
      .map((t) => t.textContent)
      .filter((label) => aiFeatures.map(aiFeatureLabel).includes(label ?? '')),
  ).toEqual(aiFeatures.map(aiFeatureLabel));
  expect(bars).toHaveLength(5);
  expect(
    Array.from(bars).map((bar) =>
      bar.querySelector('path')?.getAttribute('fill'),
    ),
  ).toEqual([1, 2, 3, 4, 5].map((i) => `var(--chart-${i})`));
  fireEvent.click(bars[2]);

  const link = source.points.find((p) => p.label === 'chat_image')!.link;

  expect(link.params).toMatchObject({
    aiFeature: 'chat_image',
    aiStatus: 'SUCCEEDED',
    hasLatency: 'true',
  });
  expect(state.push).toHaveBeenCalledWith(getDistributionHref(link));
});

it('장르 소표본은 표에만 남기며 응답 순서·평균·채팅 수·총 턴 수와 빈 상태를 보존한다', async () => {
  const points = [
    { ...point('던전', 465), chats: 1, totalTurns: 465 },
    { ...point('로맨스', 10), chats: 6, totalTurns: 60 },
  ];
  const genre = distribution('genre-depth', points, '턴');

  state.charts = { ...state.charts!, distributions: [genre] };

  const view = render(createElement(DashboardAnalysisScreen));

  expect(
    view.container.querySelectorAll('.recharts-bar-rectangle'),
  ).toHaveLength(1);

  const table = screen.getByText('수치 및 관련 목록').closest('details')!;

  expect(within(table).getByText('차트 제외(채팅 5개 미만)')).toBeTruthy();
  expect(within(table).getAllByRole('row')).toHaveLength(3);
  expect(within(table).getByText('60턴')).toBeTruthy();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 360, 360),
  );

  const chart = screen.getByLabelText('장르별 평균 턴 수');

  fireEvent.mouseMove(chart.querySelector('.recharts-wrapper')!, {
    clientX: 180,
    clientY: 90,
  });
  await waitFor(() =>
    expect(
      chart.querySelector('.recharts-tooltip-wrapper')?.textContent,
    ).toContain('평균 10턴, 채팅 6개, 총 60턴'),
  );
  state.charts = {
    ...state.charts!,
    distributions: [{ ...genre, points: [points[0]] }],
  };
  view.rerender(createElement(DashboardAnalysisScreen));
  expect(screen.getByText('채팅이 5개 이상인 장르가 없습니다.')).toBeTruthy();
  expect(
    view.container.querySelectorAll('.recharts-bar-rectangle'),
  ).toHaveLength(0);
  expect(screen.getByRole('link', { name: '던전 →' })).toBeTruthy();

  const responseOrder = distribution('genre-depth', [
    { ...point('낮음', 1) },
    { ...point('높음', 100) },
  ]);

  expect(rankedPoints(responseOrder).map((p) => p.label)).toEqual([
    '낮음',
    '높음',
  ]);
});
