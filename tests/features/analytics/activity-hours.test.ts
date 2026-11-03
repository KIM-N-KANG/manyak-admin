// @vitest-environment jsdom
import { createElement } from 'react';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';

import { ActivityHoursContent } from '@/features/analytics/activity-hours';
import type { ActivityHoursResponse } from '@/features/analytics/activity-hours-types';
import { analyticsRange, defaultPeriod } from '@/features/analytics/range';
import { activityHoursFixture } from '@/fixtures/activity-hours';

afterEach(cleanup);

const sample = () => {
  const data = activityHoursFixture('2026-10-05', '2026-11-01');
  const metric = data.metrics.messages;

  metric.cells.forEach((cell) => {
    cell.count = 0;
    cell.average = 0;
  });
  metric.cells[21] = { weekday: 1, hour: 21, count: 14, average: 3.5 };
  metric.cells[45] = { weekday: 2, hour: 21, count: 62, average: 3.5 };
  metric.weekdays[0].average = 24.5;
  metric.hours[0].average = 0.0027;
  metric.total = 714;
  metric.dailyAverage = 0.0027;

  return data;
};
const draw = (data = sample(), metric: 'messages' | 'payments' = 'messages') =>
  render(createElement(ActivityHoursContent, { data, metric }));

it('시간대는 어제까지 28일이 기본이고 오늘 선택 및 366일 상한을 허용한다', () => {
  expect(defaultPeriod('hours', undefined, '2026-11-03')).toEqual({
    from: '2026-10-06',
    to: '2026-11-02',
  });
  expect(
    analyticsRange(
      new URLSearchParams('from=2026-11-03&to=2026-11-03'),
      'hours',
      undefined,
      '2026-11-03',
    ).error,
  ).toBeNull();
  expect(
    analyticsRange(
      new URLSearchParams('from=2025-11-02&to=2026-11-03'),
      'hours',
      undefined,
      '2026-11-03',
    ).error,
  ).toBe('limit');
});
it('월~일 7행·24시와 평균 열/줄을 그리고 최대 동률은 이른 요일·시를 고른다', () => {
  draw();

  const table = screen.getByRole('table', { name: '요일 시간 격자' });

  expect(within(table).getAllByRole('row')).toHaveLength(9);
  expect(within(table).getAllByRole('columnheader')).toHaveLength(26);
  expect(screen.getByText('월요일 21시')).toBeTruthy();
  expect(screen.getByText('평균 3.5개')).toBeTruthy();

  const peaks = within(table)
    .getAllByRole('button')
    .filter((cell) => cell.getAttribute('data-peak') === 'true');

  expect(peaks).toHaveLength(1);
  expect(peaks[0].getAttribute('aria-label')).toContain('월요일 21시');
  expect(peaks[0].style.backgroundColor).not.toBe('');
  expect(
    within(table).getByRole('button', { name: /^월요일 0시/ }).style
      .backgroundColor,
  ).toBe('');
  expect(
    within(table).getByRole('cell', { name: '24.5' }).style.backgroundColor,
  ).toBe('');
  expect(
    within(table).getByRole('cell', { name: '0.1 미만' }).style.backgroundColor,
  ).toBe('');
  expect(screen.getByText('0.1 미만개')).toBeTruthy();
});
it('칸 툴팁은 서버 평균과 합계·날짜 수를 그대로 표시한다', async () => {
  const data = sample();

  data.metrics.messages.cells[45].average = 15.5;
  draw(data);
  fireEvent.focus(screen.getByRole('button', { name: /^화요일 21시/ }));

  const tooltip = await screen.findByRole('tooltip');

  expect(tooltip.textContent).toContain('화요일 21시');
  expect(tooltip.textContent).toContain('평균 15.5개');
  expect(tooltip.textContent).toContain('합계 62개 (4일)');
});
it('전체 수치 표는 접혀 있고 서버 평균·작은 평균을 보존한다', () => {
  const data = sample();

  data.metrics.messages.cells[0].average = 0.04;
  draw(data);

  const details = screen.getByText('전체 수치 표').closest('details')!;

  expect(details.open).toBe(false);
  fireEvent.click(screen.getByText('전체 수치 표'));

  const table = within(details).getByRole('table');

  expect(within(table).getAllByRole('row')).toHaveLength(9);
  expect(within(table).getAllByRole('columnheader')).toHaveLength(26);
  expect(within(table).getByText('24.5')).toBeTruthy();
  expect(within(table).getAllByText('0.1 미만')).toHaveLength(2);
});
it('모두 0이면 가장 많은 시간대 없음, 색과 테두리가 없다', () => {
  const data = sample();

  data.metrics.messages.cells.forEach((cell) => {
    cell.count = 0;
    cell.average = 0;
  });
  draw(data);
  expect(screen.getByText('없음')).toBeTruthy();

  const buttons = within(
    screen.getByRole('table', { name: '요일 시간 격자' }),
  ).getAllByRole('button');

  expect(buttons).toHaveLength(168);
  expect(
    buttons.every(
      (cell) =>
        cell.getAttribute('data-peak') === 'false' &&
        !cell.style.backgroundColor,
    ),
  ).toBe(true);
});
it('같은 요일 최대 동률이면 이른 시를 고른다', () => {
  const data = sample();

  data.metrics.messages.cells[2].average = 3.5;
  draw(data);
  expect(screen.getByText('월요일 2시')).toBeTruthy();
});
it('날짜 없는 목~일은 빗금과 기간에 없음, 표와 요일 평균도 같은 문구다', async () => {
  const data = activityHoursFixture('2026-10-26', '2026-10-28');

  draw(data);

  const cell = screen.getByRole('button', { name: /^목요일 0시/ });

  expect(cell.style.backgroundImage).toContain('repeating-linear-gradient');
  fireEvent.focus(cell);
  expect((await screen.findByRole('tooltip')).textContent).toContain(
    '기간에 없음',
  );
  expect(screen.getAllByText('기간에 없음').length).toBeGreaterThan(4);
  fireEvent.click(screen.getByText('전체 수치 표'));
  expect(
    within(screen.getByText('전체 수치 표').closest('details')!).getAllByText(
      '기간에 없음',
    ),
  ).toHaveLength(100);
});
it('고른 결제 값·단위를 쓰고 지표 정의 도움말을 제공한다', async () => {
  const data: ActivityHoursResponse = sample();

  data.metrics.payments.total = 42;
  draw(data, 'payments');
  expect(screen.getByText('42건')).toBeTruthy();
  fireEvent.focus(screen.getByRole('button', { name: '기간 합계 지표 정의' }));

  const tooltip = await screen.findByRole('tooltip');

  expect(tooltip.textContent).toContain('완료된 주문 수');
  expect(tooltip.textContent).toContain('뒤에 환불된 주문도 셈');
});

it('칸 색은 고른 지표 최대 295를 기준으로 비례하고 평균 행과 열은 무색이다', () => {
  const data = sample();

  data.metrics.messages.cells[21].average = 295;
  data.metrics.messages.cells[45].average = 147.5;
  draw(data);
  expect(
    screen.getByRole('button', { name: /^월요일 21시/ }).style.backgroundColor,
  ).toContain('45%');
  expect(
    screen.getByRole('button', { name: /^화요일 21시/ }).style.backgroundColor,
  ).toContain('23%');
});
