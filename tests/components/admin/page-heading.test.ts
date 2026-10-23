// @vitest-environment jsdom
import { createElement } from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';

import { PageHeading } from '@/components/admin/data-ui';

afterEach(cleanup);

it('제목과 작업 버튼을 설명 문장이나 빈 문단 없이 표시한다', () => {
  const { container } = render(
    createElement(
      PageHeading,
      { title: '개요' },
      createElement('button', null, '기간 선택'),
    ),
  );

  expect(screen.getByRole('heading', { level: 1, name: '개요' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '기간 선택' })).toBeTruthy();
  expect(container.querySelector('p')).toBeNull();
});
