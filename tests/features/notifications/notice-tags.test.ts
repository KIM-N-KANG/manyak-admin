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
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { POST as publish } from '@/app/api/notices/[id]/publish/route';
import { GET as detail, PATCH } from '@/app/api/notices/[id]/route';
import { GET as list, POST } from '@/app/api/notices/route';
import { NoticeDetailScreen } from '@/features/notices/notice-detail-screen';
import { NoticeFormScreen } from '@/features/notices/notice-form-screen';
import { NoticeListScreen } from '@/features/notices/notice-list-screen';
import { noticeTagHelp, noticeTags } from '@/features/notices/tags';
import { saveNotice } from '@/fixtures/notices';
import { listCampaigns } from '@/fixtures/notifications';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/notices',
}));

let client: QueryClient;
const writes: { url: string; body: Record<string, unknown> }[] = [];

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

      if (method !== 'GET')
        writes.push({ url, body: JSON.parse(String(options?.body)) });

      if (url.split('?')[0] === '/api/notices')
        return method === 'POST' ? POST(request) : list(request);

      const [, id, action] =
        url.match(/^\/api\/notices\/([^/]+)(?:\/(publish))?$/) ?? [];

      if (!id) throw new Error(`Unexpected ${url}`);

      const context = { params: Promise.resolve({ id }) };

      return action
        ? publish(request, context)
        : method === 'PATCH'
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

it('다섯 태그는 기본 선택 없이 제목 위에 놓이고 점검을 골라야 저장할 수 있다', async () => {
  const view = draw(createElement(NoticeFormScreen));
  const radios = screen.getAllByRole('radio') as HTMLInputElement[];

  expect(radios.map((radio) => radio.value)).toEqual([
    'SERVICE',
    'UPDATE',
    'MAINTENANCE',
    'EVENT',
    'PROMOTION',
  ]);
  expect(
    radios.map((radio) => radio.parentElement!.textContent?.trim()),
  ).toEqual(['공지사항', '업데이트', '점검', '이벤트', '홍보']);
  expect(radios.every((radio) => !radio.checked)).toBe(true);
  expect(
    (screen.getByRole('button', { name: '저장' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    view.container
      .querySelector('fieldset')!
      .compareDocumentPosition(screen.getByLabelText('제목')) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  for (const [name, value] of Object.entries({
    title: '점검 테스트',
    body: '본문',
    reason: '작성',
  }))
    fireEvent.change(view.container.querySelector(`[name=${name}]`)!, {
      target: { value },
    });

  fireEvent.click(screen.getByRole('radio', { name: '점검' }));
  expect(
    (screen.getByRole('button', { name: '저장' }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
  fireEvent.submit(view.container.querySelector('form')!);
  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(writes[0]).toEqual({
    url: '/api/notices',
    body: {
      title: '점검 테스트',
      body: '본문',
      reason: '작성',
      tag: 'MAINTENANCE',
    },
  });
});

it('수정은 현재 이벤트를 선택하고 바꾼 태그를 전달한다', async () => {
  const item = saveNotice({
    title: '수정 테스트',
    body: '본문',
    tag: 'EVENT',
    reason: '작성',
  });
  const view = draw(createElement(NoticeFormScreen, { id: item.noticeId }));

  expect(
    ((await screen.findByRole('radio', { name: '이벤트' })) as HTMLInputElement)
      .checked,
  ).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: '업데이트' }));
  fireEvent.change(screen.getByLabelText('변경 사유'), {
    target: { value: '태그 수정' },
  });
  fireEvent.submit(view.container.querySelector('form')!);
  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(writes[0].body.tag).toBe('UPDATE');
});

it('태그 도움말은 포커스로 열리고 aria-describedby로 연결된다', async () => {
  draw(createElement(NoticeFormScreen));

  const trigger = screen.getByRole('button', { name: '공지 태그 도움말' });

  await act(async () => trigger.focus());

  const tooltip = await screen.findByRole('tooltip');

  expect(tooltip.textContent).toBe(
    '공지사항, 업데이트, 점검은 정보성이고 이벤트와 홍보는 광고성입니다. 이 공지로 알림을 보내면 태그에 따라 알림 성격이 정해집니다. 정보성은 활성 회원 전체의 알림함에 표시되고 푸시는 서비스 알림 설정과 기기 수신 가능 여부에 따라 발송됩니다. 광고성은 광고 수신에 동의한 활성 회원의 알림함에 원문으로 표시되고 푸시 제목 앞에는 (광고)가 자동으로 붙습니다. 푸시는 광고 수신 동의, 야간 수신 동의, 기기 수신 가능 여부에 따라 발송됩니다.',
  );
  expect(trigger.getAttribute('aria-describedby')?.split(' ')).toContain(
    tooltip.id,
  );
  expect(screen.getAllByText(noticeTagHelp)).toHaveLength(1);
});

it.each(['UPDATE', 'NEWS', 'ACTIVE'])(
  '목록 제목 앞과 상세 제목 옆의 %s 배지는 중립이며 모르는 값도 보존한다',
  async (tag) => {
    const item = {
      ...saveNotice({
        notificationTitle: '알림 제목',
        notificationBody: '알림 본문',
        title: `배지 ${tag}`,
        body: '본문',
        tag: 'UPDATE',
        reason: '작성',
      }),
      tag,
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        Response.json(
          url.includes('?')
            ? {
                items: [item],
                page: 1,
                size: 20,
                totalPages: 1,
                totalElements: 1,
              }
            : item,
        ),
      ),
    );

    const view = draw(createElement(NoticeListScreen));
    const link = await screen.findByRole('link', { name: item.title });
    const label = tag === 'UPDATE' ? '업데이트' : tag;
    const badge = within(link.parentElement!).getByText(label);

    expect(badge.className).toContain('bg-muted');
    expect(
      badge.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    view.unmount();
    draw(createElement(NoticeDetailScreen, { id: item.noticeId }));

    const heading = await screen.findByRole('heading', { name: item.title });

    expect(within(heading.parentElement!).getByText(label).className).toBe(
      badge.className,
    );
  },
);

it.each(noticeTags)(
  '$label 게시 요청에는 사유만 보내고 알림을 요청하지 않는다',
  async ({ value: tag }) => {
    const item = saveNotice({
      title: `게시 ${tag}`,
      body: '본문',
      tag,
      reason: '작성',
    });

    draw(createElement(NoticeDetailScreen, { id: item.noticeId }));
    await screen.findByRole('heading', { name: item.title });
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    fireEvent.change(screen.getByLabelText('처리 사유'), {
      target: { value: '게시 사유' },
    });
    fireEvent.click(screen.getByRole('button', { name: '게시' }));

    const dialog = await screen.findByRole('dialog');

    expect(dialog.textContent).toContain(
      '게시하면 회원과 게스트에게 공지가 보입니다. 알림은 가지 않으며 게시한 뒤 알림 보내기로 따로 보냅니다. 게시할까요?',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(writes).toEqual([
      {
        url: `/api/notices/${item.noticeId}/publish`,
        body: { reason: '게시 사유' },
      },
    ]);
    expect(
      listCampaigns().find((campaign) => campaign.noticeId === item.noticeId)
        ?.kind,
    ).toBeUndefined();
  },
);

it.each([
  ['SERVICE', null, true],
  ['PROMOTION', null, true],
  ['SERVICE', '2026-10-21T02:00:00Z', false],
  ['PROMOTION', '2026-10-21T02:00:00Z', false],
  ['EVENT', '2026-10-21T02:00:00Z', null],
  ['SERVICE', null, null],
  ['PROMOTION', null, false],
] as const)(
  '%s 공지는 notifiedAt=%s와 notified=%j와 무관하다',
  async (tag, notifiedAt, notified) => {
    const item = {
      ...saveNotice({
        notificationTitle: '알림 제목',
        notificationBody: '알림 본문',
        title: '알림 요청 확인',
        body: '본문',
        tag,
        reason: '작성',
      }),
      notified,
      notifiedAt,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(item)));
    draw(createElement(NoticeDetailScreen, { id: item.noticeId }));
    await screen.findByRole('heading', { name: item.title });
    fireEvent.change(screen.getByLabelText('처리 사유'), {
      target: { value: '게시 사유' },
    });
    fireEvent.click(screen.getByRole('button', { name: '게시' }));

    const dialog = await screen.findByRole('dialog');
    const expected =
      '게시하면 회원과 게스트에게 공지가 보입니다. 알림은 가지 않으며 게시한 뒤 알림 보내기로 따로 보냅니다. 게시할까요?';

    expect(dialog.textContent).toContain(expected);

    if (notifiedAt) expect(dialog.textContent).not.toContain('알림이 갑니다');
  },
);
