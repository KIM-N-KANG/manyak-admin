// @vitest-environment jsdom
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/credits/transactions/route';
import { CreditTransactionsScreen } from '@/features/credits/credit-transactions-screen';
import { creditReasonLabel } from '@/features/credits/reason-label';

const navigation = vi.hoisted(() => ({ search: '', push: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/credits/transactions',
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => ({ push: navigation.push }),
}));

let client: QueryClient;
let serverUnavailable: boolean;
const requested: string[] = [];

beforeEach(() => {
  navigation.search = 'direction=spent&date=2026-10-21&page=2&size=2';
  navigation.push.mockReset();
  serverUnavailable = false;
  requested.length = 0;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requested.push(url);

      return serverUnavailable
        ? Response.json({ message: '서버 오류' }, { status: 500 })
        : GET(new Request(`http://localhost${url}`));
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

const renderList = () =>
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(CreditTransactionsScreen),
    ),
  );

it('원장 열·한국어 사유·음수·회원 링크와 필터를 유지하는 페이지를 표시한다', async () => {
  renderList();

  const table = await screen.findByRole('table');

  expect(requested[0]).toBe(
    `/api/credits/transactions?${navigation.search}&order=desc`,
  );
  expect(
    within(table)
      .getAllByRole('columnheader')
      .map((node) => node.textContent),
  ).toEqual(['기록 시각 (KST)↓', '회원', '사유', '수량 (이프)']);
  expect(within(table).getAllByText('채팅 전송')).toHaveLength(2);
  expect(within(table).getAllByText('-30')).toHaveLength(2);

  const row = within(table).getAllByRole('row')[1];
  const memberLink = within(row).getByRole('link');

  expect(memberLink.getAttribute('href')).toMatch(/^\/members\/[0-9a-f-]+$/);
  expect(row.textContent).toContain('2026. 10. 21. 오후 1:00');
  expect(screen.getByText(/팀 계정 거래도 포함/)).toBeTruthy();
  expect(screen.queryByRole('searchbox')).toBeNull();
  expect(screen.queryByLabelText('memberId')).toBeNull();

  const next = within(
    screen.getByRole('navigation', { name: '이프 내역 페이지' }),
  ).getByRole('link', {
    name: '다음 ›',
  });

  expect(next.getAttribute('href')).toBe(
    '/credits/transactions?direction=spent&date=2026-10-21&page=3&size=2',
  );
});

it('방향·기록일 적용 시 첫 페이지로 이동하고 초기화는 필터를 지운다', () => {
  renderList();
  fireEvent.change(screen.getByRole('combobox', { name: '방향' }), {
    target: { value: 'granted' },
  });
  fireEvent.change(screen.getByLabelText('기록일 (KST)'), {
    target: { value: '2026-10-20' },
  });
  fireEvent.submit(screen.getByRole('form', { name: '이프 내역 및 필터' }));
  expect(navigation.push).toHaveBeenLastCalledWith(
    '/credits/transactions?direction=granted&date=2026-10-20&page=1&size=2',
  );
  expect(
    screen.getByRole('link', { name: '초기화' }).getAttribute('href'),
  ).toBe('/credits/transactions');
  fireEvent.change(screen.getByRole('combobox', { name: '방향' }), {
    target: { value: '' },
  });
  fireEvent.change(screen.getByLabelText('기록일 (KST)'), {
    target: { value: '' },
  });
  fireEvent.submit(screen.getByRole('form', { name: '이프 내역 및 필터' }));
  expect(navigation.push).toHaveBeenLastCalledWith(
    '/credits/transactions?page=1&size=2',
  );
});

it('양수는 부호와 초록색을 표시하고 기록 시각만 정렬한다', async () => {
  navigation.search = 'direction=granted&date=2026-10-21&size=1&sort=createdAt';
  renderList();

  const table = await screen.findByRole('table');

  expect(within(table).getByText('출석 체크 보상')).toBeTruthy();

  const amount = within(table).getByText('250').closest('td')!;

  expect(amount.textContent).toBe('+250');
  expect(amount.className).toContain('text-primary-text');
  fireEvent.click(
    within(table).getByRole('button', { name: '기록 시각 (KST)' }),
  );
  expect(navigation.push).toHaveBeenLastCalledWith(
    '/credits/transactions?direction=granted&date=2026-10-21&size=1&sort=createdAt&order=asc&page=1',
  );
});

it('빈 결과를 표시한다', async () => {
  navigation.search = 'date=2027-01-01';
  renderList();
  expect(
    await screen.findByText(
      '조건에 맞는 결과가 없습니다. 필터를 변경해 주세요.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('전체 0건')).toBeTruthy();
  expect(requested[0]).toBe(
    '/api/credits/transactions?date=2027-01-01&page=1&size=20&order=desc',
  );
});

it('서버 오류를 표시하고 재시도로 복구한다', async () => {
  serverUnavailable = true;
  renderList();
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(
    screen.getByRole('heading', { name: '데이터를 불러오지 못했습니다' }),
  ).toBeTruthy();
  expect(screen.queryByRole('table')).toBeNull();
  serverUnavailable = false;
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  expect(await screen.findByRole('table')).toBeTruthy();
});

it('알 수 없는 사유도 한국어 기본 라벨로 표시한다', () => {
  expect(creditReasonLabel('FUTURE_REASON')).toBe('이프 변동');
  expect(creditReasonLabel('ADMIN_REVOKE')).toBe('관리자 회수');
});

it('필터 없는 첫 진입도 서버 OpenAPI 필수 페이지 쿼리를 포함한다', async () => {
  navigation.search = '';
  renderList();
  await screen.findByRole('table');
  expect(requested[0]).toBe(
    '/api/credits/transactions?page=1&size=20&order=desc',
  );
});

it('명시한 오름차순과 페이지 쿼리는 기본값으로 덮어쓰지 않는다', async () => {
  navigation.search = 'order=asc&page=2&size=1';
  renderList();
  await screen.findByRole('table');
  expect(requested[0]).toBe(
    '/api/credits/transactions?order=asc&page=2&size=1',
  );
});
