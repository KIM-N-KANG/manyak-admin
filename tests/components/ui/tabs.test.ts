// @vitest-environment jsdom
import { createElement as h } from 'react';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';

import { Tabs } from '@/components/ui/tabs';

afterEach(cleanup);

it('마우스 클릭으로 패널을 포커스하지 않고 키보드 탭 관계를 유지한다', async () => {
  render(
    h(
      Tabs.Root,
      { defaultValue: 'a' },
      h(
        Tabs.List,
        { 'aria-label': '분석' },
        h(Tabs.Tab, { value: 'a' }, '첫 탭'),
        h(Tabs.Tab, { value: 'b' }, '다음 탭'),
      ),
      h(Tabs.Panel, { value: 'a' }, h('button', null, '조건 선택')),
      h(Tabs.Panel, { value: 'b' }, h('button', null, '두 번째 조건')),
    ),
  );

  const first = screen.getByRole('tab', { name: '첫 탭' });
  const second = screen.getByRole('tab', { name: '다음 탭' });

  expect(first.className).toContain('outline-none');
  expect(first.className).toContain('focus-visible:ring-2');
  expect(first.className.split(' ')).not.toContain('focus:ring-2');

  const panel = screen.getByRole('tabpanel');

  expect(panel.hasAttribute('tabindex')).toBe(false);
  expect(panel.getAttribute('aria-labelledby')).toBe(first.id);
  fireEvent.mouseDown(panel);
  fireEvent.click(panel);
  expect(document.activeElement).not.toBe(panel);
  await act(async () => first.focus());
  await act(async () => {
    fireEvent.keyDown(first, { key: 'ArrowRight' });
  });
  expect(document.activeElement).toBe(second);
  fireEvent.click(second);
  expect(second.getAttribute('aria-selected')).toBe('true');
  expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(
    second.id,
  );
  expect(screen.getByRole('button', { name: '두 번째 조건' }).tabIndex).toBe(0);
});
