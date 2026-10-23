// @vitest-environment jsdom
import { createElement } from 'react';

import {
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
it('누적·활성·Play 날짜와 지연 안내를 표시하고 확장하면 계단선과 0 기준 상하 막대를 그린다', async () => {
  const view = render(createElement(PlayInstallsCard));

  expect(
    screen.getByText(
      `집계 기준 날짜 ${playInstalls.asOf} (Play 기준 태평양 시간)`,
    ),
  ).toBeTruthy();
  expect(screen.getByText(/며칠 늦게/)).toBeTruthy();

  const detail = view.container.querySelector('details')!;

  fireEvent.click(
    screen.getByText('누적 기기 설치 수와 활성 기기 수 추이 보기'),
  );
  detail.open = true;

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
    '[aria-label="일별 기기 설치 수와 일별 앱 삭제 수"]',
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
  expect(screen.getAllByText('일별 설치 지표')).toHaveLength(1);
  expect(view.container.querySelectorAll('tbody tr')).toHaveLength(
    playInstalls.daily.length,
  );
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
  state.pending = false;
  state.error = new FetchError('failure', 500, {});
  view.rerender(createElement(PlayInstallsCard));
  expect(screen.getByText('데이터 불러오기 실패')).toBeTruthy();
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
  render(createElement(PlayInstallsCard));
  expect(screen.getByText('보고서 값 없음')).toBeTruthy();

  const rows = screen.getAllByRole('row');

  expect(rows[2].lastElementChild!.textContent).toBe('0');
});
