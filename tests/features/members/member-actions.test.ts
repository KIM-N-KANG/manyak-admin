// @vitest-environment jsdom
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { MemberActions } from '@/features/members/member-actions';
import type { MemberDetail } from '@/features/members/types';
import {
  getMemberDetail,
  members,
  memberTransactions,
} from '@/fixtures/entities';
import { memberActionRoute } from '@/fixtures/member-actions-route';

let client: QueryClient;
let requests: { url: string; method: string; body: string }[];
let failure: { status: number; code?: string } | null;
let resolvePending: ((response: Response) => void) | undefined;
let pause: boolean;
const statuses = members.map((member) => member.status);
const transactions = new Map(memberTransactions);

beforeEach(() => {
  requests = [];
  failure = null;
  pause = false;
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  client = new QueryClient();
  vi.spyOn(client, 'invalidateQueries');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit = {}) => {
      const method = options.method ?? 'GET';

      requests.push({ url, method, body: String(options.body) });

      if (pause)
        return new Promise<Response>((resolve) => {
          resolvePending = resolve;
        });

      if (failure)
        return Response.json(
          { status: failure.status, code: failure.code, message: '오류' },
          { status: failure.status },
        );

      const { signal: _signal, ...init } = options;

      return memberActionRoute(
        new Request(new URL(url, 'https://admin.example'), init),
      );
    }),
  );
});
afterEach(() => {
  cleanup();
  members.forEach((member, index) => (member.status = statuses[index]));
  memberTransactions.clear();

  for (const [id, rows] of transactions) memberTransactions.set(id, rows);

  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const active = () => getMemberDetail(members[2].memberId)!;

function draw(member: MemberDetail = active()) {
  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemberActions, { member }),
    ),
  );
}

async function openDialog(button: string, title: string) {
  const trigger = screen.getByRole('button', { name: button });

  fireEvent.click(trigger);

  const dialog = await screen.findByRole('dialog', { name: title });

  return { trigger, dialog, inside: within(dialog) };
}

const posts = () => requests.filter((request) => request.method !== 'GET');

it.each([
  ['활성', 2, '계정 정지', false, null],
  ['정지', 7, '정지 해제', false, null],
  [
    '관리자',
    1,
    '계정 정지',
    true,
    '관리자 역할이 있는 회원은 정지할 수 없습니다.',
  ],
  [
    '탈퇴',
    4,
    '계정 정지',
    true,
    '탈퇴한 회원은 이프 조정과 계정 정지를 할 수 없습니다.',
  ],
] as const)(
  '%s 회원은 상태에 맞는 정지 버튼과 비활성 이유를 보인다',
  (_, index, label, disabled, note) => {
    const member = getMemberDetail(members[index].memberId)!;

    draw(member);

    const button = screen.getByRole('button', { name: label });

    expect((button as HTMLButtonElement).disabled).toBe(disabled);

    for (const name of ['이프 지급', '이프 회수'])
      expect(
        (screen.getByRole('button', { name }) as HTMLButtonElement).disabled,
      ).toBe(member.status === 'DELETED');

    if (note) {
      expect(screen.getByText(note)).toBeTruthy();
      expect(button.getAttribute('aria-describedby')).toBe(
        screen.getByText(note).id,
      );
    } else expect(button.getAttribute('aria-describedby')).toBeNull();
  },
);

it('정지 대화상자는 사유 칸에 초점을 두고 빈 값·공백만·501자 사유로는 요청하지 않는다', async () => {
  draw();

  const { trigger, inside } = await openDialog('계정 정지', '계정 정지');
  const input = inside.getByRole('textbox', { name: '처리 사유' });
  const confirm = inside.getByRole('button', { name: '확인' });

  await waitFor(() => expect(document.activeElement).toBe(input));

  for (const value of ['', '   ', 'a'.repeat(501)]) {
    fireEvent.change(input, { target: { value } });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(confirm);
  }

  expect(inside.getByRole('alert').textContent).toBe(
    '처리 사유를 입력해 주세요.',
  );
  expect(posts()).toHaveLength(0);
  fireEvent.click(inside.getByRole('button', { name: '취소' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it('이프 지급은 금액에 초점을 두고 범위 밖 금액·유효기간이면 확인을 막는다', async () => {
  draw();

  const { inside } = await openDialog('이프 지급', '이프 지급');
  const amount = inside.getByRole('spinbutton', { name: '금액(이프)' });
  const days = inside.getByRole('spinbutton', { name: '유효기간(일)' });
  const confirm = inside.getByRole('button', { name: '확인' });

  await waitFor(() => expect(document.activeElement).toBe(amount));
  fireEvent.change(inside.getByRole('textbox', { name: '처리 사유' }), {
    target: { value: '결제 오류 보상' },
  });

  for (const value of ['0', '100001', '1.5']) {
    fireEvent.change(amount, { target: { value } });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
  }

  fireEvent.change(amount, { target: { value: '5000' } });
  expect((confirm as HTMLButtonElement).disabled).toBe(false);

  for (const value of ['0', '366']) {
    fireEvent.change(days, { target: { value } });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
  }

  expect(posts()).toHaveLength(0);
});

it('이프 지급 성공은 요청 본문·확인 문구·성공 알림·캐시 무효화를 지킨다', async () => {
  const member = active();

  draw(member);

  const { inside } = await openDialog('이프 지급', '이프 지급');

  fireEvent.change(inside.getByRole('spinbutton', { name: '금액(이프)' }), {
    target: { value: '5000' },
  });
  expect(inside.getByText(/유효기간은 30일입니다/).textContent).toBe(
    `${member.nickname} 회원에게 5,000 이프를 지급합니다. 유효기간은 30일입니다.`,
  );
  fireEvent.change(inside.getByRole('spinbutton', { name: '유효기간(일)' }), {
    target: { value: '90' },
  });
  fireEvent.change(inside.getByRole('textbox', { name: '처리 사유' }), {
    target: { value: '결제 오류 보상' },
  });
  expect(inside.getByText(/유효기간은 90일입니다/)).toBeTruthy();
  fireEvent.click(inside.getByRole('button', { name: '확인' }));

  expect((await screen.findByRole('status')).textContent).toBe(
    '5,000 이프를 지급했습니다.',
  );

  const body = JSON.parse(posts()[0].body);

  expect(posts()[0]).toMatchObject({
    url: '/api/credits/adjustments',
    method: 'POST',
  });
  expect(body).toEqual({
    memberId: member.memberId,
    type: 'GRANT',
    amount: 5000,
    expiresInDays: 90,
    idempotencyKey: expect.stringMatching(/^[A-Za-z0-9-]{1,64}$/),
    reason: '결제 오류 보상',
  });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(client.invalidateQueries).toHaveBeenCalled();
  expect(getMemberDetail(member.memberId)!.creditBalance).toBe(
    member.creditBalance + 5000,
  );
  expect(memberTransactions.get(member.memberId)![0].reason).toBe(
    'ADMIN_GRANT',
  );
});

it('잔액보다 큰 회수는 잔액만큼만 회수됨을 안내하고 실제 적용량을 알린다', async () => {
  const member = active();

  draw(member);

  const { inside } = await openDialog('이프 회수', '이프 회수');

  expect(inside.queryByRole('spinbutton', { name: '유효기간(일)' })).toBeNull();
  fireEvent.change(inside.getByRole('spinbutton', { name: '금액(이프)' }), {
    target: { value: '10000' },
  });
  expect(inside.getByText(/회수를 요청합니다/).textContent).toBe(
    `${member.nickname} 회원에게서 10,000 이프 회수를 요청합니다. 현재 잔액이 5,240 이프라 잔액만큼만 회수됩니다.`,
  );
  fireEvent.change(inside.getByRole('textbox', { name: '처리 사유' }), {
    target: { value: '잘못 지급한 보상 회수' },
  });
  fireEvent.click(inside.getByRole('button', { name: '확인' }));

  expect((await screen.findByRole('status')).textContent).toBe(
    '5,240 이프를 회수했습니다. 잔액이 모자라 4,760 이프는 회수하지 못했습니다.',
  );
  expect(JSON.parse(posts()[0].body)).not.toHaveProperty('expiresInDays');
  expect(getMemberDetail(member.memberId)!.creditBalance).toBe(0);
});

it('실패한 지급의 재시도는 같은 멱등 키를 쓰고 금액을 바꾸면 새 키를 쓴다', async () => {
  failure = { status: 500 };
  draw();

  const { inside } = await openDialog('이프 지급', '이프 지급');
  const amount = inside.getByRole('spinbutton', { name: '금액(이프)' });

  fireEvent.change(amount, { target: { value: '100' } });
  fireEvent.change(inside.getByRole('textbox', { name: '처리 사유' }), {
    target: { value: '장애 보상' },
  });
  fireEvent.click(inside.getByRole('button', { name: '확인' }));
  expect((await inside.findByRole('alert')).textContent).toBe(
    '이프를 지급하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  );
  fireEvent.click(inside.getByRole('button', { name: '확인' }));
  await waitFor(() => expect(posts()).toHaveLength(2));
  fireEvent.change(amount, { target: { value: '200' } });
  fireEvent.click(inside.getByRole('button', { name: '확인' }));
  await waitFor(() => expect(posts()).toHaveLength(3));

  const keys = posts().map(
    (request) => JSON.parse(request.body).idempotencyKey,
  );

  expect(keys[1]).toBe(keys[0]);
  expect(keys[2]).not.toBe(keys[0]);
  expect(screen.getByRole('dialog')).toBeTruthy();
});

it.each([
  [
    { status: 409, code: 'ADMIN_ACCOUNT_PROTECTED' },
    '관리자 역할이 있는 회원은 정지할 수 없습니다.',
  ],
  [
    { status: 409, code: 'CONFLICT' },
    '계정 상태가 이미 바뀌었습니다. 회원 정보를 새로 불러왔습니다.',
  ],
  [
    { status: 404, code: 'NOT_FOUND' },
    '회원을 찾을 수 없습니다. 회원 정보를 새로 불러왔습니다.',
  ],
  [{ status: 500 }, '계정을 정지하지 못했습니다. 잠시 후 다시 시도해 주세요.'],
])(
  '정지 %o 응답은 대화상자에 오류를 보이고 사유를 유지한다',
  async (error, message) => {
    failure = error;
    draw();

    const { inside } = await openDialog('계정 정지', '계정 정지');

    fireEvent.change(inside.getByRole('textbox', { name: '처리 사유' }), {
      target: { value: '반복 신고' },
    });
    fireEvent.click(inside.getByRole('button', { name: '확인' }));
    expect((await inside.findByRole('alert')).textContent).toBe(message);
    expect(
      (
        inside.getByRole('textbox', {
          name: '처리 사유',
        }) as HTMLTextAreaElement
      ).value,
    ).toBe('반복 신고');
    expect(client.invalidateQueries).toHaveBeenCalledTimes(
      error.status === 500 ? 0 : 1,
    );
  },
);

it('정지와 해제 성공은 같은 경로에 POST·DELETE와 사유를 보낸다', async () => {
  const view = draw();
  const { inside } = await openDialog('계정 정지', '계정 정지');

  fireEvent.change(inside.getByRole('textbox', { name: '처리 사유' }), {
    target: { value: '  반복 신고  ' },
  });
  fireEvent.click(inside.getByRole('button', { name: '확인' }));
  expect((await screen.findByRole('status')).textContent).toBe(
    '계정을 정지했습니다.',
  );
  expect(members[2].status).toBe('SUSPENDED');

  view.rerender(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemberActions, { member: active() }),
    ),
  );

  const unsuspend = await openDialog('정지 해제', '계정 정지 해제');

  fireEvent.change(unsuspend.inside.getByRole('textbox'), {
    target: { value: '오신고 확인' },
  });
  fireEvent.click(unsuspend.inside.getByRole('button', { name: '확인' }));
  await screen.findByText('계정 정지를 해제했습니다.');
  expect(posts().map(({ url, method, body }) => [url, method, body])).toEqual([
    [
      `/api/members/${members[2].memberId}/suspension`,
      'POST',
      '{"reason":"반복 신고"}',
    ],
    [
      `/api/members/${members[2].memberId}/suspension`,
      'DELETE',
      '{"reason":"오신고 확인"}',
    ],
  ]);
  expect(members[2].status).toBe('ACTIVE');
});

it('처리 중에는 입력과 버튼이 비활성이고 Esc로 닫히지 않는다', async () => {
  pause = true;
  draw();

  const { inside } = await openDialog('계정 정지', '계정 정지');
  const input = inside.getByRole('textbox', { name: '처리 사유' });

  fireEvent.change(input, { target: { value: '반복 신고' } });
  fireEvent.click(inside.getByRole('button', { name: '확인' }));
  await inside.findByRole('button', { name: '처리 중…' });
  expect((input as HTMLTextAreaElement).disabled).toBe(true);
  expect(
    (inside.getByRole('button', { name: '취소' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeTruthy();
  await act(async () =>
    resolvePending!(Response.json({ status: 'SUSPENDED' })),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
