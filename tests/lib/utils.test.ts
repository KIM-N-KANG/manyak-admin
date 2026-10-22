import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';

describe('cn', () => {
  it('조건부 클래스를 조합하고 충돌하는 Tailwind 클래스는 마지막 값으로 병합한다', () => {
    expect(
      cn('px-2 text-sm', false && 'hidden', { 'font-medium': true }, 'px-4'),
    ).toBe('text-sm font-medium px-4');
  });
});
