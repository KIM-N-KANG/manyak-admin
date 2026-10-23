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
