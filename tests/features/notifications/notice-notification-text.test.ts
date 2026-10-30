// @vitest-environment jsdom
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { NoticeDetailScreen } from '@/features/notices/notice-detail-screen';
import { NoticeFormScreen } from '@/features/notices/notice-form-screen';
import { getNotice } from '@/fixtures/notices';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  push.mockReset();
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

function draw(node: ReturnType<typeof createElement>) {
  return render(createElement(QueryClientProvider, { client }, node));
}

it.each([null, '2026-10-21T02:00:00Z'])(
  '5-1-11 수정은 알림 문구와 잠금 없이 제목과 사유만 보낸다: %s',
  async (notifiedAt) => {
    const item = {
      ...getNotice('b1000000-0000-4000-8000-000000000001'),
      notifiedAt,
    };
    const writes: unknown[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, options) => {
        if (options?.method === 'PATCH') writes.push(JSON.parse(options.body));

        return Response.json(item);
      }),
    );

    const view = draw(createElement(NoticeFormScreen, { id: item.noticeId }));

    await screen.findByLabelText('제목');
    expect(screen.queryByLabelText('알림 제목')).toBeNull();
    expect(screen.queryByLabelText('알림 본문')).toBeNull();
    expect(screen.queryByText(/알림 문구를 바꿀 수 없습니다/)).toBeNull();
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '제목 정정' },
    });
    fireEvent.change(screen.getByLabelText('변경 사유'), {
      target: { value: '정정' },
    });
    expect(
      screen.getByRole('button', { name: '저장' }).hasAttribute('disabled'),
    ).toBe(false);
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() =>
      expect(writes).toEqual([{ title: '제목 정정', reason: '정정' }]),
    );
  },
);
it.each(['PUBLISHED', 'DRAFT'] as const)(
  '5-1-11 %s 상세는 알림 문구를 표시하지 않고 게시 상태에서만 알림 보내기를 제공한다',
  async (status) => {
    const item = {
      ...getNotice('b1000000-0000-4000-8000-000000000001'),
      status,
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(item)),
    );
    draw(createElement(NoticeDetailScreen, { id: item.noticeId }));
    await screen.findByRole('heading', { name: item.title });
    expect(screen.queryByText('알림 제목')).toBeNull();
    expect(screen.queryByText('알림 본문')).toBeNull();

    const link = screen.queryByRole('link', { name: '알림 보내기' });

    if (status === 'PUBLISHED')
      expect(link?.getAttribute('href')).toBe(
        `/notifications/campaigns/new?noticeId=${item.noticeId}`,
      );
    else expect(link).toBeNull();
  },
);
