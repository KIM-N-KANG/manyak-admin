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
import { afterEach, expect, it } from 'vitest';

import { HelpTooltip } from '@/components/admin/help-tooltip';

afterEach(cleanup);

it('키보드 포커스로만 설명을 노출하고 Esc로 닫으며 ID를 연결한다', async () => {
  render(createElement(HelpTooltip, { label: '집계 안내' }, '집계 설명'));
  expect(screen.queryByRole('tooltip')).toBeNull();
  expect(screen.queryByText('집계 설명')).toBeNull();

  const button = screen.getByRole('button', { name: '집계 안내' });

  act(() => button.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
  expect(tooltip.textContent).toBe('집계 설명');
  fireEvent.keyDown(button, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  expect(document.activeElement).toBe(button);
});

it('마우스 hover에서도 설명을 열고 서로 다른 도움말 ID를 사용한다', async () => {
  render(
    createElement(
      'div',
      null,
      createElement(HelpTooltip, { label: '첫 안내' }, '첫 설명'),
      createElement(HelpTooltip, { label: '둘째 안내' }, '둘째 설명'),
    ),
  );

  const first = screen.getByRole('button', { name: '첫 안내' });
  const second = screen.getByRole('button', { name: '둘째 안내' });

  expect(first.getAttribute('aria-describedby')).not.toBe(
    second.getAttribute('aria-describedby'),
  );
  fireEvent.mouseEnter(first);
  fireEvent.mouseMove(first);

  const tooltip = await screen.findByRole('tooltip');

  expect(tooltip.textContent).toBe('첫 설명');
  expect(first.getAttribute('aria-describedby')).toBe(tooltip.id);
});

it('긴 도움말은 뷰포트 안에서 스크롤하고 팝업에 키보드 포커스를 둘 수 있다', async () => {
  render(
    createElement(
      HelpTooltip,
      { label: '여러 지표 정의' },
      createElement(
        'div',
        null,
        ...Array.from({ length: 30 }, (_, index) =>
          createElement('p', { key: index }, `정의 ${index + 1} 날짜`),
        ),
      ),
    ),
  );
  act(() => screen.getByRole('button', { name: '여러 지표 정의' }).focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(tooltip.classList.contains('max-h-[min(70vh,32rem)]')).toBe(true);
  expect(tooltip.classList.contains('overflow-y-auto')).toBe(true);
  expect(tooltip.getAttribute('tabindex')).toBe('0');
  act(() => tooltip.focus());
  expect(document.activeElement).toBe(tooltip);
  expect(screen.getByRole('tooltip')).toBe(tooltip);
  expect(tooltip.textContent).toContain('정의 30 날짜');
});
