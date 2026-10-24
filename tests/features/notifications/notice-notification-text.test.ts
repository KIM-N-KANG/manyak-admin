// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { GET as detail, PATCH } from '@/app/api/notices/[id]/route';
import { POST } from '@/app/api/notices/route';
import { NoticeDetailScreen } from '@/features/notices/notice-detail-screen';
import { NoticeFormScreen } from '@/features/notices/notice-form-screen';
import { getNotice, saveNotice } from '@/fixtures/notices';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/notices',
}));

const valid = {
  title: '공지 원문 제목',
  body: '공지 원문 본문',
  tag: 'SERVICE',
  reason: '작성',
  notificationTitle: '별도의 알림 제목',
  notificationBody: '별도의 알림 본문',
};
let client: QueryClient;
const writes: Record<string, unknown>[] = [];

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  writes.length = 0;
  push.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: RequestInit) => {
      const method = options?.method ?? 'GET';
      const request = new Request(`http://localhost${url}`, {
        method,
        body: options?.body,
        headers: options?.headers,
      });

      if (method !== 'GET') writes.push(JSON.parse(String(options?.body)));

      if (url === '/api/notices') return POST(request);

      const context = {
        params: Promise.resolve({ id: url.split('/').at(-1)! }),
      };

      return method === 'PATCH'
        ? PATCH(request, context)
        : detail(request, context);
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

const draw = (node: ReactNode) =>
  render(createElement(QueryClientProvider, { client }, node));

function fillPublic(container: HTMLElement) {
  for (const [name, value] of Object.entries({
    title: '공지 원문 제목',
    body: '공지 원문 본문',
    reason: '작성',
  }))
    fireEvent.change(container.querySelector(`[name=${name}]`)!, {
      target: { value },
    });

  fireEvent.click(screen.getByRole('radio', { name: '공지사항' }));
}

const saveButton = () =>
  screen.getByRole('button', { name: '저장' }) as HTMLButtonElement;
const titleInput = () => screen.getByLabelText('알림 제목') as HTMLInputElement;
const bodyInput = () =>
  screen.getByLabelText('알림 본문') as HTMLTextAreaElement;

it('알림 입력을 공지 본문 아래에 비워 두고 별도 문구·글자 수·상한을 적용해 작성한다', async () => {
  const view = draw(createElement(NoticeFormScreen));

  fillPublic(view.container);
  expect(titleInput().value).toBe('');
  expect(bodyInput().value).toBe('');
  expect(titleInput().placeholder).toBe('예: 새로운 점검 안내가 도착했어요');
  expect(titleInput().maxLength).toBe(100);
  expect(bodyInput().maxLength).toBe(300);
  expect(screen.getByText('0/100')).toBeTruthy();
  expect(saveButton().disabled).toBe(true);
  expect(
    screen.getByLabelText('본문').compareDocumentPosition(titleInput()) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  fireEvent.change(titleInput(), { target: { value: '제'.repeat(23) } });
  expect(screen.getByText('23/100')).toBeTruthy();
  expect(saveButton().disabled).toBe(true);
  fireEvent.change(bodyInput(), { target: { value: '나'.repeat(301) } });
  expect(bodyInput().value).toBe('나'.repeat(300));
  expect(screen.getByText('300/300')).toBeTruthy();
  expect(saveButton().disabled).toBe(false);
  fireEvent.submit(view.container.querySelector('form')!);
  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(writes[0]).toMatchObject({
    title: valid.title,
    body: valid.body,
    notificationTitle: '제'.repeat(23),
    notificationBody: '나'.repeat(300),
  });
});

it.each([
  ['', '본문'],
  ['제목', ''],
  ['  ', '본문'],
  ['제목', '\n\t'],
])('알림 제목 %j와 본문 %j가 모두 유효해야 저장한다', (title, body) => {
  const view = draw(createElement(NoticeFormScreen));

  fillPublic(view.container);
  fireEvent.change(titleInput(), { target: { value: title } });
  fireEvent.change(bodyInput(), { target: { value: body } });
  expect(saveButton().disabled).toBe(true);
});

it('제목 붙여넣기도 100자에서 자른다', () => {
  draw(createElement(NoticeFormScreen));
  fireEvent.change(titleInput(), { target: { value: '가'.repeat(101) } });
  expect(titleInput().value).toBe('가'.repeat(100));
  expect(screen.getByText('100/100')).toBeTruthy();
});

it('알림 문구가 null인 기존 초안은 빈 칸으로 표시하고 둘 다 입력해야 수정한다', async () => {
  const id = 'b1000000-0000-4000-8000-000000000002';
  const view = draw(createElement(NoticeFormScreen, { id }));

  await screen.findByLabelText('알림 제목');
  expect(titleInput().value).toBe('');
  expect(bodyInput().value).toBe('');
  expect(saveButton().disabled).toBe(true);
  fireEvent.change(titleInput(), { target: { value: '새 알림' } });
  expect(saveButton().disabled).toBe(true);
  fireEvent.change(bodyInput(), { target: { value: '새 본문' } });
  fireEvent.change(screen.getByLabelText('변경 사유'), {
    target: { value: '문구 입력' },
  });
  fireEvent.submit(view.container.querySelector('form')!);
  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(writes[0]).toMatchObject({
    notificationTitle: '새 알림',
    notificationBody: '새 본문',
  });
});

it.each([
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000004',
])(
  '알림을 요청한 %s의 문구는 읽기 전용이고 수정 요청에서 제외한다',
  async (id) => {
    const item = getNotice(id);
    const view = draw(createElement(NoticeFormScreen, { id: item.noticeId }));

    await screen.findByLabelText('알림 제목');
    expect(titleInput().readOnly).toBe(true);
    expect(bodyInput().readOnly).toBe(true);

    const lock = screen.getByText(
      '이미 알림을 요청한 공지라 알림 문구를 바꿀 수 없습니다.',
    );

    expect(titleInput().getAttribute('aria-describedby')?.split(' ')).toContain(
      lock.id,
    );
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '공지 제목만 수정' },
    });
    fireEvent.change(screen.getByLabelText('변경 사유'), {
      target: { value: '정정' },
    });
    expect(saveButton().disabled).toBe(false);
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(writes[0]).toEqual({ title: '공지 제목만 수정', reason: '정정' });
    expect(writes[0]).not.toHaveProperty('notificationTitle');
    expect(writes[0]).not.toHaveProperty('notificationBody');
  },
);

it('알림 도움말은 묶음 제목 옆 포커스 툴팁으로 제공한다', async () => {
  draw(createElement(NoticeFormScreen));

  const trigger = screen.getByRole('button', { name: '공지 알림 문구 도움말' });

  await act(async () => trigger.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(tooltip.textContent).toBe(
    '푸시와 알림 내역에 보이는 제목과 본문입니다. 공지 제목, 본문과 따로 쓰며 게시할 때 한 번만 보냅니다. 이벤트와 홍보는 알림 제목 앞에 (광고)가 자동으로 붙어 따로 쓰지 않아도 됩니다.',
  );
  expect(trigger.getAttribute('aria-describedby')?.split(' ')).toContain(
    tooltip.id,
  );
});

it.each([true, false])(
  '상세에 독립 알림 문구를 표시하고 null은 자리 표시로 보인다: %s',
  async (hasText) => {
    const item = saveNotice(valid);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          ...item,
          notificationTitle: hasText ? valid.notificationTitle : null,
          notificationBody: hasText ? valid.notificationBody : null,
        }),
      ),
    );
    draw(createElement(NoticeDetailScreen, { id: item.noticeId }));
    await screen.findByRole('heading', { name: item.title });
    expect(
      screen.getByText('알림 제목', { selector: 'dt' }).nextElementSibling
        ?.textContent,
    ).toBe(hasText ? valid.notificationTitle : '—');
    expect(
      screen.getByText('알림 본문', { selector: 'dt' }).nextElementSibling
        ?.textContent,
    ).toBe(hasText ? valid.notificationBody : '—');
  },
);
