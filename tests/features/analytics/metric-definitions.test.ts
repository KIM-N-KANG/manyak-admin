// @vitest-environment jsdom
import { createElement } from 'react';

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';

import {
  allZero,
  definitionIndex,
  definitionTitles,
  eventMetric,
  MetricHelp,
  MetricScope,
} from '@/features/analytics/metric-definition';
import { metricDefinitions } from '@/features/analytics/metric-definitions-data';
import { retentionHelp } from '@/features/analytics/retention';

const examples = [
  ...Object.entries(definitionTitles).flatMap(([scope, titles]) =>
    Object.entries(titles).map(([title, index]) => ({ scope, title, index })),
  ),
  ...['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D30'].flatMap((day) =>
    [day, `${day} 가중 평균`].map((title) => ({
      scope: 'users',
      title,
      index: 21,
    })),
  ),
];

it('정본의 모든 정의에 화면 별칭이 연결되어 있다', () => {
  expect(new Set(examples.map((example) => example.index)).size).toBe(
    metricDefinitions.length,
  );
});

afterEach(cleanup);
it.each(examples)(
  '정의 $index $scope/$title는 정본의 네 줄을 포커스 도움말로 보인다',
  async ({ scope, title, index }) => {
    render(
      createElement(
        MetricScope,
        { value: scope },
        createElement(MetricHelp, { title }),
      ),
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
    await act(async () => screen.getByRole('button').focus());

    const tooltip = await screen.findByRole('tooltip');
    const rows = tooltip.querySelectorAll('p');

    expect(rows).toHaveLength(4);

    for (let i = 0; i < 4; i++)
      expect(rows[i].textContent).toBe(
        `${['출처', '대상', '계산', '날짜'][i]} ${metricDefinitions[index][i + 2].replaceAll('<br>', '')}`,
      );
  },
);
it('연결 끊김 안내는 방문자에서 없고 배포일이 비면 둘째 문장을 숨긴다', () => {
  expect(retentionHelp('signup')).toContain('2026-10-28 전 시작일은');
  expect(retentionHelp('visitor', '2026-11-03')).not.toContain('2026-10-22');
  expect(retentionHelp('signup', '')).toContain('2026-10-22');
  expect(retentionHelp('first-chat', '')).not.toContain('앱 요청');
  expect(retentionHelp('first-chat', '2026-11-03')).toContain(
    '2026-11-03 전 시작일',
  );
});
it('수신 없음은 빈 날짜·null·평균·비율·DB·별도 상태에 적용하지 않는다', () => {
  expect(allZero([])).toBe(false);
  expect(allZero([null])).toBe(false);
  expect(allZero([undefined])).toBe(false);
  expect(allZero([0, 2, 0])).toBe(false);
  expect(allZero([0, 0])).toBe(true);
  expect(eventMetric('users', '평균 세션 길이')).toBe(false);
  expect(eventMetric('users', '신규 가입자')).toBe(false);
  expect(eventMetric('quality', '스트림 오류율')).toBe(false);
  expect(eventMetric('quality', '스트림 오류 표시')).toBe(true);
  expect(eventMetric('acquisition', '열람률')).toBe(false);
});

it('정확한 괄호 제목을 우선하고 단위 접미사가 붙은 별칭은 대체 조회한다', () => {
  expect(definitionIndex('users', '일별 활성 사용자 (DAU)')).toBe(18);
  expect(definitionIndex('users', '일별 활성 사용자 (DAU) (명)')).toBe(18);
  expect(definitionIndex('users', '평균 세션 길이 (초)')).toBe(22);
});
