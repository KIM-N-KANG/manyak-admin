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
import { QueryState } from '@/components/admin/data-ui';

afterEach(cleanup);

it.each([
  [
    'play',
    '설치 지표 사용 불가',
    '잠시 후 다시 시도해 주세요. 문제가 계속되면 Play 설치 지표 설정과 보고서 상태를 확인해 주세요.',
  ],
  [
    'amplitude',
    'Amplitude 지표를 불러올 수 없음',
    '잠시 후 다시 시도해 주세요.',
  ],
  [
    undefined,
    '데이터 불러오기 실패',
    '잠시 후 다시 시도해 주세요. 문제가 계속되면 담당자에게 문의해 주세요.',
  ],
] as const)(
  '카드 인라인 %s 오류는 박스 없이 제목과 텍스트 재시도를 표시하고 전체 안내를 보존한다',
  async (source, title, description) => {
    const retry = vi.fn();

    render(
      createElement(QueryState, {
        pending: false,
        error: new FetchError('failure', 503, {}),
        retry,
        source,
        variant: 'inline',
      }),
    );

    const alert = screen.getByRole('alert');

    expect(alert.querySelector('[data-slot="card"]')).toBeNull();
    expect(alert.getAttribute('data-slot')).toBeNull();
    expect(alert.className).not.toMatch(/\b(border|bg-|p-)/);
    expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    expect(screen.queryByText(description)).toBeNull();

    const button = screen.getByRole('button', { name: '다시 시도' });

    expect(button.className).not.toMatch(/\b(border|bg-|p-)/);
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledOnce();

    const help = screen.getByRole('button', { name: `${title} 안내` });

    act(() => help.focus());

    const tooltip = await screen.findByRole('tooltip');

    expect(tooltip.textContent).toBe(description);
    expect(help.getAttribute('aria-describedby')).toBe(tooltip.id);
    fireEvent.keyDown(help, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  },
);

it('카드 밖 기본 오류와 로딩은 기존 테두리 패널을 유지한다', () => {
  const view = render(
    createElement(QueryState, {
      pending: false,
      error: new Error('failure'),
      retry: vi.fn(),
    }),
  );

  expect(screen.getByRole('alert').getAttribute('data-slot')).toBe('card');
  expect(
    screen.getByText(
      '잠시 후 다시 시도해 주세요. 문제가 계속되면 담당자에게 문의해 주세요.',
    ),
  ).toBeTruthy();
  view.rerender(
    createElement(QueryState, { pending: true, error: null, retry: vi.fn() }),
  );
  expect(screen.getByRole('status').getAttribute('data-slot')).toBe('card');
});

it('인라인 로딩과 서버 미구현도 박스 없이 기존 문구를 유지한다', () => {
  const view = render(
    createElement(QueryState, {
      pending: true,
      error: null,
      retry: vi.fn(),
      variant: 'inline',
    }),
  );

  expect(screen.getByRole('status').getAttribute('data-slot')).toBeNull();
  expect(screen.getByText('데이터를 불러오는 중입니다…')).toBeTruthy();
  view.rerender(
    createElement(QueryState, {
      pending: false,
      error: new FetchError('failure', 503, { message: '서버 미구현' }),
      retry: vi.fn(),
      source: 'play',
      variant: 'inline',
    }),
  );
  expect(screen.getByRole('heading', { name: '기능 준비 중' })).toBeTruthy();
});
