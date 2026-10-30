// @vitest-environment jsdom
import { createElement as h } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { CreditPromotionsScreen } from '@/features/credits/credit-promotions-screen';
import { PromotionDialog } from '@/features/credits/promotion-dialog';
import { promotionModels } from '@/fixtures/credit-promotions';

const push = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function setup(child: ReturnType<typeof h>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');

  render(h(QueryClientProvider, { client }, child));

  return { client, invalidate };
}

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

it('표는 상태와 비활성을 표시하고 탭 이동을 경로로 요청한다', async () => {
  const fetch = vi.fn().mockResolvedValue(response({ items: promotionModels }));

  vi.stubGlobal('fetch', fetch);
  setup(h(CreditPromotionsScreen));
  await screen.findByText('0 (무료)');
  expect(screen.getByText('비활성')).toBeTruthy();
  expect(screen.getByText('예정')).toBeTruthy();
  expect(screen.getByText('진행 중')).toBeTruthy();
  expect(screen.getByText('종료')).toBeTruthy();

  const aurora = screen.getByText('오로라').closest('tr')!;

  expect(within(aurora).queryByRole('button', { name: '해제' })).toBeNull();
  expect(fetch.mock.calls[0][0]).toBe('/api/credits/promotions');
  fireEvent.click(screen.getByRole('tab', { name: '이프 내역' }));
  expect(push).toHaveBeenCalledWith('/credits/transactions');
});
it('기존 값을 채우고 UTC 설정 본문으로 저장한 뒤 목록을 다시 요청한다', async () => {
  const fetch = vi.fn().mockResolvedValue(response(promotionModels[0]));

  vi.stubGlobal('fetch', fetch);

  const close = vi.fn();
  const { invalidate } = setup(
    h(PromotionDialog, {
      model: promotionModels[0],
      action: 'set',
      trigger: { current: null },
      onClose: close,
    }),
  );

  expect(
    (screen.getByLabelText('프로모션 가격 (이프)') as HTMLInputElement).value,
  ).toBe('0');
  expect((screen.getByLabelText('시작 (KST)') as HTMLInputElement).value).toBe(
    '2026-10-31T10:00',
  );
  expect(
    (screen.getByRole('button', { name: '저장' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText('사유'), {
    target: { value: '  이벤트  ' },
  });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    turnCost: 0,
    startsAt: '2026-10-31T01:00:00Z',
    endsAt: '2026-11-05T15:00:00Z',
    reason: '이벤트',
  });
  expect(fetch.mock.calls[0][1].method).toBe('PUT');
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['/api/credits/promotions'],
    exact: true,
  });
});
it('잘못된 가격과 같은 종료 시각에 입력 오류를 표시하고 저장을 막는다', () => {
  setup(
    h(PromotionDialog, {
      model: promotionModels[0],
      action: 'set',
      trigger: { current: null },
      onClose: vi.fn(),
    }),
  );
  fireEvent.change(screen.getByLabelText('사유'), {
    target: { value: '이벤트' },
  });
  fireEvent.change(screen.getByLabelText('프로모션 가격 (이프)'), {
    target: { value: '-1' },
  });
  fireEvent.change(screen.getByLabelText('종료 (KST)'), {
    target: { value: '2026-10-31T10:00' },
  });
  expect(
    screen.getByText('가격은 0 이상 10,000 이하 정수로 입력해 주세요.'),
  ).toBeTruthy();
  expect(
    screen.getByText('종료 시각은 시작 시각 이후여야 합니다.'),
  ).toBeTruthy();
  expect(
    (screen.getByRole('button', { name: '저장' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it('400 응답 message를 대화상자 안에 표시하고 값을 유지한다', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        response({ message: '종료 시각은 현재 시각 이후여야 합니다.' }, 400),
      ),
  );

  const close = vi.fn();

  setup(
    h(PromotionDialog, {
      model: promotionModels[0],
      action: 'set',
      trigger: { current: null },
      onClose: close,
    }),
  );
  fireEvent.change(screen.getByLabelText('사유'), {
    target: { value: '이벤트' },
  });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect((await screen.findByRole('alert')).textContent).toBe(
    '종료 시각은 현재 시각 이후여야 합니다.',
  );
  expect(close).not.toHaveBeenCalled();
  expect((screen.getByLabelText('사유') as HTMLTextAreaElement).value).toBe(
    '이벤트',
  );
});
it('진행 중 해제 안내와 DELETE 사유 본문, 처리 중 닫기 차단을 유지한다', async () => {
  let resolve!: (response: Response) => void;
  const fetch = vi.fn().mockReturnValue(
    new Promise<Response>((done) => {
      resolve = done;
    }),
  );

  vi.stubGlobal('fetch', fetch);

  const close = vi.fn();
  const { invalidate } = setup(
    h(PromotionDialog, {
      model: {
        ...promotionModels[0],
        promotion: { ...promotionModels[0].promotion!, status: 'ACTIVE' },
      },
      action: 'remove',
      trigger: { current: null },
      onClose: close,
    }),
  );

  expect(screen.getByText('진행 중인 프로모션이 지금 끝납니다.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('사유'), {
    target: { value: ' 종료 ' },
  });
  fireEvent.click(screen.getByRole('button', { name: '확인' }));
  expect(
    (screen.getByRole('button', { name: '취소' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(close).not.toHaveBeenCalled();
  expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ reason: '종료' });
  resolve(response({ ...promotionModels[0], promotion: null }));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(invalidate).toHaveBeenCalled();
});
