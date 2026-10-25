// @vitest-environment jsdom
import { createElement } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { DetailScreen } from '@/features/shared/detail-screen';
import { getMemberDetail, members } from '@/fixtures/entities';

const nav = vi.hoisted(() => ({ search: '', paid: 4800, push: vi.fn() }));
const member = members[0];

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => `/members/${member.memberId}`,
  useRouter: () => ({ push: nav.push }),
}));
vi.mock('@/features/shared/use-api', () => ({
  useApi: (url: string) => ({
    data:
      url === `/api/members/${member.memberId}`
        ? { ...getMemberDetail(member.memberId), paidKrw: nav.paid }
        : { items: [], page: 1, size: 20, totalElements: 0, totalPages: 0 },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
beforeEach(() => {
  nav.search = '';
  nav.paid = 4800;
  nav.push.mockClear();
});
afterEach(cleanup);

function renderDetail() {
  render(
    createElement(DetailScreen, { domain: 'members', id: member.memberId }),
  );
}

it.each([
  [4800, '4,800원'],
  [0, '0원'],
])('요약 카드에 결제 금액 %i을 소모 이프 다음에 표시한다', (paid, text) => {
  nav.paid = paid;
  renderDetail();

  const label = screen.getByText('결제 금액', { selector: 'dt' });

  expect(label.nextElementSibling?.textContent).toBe(text);
  expect(
    label.parentElement!.previousElementSibling?.querySelector('dt')
      ?.textContent,
  ).toBe('소모 이프');
});
it('섹션 5개를 탭으로 두고 기본 탭인 이프 내역 패널만 표시한다', () => {
  renderDetail();

  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    '이프 내역',
    '결제 내역',
    '채팅',
    '만든 스토리',
    '출석 기록',
  ]);
  expect(
    screen
      .getByRole('tab', { name: '이프 내역' })
      .getAttribute('aria-selected'),
  ).toBe('true');
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  expect(
    screen.getByRole('columnheader', { name: '거래 후 잔액' }),
  ).toBeTruthy();
  expect(screen.queryByRole('link', { name: '결제 전체 →' })).toBeNull();
});
it('URL의 tab 쿼리로 선택 탭을 복원하고 알 수 없는 값은 기본 탭으로 둔다', () => {
  nav.search = 'tab=payments';
  renderDetail();
  expect(
    screen
      .getByRole('tab', { name: '결제 내역' })
      .getAttribute('aria-selected'),
  ).toBe('true');
  expect(
    screen.getByRole('link', { name: '결제 전체 →' }).getAttribute('href'),
  ).toBe(`/payments?memberId=${member.memberId}`);
  cleanup();
  nav.search = 'tab=unknown';
  renderDetail();
  expect(
    screen
      .getByRole('tab', { name: '이프 내역' })
      .getAttribute('aria-selected'),
  ).toBe('true');
});
it('탭을 바꾸면 기존 페이지 쿼리를 유지한 채 tab 쿼리를 남긴다', () => {
  nav.search = 'transactionsPage=2&attendancePage=3';
  renderDetail();
  fireEvent.click(screen.getByRole('tab', { name: '채팅' }));
  expect(nav.push).toHaveBeenCalledWith(
    `/members/${member.memberId}?transactionsPage=2&attendancePage=3&tab=chats`,
    { scroll: false },
  );
});
