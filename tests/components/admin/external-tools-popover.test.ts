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
import { afterEach, expect, it, vi } from 'vitest';

import { ExternalToolsPopover } from '@/components/admin/external-tools-popover';

let desktop = false;
const mediaListeners = new Set<() => void>();

function setup(isDesktop = true) {
  desktop = isDesktop;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: desktop,
      addEventListener: (_type: string, callback: () => void) =>
        mediaListeners.add(callback),
      removeEventListener: (_type: string, callback: () => void) =>
        mediaListeners.delete(callback),
    })),
  );

  const view = render(createElement(ExternalToolsPopover));

  return {
    ...view,
    trigger: screen.getByRole('button', { name: '외부 도구' }),
  };
}

afterEach(() => {
  cleanup();
  mediaListeners.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('Portal에 이름 있는 팝오버와 링크 5개를 열고 버튼에 관계·상태를 알린다', async () => {
  const { trigger, container } = setup();

  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(trigger);

  const popup = await screen.findByRole('dialog', { name: '외부 도구' });

  expect(container.contains(popup)).toBe(false);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(trigger.getAttribute('aria-controls')).toBe(popup.id);
  expect(
    within(popup)
      .getAllByRole('link')
      .map((link) => link.textContent),
  ).toEqual(['Amplitude', 'OpenSearch 로그', 'Sentry', 'Langfuse', '그로블']);
  fireEvent.click(trigger);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});

it.each(['escape', 'outside'] as const)(
  '%s로 닫고 버튼으로 포커스를 복귀한다',
  async (method) => {
    const { trigger } = setup();

    trigger.focus();
    fireEvent.click(trigger);

    const popup = await screen.findByRole('dialog');

    within(popup).getByRole('link', { name: 'Langfuse' }).focus();

    if (method === 'escape') fireEvent.keyDown(popup, { key: 'Escape' });
    else {
      const outside = render(
        createElement('button', null, '외부 버튼'),
      ).getByRole('button', { name: '외부 버튼' });

      fireEvent.mouseDown(outside);
      outside.focus();
      fireEvent.mouseUp(outside);
      fireEvent.click(outside);
    }

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  },
);

it('데스크톱 오른쪽 아래 정렬에서 모바일 아래 왼쪽 정렬로 열린 상태에서도 전환한다', async () => {
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
    1280,
  );
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(
    900,
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      return this.tagName === 'BUTTON'
        ? new DOMRect(16, 600, 208, 36)
        : new DOMRect(0, 0, 224, 216);
    },
  );

  const { trigger } = setup();

  fireEvent.click(trigger);

  const popup = await screen.findByRole('dialog');

  expect(popup.getAttribute('data-side')).toBe('right');
  expect(popup.getAttribute('data-align')).toBe('end');
  act(() => {
    desktop = false;

    for (const listener of mediaListeners) listener();
  });
  await waitFor(() => expect(popup.getAttribute('data-side')).toBe('bottom'));
  expect(popup.getAttribute('data-align')).toBe('start');
});
