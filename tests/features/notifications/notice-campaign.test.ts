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

import { GET as noticeDetail } from '@/app/api/notices/[id]/route';
import { GET as notices } from '@/app/api/notices/route';
import { POST as create } from '@/app/api/notifications/campaigns/route';
import { GET as targets } from '@/app/api/notifications/campaigns/target-count/route';
import { CampaignDetailScreen } from '@/features/notifications/campaign-detail-screen';
import { CampaignFormScreen } from '@/features/notifications/campaign-form-screen';
import type * as LoadingTiming from '@/features/shared/loading-timing';
import { publishNotice, saveNotice } from '@/fixtures/notices';
import { changeCampaign, getCampaign } from '@/fixtures/notifications';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/shared/loading-timing', async (importOriginal) => ({
  ...(await importOriginal<typeof LoadingTiming>()),
  finishInitialLoading: async () => {},
}));

let client: QueryClient;
const writes: Record<string, unknown>[] = [];
let empty = false;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-30T13:00:00Z'));
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  delete (
    globalThis as typeof globalThis & { manyakNotificationFixtures?: unknown }
  ).manyakNotificationFixtures;
  writes.length = 0;
  empty = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: RequestInit) => {
      const req = new Request(`http://localhost${url}`, {
        method: options?.method,
        body: options?.body,
      });

      if (url.includes('target-count')) return targets(req);

      if (url.startsWith('/api/notices?'))
        return empty ? Response.json({ items: [] }) : notices(req);

      if (url.startsWith('/api/notices/'))
        return noticeDetail(req, {
          params: Promise.resolve({ id: url.split('/').at(-1)! }),
        });

      if (options?.method === 'POST') {
        writes.push(JSON.parse(String(options.body)));

        return create(req);
      }

      if (url.startsWith('/api/notifications/campaigns/'))
        return Response.json(getCampaign(url.split('/').at(-1)!));

      throw new Error(url);
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function draw(noticeId?: string) {
  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(CampaignFormScreen, { noticeId }),
    ),
  );
}

function published(tag = 'UPDATE') {
  const n = saveNotice({
    title: `연결 공지 ${tag}`,
    body: '공지 본문',
    tag,
    reason: '작성',
  });

  return publishNotice(n.noticeId, { reason: '게시' });
}

function fill() {
  for (const [label, value] of [
    ['제목', '별도 제목'],
    ['본문', '별도 본문'],
    ['사유', '발송 사유'],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

it('5-1-16 기본 이동 대상 없음이고 종류 선택과 공지 작성 안내가 없다', async () => {
  draw();
  expect(
    (screen.getByRole('radio', { name: '없음' }) as HTMLInputElement).checked,
  ).toBe(true);
  expect(screen.queryByRole('radio', { name: '정보성' })).toBeNull();
  expect(screen.queryByRole('link', { name: '공지 작성으로 이동' })).toBeNull();
  expect(
    screen.getByText(
      '광고성 알림입니다. 광고 수신에 동의한 활성 회원의 알림함에 남고 푸시는 그중 알림 기기를 등록한 회원에게 갑니다.',
    ),
  ).toBeTruthy();
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('kind=MARKETING'),
      expect.anything(),
    ),
  );
});
it.each(['UPDATE', 'EVENT'])(
  '5-1-16 URL 공지 %s의 성격과 대상 수, 미리보기, 확인 문구와 요청을 결정한다',
  async (tag) => {
    const n = published(tag);

    draw(n.noticeId);
    fill();
    await screen.findAllByText(n.title);

    const marketing = tag === 'EVENT';

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`kind=${marketing ? 'MARKETING' : 'SERVICE'}`),
        expect.anything(),
      ),
    );
    expect(screen.getByTestId('preview-title').textContent).toBe(
      `${marketing ? '(광고) ' : ''}별도 제목`,
    );
    expect(
      screen.getByTestId('preview-body').textContent?.includes('수신거부'),
    ).toBe(marketing);
    expect(!!screen.queryByText('야간 규칙 적용')).toBe(marketing);

    const submit = screen.getByRole('button', { name: '검토 후 발송' });

    await waitFor(() => expect(submit.hasAttribute('disabled')).toBe(false));
    fireEvent.click(submit);

    const dialog = await screen.findByRole('dialog');

    expect(
      within(dialog).getByText(marketing ? '광고성' : '정보성'),
    ).toBeTruthy();
    expect(dialog.textContent).toContain(n.title);
    expect(dialog.textContent).toContain(
      '발송을 시작할 때 공지를 다시 확인합니다. 공지가 게시 상태가 아니면 보내지 않고, 태그가 바뀌었으면 바뀐 태그로 알림 성격을 정합니다.',
    );

    if (!marketing) expect(within(dialog).queryByText('야간 규칙')).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: '발송' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({
      title: '별도 제목',
      body: '별도 본문',
      reason: '발송 사유',
      noticeId: n.noticeId,
    });
  },
);
it('5-1-16 공지에서 스토리로 바꾸면 광고성으로 다시 집계하고 공지 ID를 보내지 않는다', async () => {
  const n = published();
  const view = draw(n.noticeId);

  await screen.findAllByText(n.title);
  fill();
  await waitFor(() =>
    expect(screen.getByTestId('preview-title').textContent).toBe('별도 제목'),
  );

  const marketingRequests = () =>
    vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => String(url).includes('kind=MARKETING'))
      .length;
  const previousCount = marketingRequests();

  fireEvent.click(screen.getByRole('radio', { name: '스토리' }));
  await waitFor(() => expect(marketingRequests()).toBe(previousCount + 1));
  expect(screen.getByTestId('preview-title').textContent).toBe(
    '(광고) 별도 제목',
  );
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('kind=MARKETING'),
      expect.anything(),
    ),
  );

  const submit = screen.getByRole('button', { name: '검토 후 발송' });

  await waitFor(() => expect(submit.hasAttribute('disabled')).toBe(false));
  fireEvent.click(submit);

  const dialog = await screen.findByRole('dialog');

  expect(dialog.textContent).not.toContain(
    '발송을 시작할 때 공지를 다시 확인합니다.',
  );
  fireEvent.click(within(dialog).getByRole('button', { name: '발송' }));
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]).not.toHaveProperty('noticeId');
  view.unmount();
});
it.each([
  [
    'b1000000-0000-4000-8000-000000000002',
    '게시되지 않은 공지입니다. 게시된 공지만 이동 대상으로 지정할 수 있습니다.',
  ],
  [
    '00000000-0000-4000-8000-000000000000',
    '공지를 찾을 수 없습니다. 다른 공지를 선택하거나 선택을 해제해 주세요.',
  ],
])(
  '5-1-16 URL 공지 오류 %s는 미선택으로 두고 확정을 막는다',
  async (id, message) => {
    draw(id);
    fill();
    await screen.findByText(message);
    expect(
      screen
        .getByRole('button', { name: '검토 후 발송' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByText('이동 대상 공지를 선택해 주세요.')).toBeTruthy();
  },
);
it('5-1-16 공지 검색은 게시 상태와 검색어를 보내고 태그와 게시 시각을 표시한다', async () => {
  const n = published('MAINTENANCE');

  draw();
  fireEvent.click(screen.getByRole('radio', { name: '공지' }));
  fireEvent.change(screen.getByLabelText('이동 대상 공지 검색'), {
    target: { value: n.title },
  });

  const button = await screen.findByRole('button', {
    name: new RegExp(n.title),
  });

  expect(button.textContent).toContain('점검');
  expect(button.textContent).toContain('2026.');

  const calls = vi
    .mocked(fetch)
    .mock.calls.map(([url]) => new URL(String(url), 'http://localhost'));

  expect(
    calls.some(
      (u) =>
        u.searchParams.get('status') === 'PUBLISHED' &&
        u.searchParams.get('q') === n.title,
    ),
  ).toBe(true);
  fireEvent.click(button);
  expect(screen.getAllByText(n.title)).toHaveLength(2);
});
it('5-1-16 공지 없음과 검색 결과 없음 문구를 구분한다', async () => {
  empty = true;
  draw();
  fireEvent.click(screen.getByRole('radio', { name: '공지' }));
  await screen.findByText('게시된 공지가 없습니다.');
  fireEvent.change(screen.getByLabelText('이동 대상 공지 검색'), {
    target: { value: '점검' },
  });
  await screen.findByText('검색 조건에 맞는 공지가 없습니다.');
});
it.each([
  [
    'NOTICE_NOT_PUBLISHED',
    '발송을 시작할 때 공지가 게시 상태가 아니어서 보내지 않았습니다. 공지를 다시 게시한 뒤 재실행하면 보낼 수 있습니다.',
  ],
  ['OTHER_REASON', 'OTHER_REASON'],
  [null, null],
])(
  '5-1-17 실패 사유 %s를 상태 아래에 표시하고 재실행으로 지운다',
  async (failureReason, message) => {
    const id = 'c1000000-0000-4000-8000-000000000005';
    const item = { ...getCampaign(id), status: 'FAILED', failureReason };

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(item)),
    );
    render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(CampaignDetailScreen, { id }),
      ),
    );
    await screen.findByRole('heading', { name: item.title });

    if (message) expect(screen.getByText(message)).toBeTruthy();
    else expect(screen.queryByText('실패 사유')).toBeNull();

    expect(screen.getByRole('button', { name: '재실행' })).toBeTruthy();

    const retried = changeCampaign(id, 'retry', { reason: '재실행' });

    expect(retried.failureReason).toBeNull();
    await act(async () => {
      client.setQueryData([`/api/notifications/campaigns/${id}`], retried);
    });

    if (message)
      await waitFor(() => expect(screen.queryByText(message)).toBeNull());
  },
);
it.each(['SCHEDULED', 'SENT'])(
  '5-1-17 %s 공지 알림만 성격 재확인 표시를 제공한다',
  async (status) => {
    const item = {
      ...getCampaign('c1000000-0000-4000-8000-000000000001'),
      status,
      kind: 'SERVICE',
      noticeId: published().noticeId,
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(item)),
    );
    render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(CampaignDetailScreen, { id: item.campaignId }),
      ),
    );
    await screen.findByRole('heading', { name: item.title });
    expect(screen.getByText('정보성')).toBeTruthy();

    if (status === 'SCHEDULED') {
      expect(screen.getByText('발송 때 다시 확인')).toBeTruthy();
      await act(async () =>
        screen
          .getByRole('button', { name: '발송 때 다시 확인 도움말' })
          .focus(),
      );
      expect((await screen.findByRole('tooltip')).textContent).toBe(
        '발송을 시작할 때 공지의 태그로 알림 성격을 다시 정합니다. 지금 보이는 성격과 대상 회원 수는 예약할 때 기준입니다.',
      );
    } else expect(screen.queryByText('발송 때 다시 확인')).toBeNull();
  },
);
