// @vitest-environment jsdom
import { createElement } from 'react';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { FetchError } from '@/api/mutator/custom-instance';
import { GET } from '@/app/api/dashboard/play-installs/route';
import { PlayInstallsCard } from '@/features/dashboard/play-installs-card';
import { PlayInstallsDetails } from '@/features/dashboard/play-installs-details';
import type { PlayInstalls } from '@/features/dashboard/types';
import { playInstalls } from '@/fixtures/play-installs';

const state = vi.hoisted(() => ({
  data: null as PlayInstalls | null,
  error: null as Error | null,
  pending: false,
  retry: vi.fn(),
}));

vi.mock('@/features/shared/use-api', () => ({
  useApi: (url: string) => {
    expect(url).toBe('/api/dashboard/play-installs');

    return {
      data:
        state.error || state.pending ? undefined : (state.data ?? playInstalls),
      error: state.error,
      isError: !!state.error,
      isPending: state.pending,
      refetch: state.retry,
    };
  },
}));
afterEach(() => {
  cleanup();
  state.data = null;
  state.error = null;
  state.pending = false;
  state.retry.mockReset();
});
it('상세 탭에 Play 날짜와 계단선 및 0 기준 상하 막대를 표시한다', async () => {
  const view = render(createElement(PlayInstallsDetails));

  expect(
    screen.getByText(
      `집계 기준 날짜 ${playInstalls.asOf} (Play 기준 태평양 시간)`,
    ),
  ).toBeTruthy();
  expect(screen.queryByText(/며칠 늦게/)).toBeNull();

  const lines = view.container.querySelector(
    '[aria-label="누적 기기 설치 수와 활성 기기 수 추이"]',
  )!;

  await waitFor(() =>
    expect(lines.querySelectorAll('.recharts-line-curve')).toHaveLength(2),
  );

  const coordinates = lines
    .querySelector('.recharts-line-curve')!
    .getAttribute('d')!
    .slice(1)
    .split('L')
    .map((pair) => pair.split(',').map(Number));

  expect(coordinates.length).toBeGreaterThan(playInstalls.daily.length);
  coordinates.slice(1).forEach(([x, y], index) => {
    const previous = coordinates[index];

    expect(x === previous[0] || y === previous[1]).toBe(true);
  });
  expect(lines.querySelector('[stroke-dasharray="6 3"]')).toBeTruthy();

  const bars = view.container.querySelector(
    '[aria-label="일별 기기 설치 수와 앱 삭제 수"]',
  )!;

  expect(bars.querySelector('.recharts-reference-line')).toBeTruthy();

  const series = bars.querySelectorAll('.recharts-bar');

  expect(series).toHaveLength(2);

  const positive = Array.from(series[0].querySelectorAll('path')).find(
    (node) => Math.abs(Number(node.getAttribute('height'))) > 0,
  )!;
  const negative = Array.from(series[1].querySelectorAll('path')).find(
    (node) => Math.abs(Number(node.getAttribute('height'))) > 0,
  )!;

  expect(Number(positive.getAttribute('y'))).toBeLessThan(
    Number(negative.getAttribute('y')),
  );
  expect(screen.getAllByText('전체 수치 표')).toHaveLength(1);
  expect(view.container.querySelectorAll('tbody tr')).toHaveLength(
    playInstalls.daily.length,
  );
});
it('누적과 최신 보고일 설치 수를 표시하고 상세 화면으로 연결한다', () => {
  const view = render(createElement(PlayInstallsCard));

  expect(screen.getByText(String(playInstalls.totalInstalls))).toBeTruthy();
  expect(
    screen.getByText(`${playInstalls.asOf} 설치`).nextElementSibling!
      .textContent,
  ).toBe(`${playInstalls.daily.at(-1)!.installs}대`);
  expect(
    screen.getByRole('link', { name: '앱 설치(Android)' }).getAttribute('href'),
  ).toBe('/analytics/acquisition?tab=installs');
  expect(view.container.querySelector('svg')).toBeNull();
  expect(screen.queryByText(/보고서는 며칠/)).toBeNull();
});
it('503이면 설치 지표 사용 불가를 표시하고 재시도한다', () => {
  state.error = new FetchError('unavailable', 503, {
    code: 'SERVICE_UNAVAILABLE',
  });
  render(createElement(PlayInstallsCard));
  expect(screen.getByText('설치 지표 사용 불가')).toBeTruthy();
  expect(screen.queryByText('Android 누적 기기 설치 수')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  expect(state.retry).toHaveBeenCalledOnce();
});
it('다른 실패와 로딩도 카드 안에서 표시한다', () => {
  state.pending = true;

  const view = render(createElement(PlayInstallsCard));

  expect(screen.getByRole('status').textContent).toContain('불러오는 중');

  const cardClass = screen.getByRole('region', {
    name: '앱 설치(Android)',
  }).className;

  expect(cardClass).not.toMatch(/min-h-|h-56/);
  expect(screen.getByRole('status').getAttribute('data-slot')).toBeNull();
  state.pending = false;
  state.error = new FetchError('failure', 500, {});
  view.rerender(createElement(PlayInstallsCard));
  expect(screen.getByText('데이터 불러오기 실패')).toBeTruthy();
  expect(
    screen.getByRole('region', { name: '앱 설치(Android)' }).className,
  ).toBe(cardClass);
  expect(screen.getByRole('alert').getAttribute('data-slot')).toBeNull();
  state.error = null;
  view.rerender(createElement(PlayInstallsCard));
  expect(
    screen.getByRole('region', { name: '앱 설치(Android)' }).className,
  ).toBe(cardClass);
});
it('fixture는 누적 설치와 마지막 활성 기기·기준일을 일치시킨다', async () => {
  const data = await GET().json();
  let cumulative = 0;

  for (const row of data.daily) {
    cumulative += row.installs;
    expect(row.cumulativeInstalls).toBe(cumulative);
    expect(row.uninstalls).toBeGreaterThanOrEqual(0);
  }

  expect(data.totalInstalls).toBe(cumulative);
  expect(data.activeDevices).toBe(data.daily.at(-1).activeDevices);
  expect(data.asOf).toBe(data.daily.at(-1).date);
});

it('활성 기기의 null은 보고서 값 없음으로 표시하고 실제 0은 유지한다', () => {
  state.data = structuredClone(playInstalls);
  state.data.daily[0].activeDevices = null;
  state.data.daily[1].activeDevices = 0;
  render(createElement(PlayInstallsDetails));
  expect(screen.getByText('보고서 값 없음')).toBeTruthy();

  const rows = screen.getAllByRole('row');

  expect(rows[2].lastElementChild!.textContent).toBe('0');
});

it('보고일 순서와 무관하게 최신 날짜의 0을 유지하고 보고서 누락은 0으로 만들지 않는다', () => {
  state.data = {
    ...playInstalls,
    daily: [
      { ...playInstalls.daily.at(-1)!, date: '2026-10-20', installs: 0 },
      { ...playInstalls.daily[0], date: '2026-10-01', installs: 99 },
    ],
  };

  const view = render(createElement(PlayInstallsCard));

  expect(
    screen.getByText('2026-10-20 설치').nextElementSibling!.textContent,
  ).toBe('0대');
  state.data = { ...state.data, daily: [] };
  view.rerender(createElement(PlayInstallsCard));
  expect(screen.getByText('보고서 값 없음')).toBeTruthy();
});

it('설치 안내는 제목 옆 도움말에 포커스할 때 열고 보고일은 본문에 유지한다', async () => {
  render(createElement(PlayInstallsCard));
  expect(screen.queryByText(/보고서는 며칠 늦게/)).toBeNull();
  expect(screen.getByText(`${playInstalls.asOf} 설치`)).toBeTruthy();

  const button = screen.getByRole('button', {
    name: '앱 설치(Android) 출처와 집계 안내',
  });

  act(() => button.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
  expect(tooltip.textContent).toContain('Google Play 설치 보고서');
  expect(tooltip.textContent).toContain('보고서는 며칠 늦게');
  expect(tooltip.textContent).toContain('기간은 이 카드에 적용되지 않습니다.');
});
