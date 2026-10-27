// @vitest-environment jsdom
import { createElement } from 'react';

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';

import { ConfirmDialog } from '@/features/originals/confirm-dialog';

afterEach(cleanup);

/** jsdom은 레이아웃을 재지 않으므로 짧은 화면 대응은 클래스와 구조로 확인한다. */
it('짧은 화면에서는 내용만 스크롤하고 버튼 줄은 화면 안에 남긴다', () => {
  render(
    createElement(
      ConfirmDialog,
      {
        open: true,
        onOpenChange: () => {},
        title: '발송 확인',
        description: '설명',
        pending: false,
        onConfirm: () => {},
        error: '오류',
      },
      createElement('p', null, '요약'),
    ),
  );

  const dialog = screen.getByRole('dialog', { name: '발송 확인' });
  const body = screen.getByText('요약').parentElement!;
  const actions = within(dialog).getByRole('button', {
    name: '확인',
  }).parentElement!;

  expect(dialog.className).toMatch(/max-h-\[calc\(100dvh-2rem\)\]/);
  expect(dialog.className).toContain('flex-col');
  expect(body.className).toContain('overflow-y-auto');
  expect(body.className).toContain('min-h-0');
  expect(within(body).getByText('설명')).toBeTruthy();
  expect(within(body).getByRole('alert').textContent).toBe('오류');
  expect(body.contains(actions)).toBe(false);
  expect(actions.className).toContain('shrink-0');
});
