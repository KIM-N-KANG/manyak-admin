// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DELETE as deleteNotice,
  GET as notice,
} from '@/app/api/notices/[id]/route';
import { GET as detail } from '@/app/api/notifications/campaigns/[id]/route';
import {
  GET as campaigns,
  POST as createCampaign,
} from '@/app/api/notifications/campaigns/route';
import { GET as count } from '@/app/api/notifications/campaigns/target-count/route';
import { GET as template } from '@/app/api/notifications/templates/[key]/route';
import { GET as storyDetail } from '@/app/api/stories/[id]/route';
import { GET as storyList } from '@/app/api/stories/route';
import { NoticeDetailScreen } from '@/features/notices/notice-detail-screen';
import { NoticeFormScreen } from '@/features/notices/notice-form-screen';
import { CampaignDetailScreen } from '@/features/notifications/campaign-detail-screen';
import { CampaignFormScreen } from '@/features/notifications/campaign-form-screen';
import { CampaignListScreen } from '@/features/notifications/campaign-list-screen';
import { TemplateScreen } from '@/features/notifications/template-screen';
import { ServerDataProvider } from '@/features/shared/data-source';
import { stories } from '@/fixtures/entities';
import { saveNotice } from '@/fixtures/notices';

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  search: '',
  pathname: '/notifications/campaigns',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => nav.pathname,
}));

let client: QueryClient;
let fail = false;
const writes: { url: string; body: unknown }[] = [];

beforeEach(() => {
  nav.push.mockReset();
  nav.search = '';
  fail = false;
  writes.length = 0;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: RequestInit) => {
      const method = options?.method ?? 'GET';
      const request = new Request(`http://localhost${url}`, {
        method,
        body: options?.body,
        headers: options?.headers,
      });

      if (method !== 'GET') {
        writes.push({ url, body: JSON.parse(String(options?.body)) });

        if (fail)
          return Response.json(
            { message: '다시 시도해 주세요.' },
            { status: 503 },
          );
      }

      if (url.includes('/target-count')) return count(request);

      if (url.startsWith('/api/stories?')) return storyList(request);

      if (url.startsWith('/api/stories/'))
        return storyDetail(request, {
          params: Promise.resolve({ id: url.split('/').at(-1)! }),
        });

      if (url.startsWith('/api/notifications/templates/'))
        return template(request, {
          params: Promise.resolve({ key: 'attendance_reminder' }),
        });

      if (url.startsWith('/api/notices/'))
        return (method === 'DELETE' ? deleteNotice : notice)(request, {
          params: Promise.resolve({ id: url.split('/').at(-1)! }),
        });

      if (/^\/api\/notifications\/campaigns\/[\w-]+$/.test(url))
        return detail(request, {
          params: Promise.resolve({ id: url.split('/').at(-1)! }),
        });

      if (url.startsWith('/api/notifications/campaigns'))
        return method === 'POST' ? createCampaign(request) : campaigns(request);

      throw new Error(`Unexpected ${url}`);
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

function wrap(node: ReactNode) {
  return createElement(QueryClientProvider, { client }, node);
}

function fill(view: HTMLElement) {
  for (const [name, value] of Object.entries({
    title: '이프 행사',
    body: '새 이야기를 시작하세요.',
    reason: '행사 안내',
  }))
    fireEvent.change(view.querySelector(`[name=${name}]`)!, {
      target: { value },
    });
}

describe('알림 화면의 BFF 연결', () => {
  it.each(['SERVICE', 'PROMOTION'])(
    '공지 %s 태그의 게시 확인에 알림 대상을 표시한다',
    async (tag) => {
      const item = saveNotice({
        notificationTitle: '알림 제목',
        notificationBody: '알림 본문',
        title: '동의 안내 확인',
        tag,
        body: '공지 본문',
        reason: '작성',
      });

      render(wrap(createElement(NoticeDetailScreen, { id: item.noticeId })));
      await screen.findByRole('heading', { name: '동의 안내 확인' });
      expect(screen.queryByRole('checkbox')).toBeNull();
      expect(screen.queryByRole('combobox', { name: '알림 성격' })).toBeNull();

      fireEvent.change(screen.getByRole('textbox', { name: '처리 사유' }), {
        target: { value: '게시 사유' },
      });
      fireEvent.click(screen.getByRole('button', { name: '게시' }));

      const dialog = await screen.findByRole('dialog');

      expect(dialog.textContent).toContain(
        tag === 'SERVICE'
          ? '게시하면 회원에게 알림이 갑니다. 게시할까요?'
          : '게시하면 광고 수신에 동의한 회원에게 광고 알림이 갑니다. 게시할까요?',
      );

      expect(writes).toHaveLength(0);
    },
  );

  it('대상 수 확인 전 발송하지 않고 실패 후 문구를 유지해 재시도한다', async () => {
    const view = render(wrap(createElement(CampaignFormScreen)));

    fill(view.container);

    const submit = screen.getByRole('button', { name: '대상 확인 후 발송' });

    await waitFor(() =>
      expect((submit as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(submit);

    const dialog = await screen.findByRole('dialog');

    expect(dialog.textContent).toContain('412명');
    expect(dialog.textContent).toContain(
      '광고성 알림은 광고 수신에 동의한 회원만 대상',
    );
    expect(dialog.textContent).toContain('야간 광고 수신 동의자에게만 발송');
    expect(
      screen
        .getByText(/광고성 알림은 광고 수신에 동의한 회원만 대상.*정보성은/)
        .textContent?.replace(/\s+/g, ' '),
    ).toContain('정보성은 서비스 알림 동의자에게 야간 제한 없이 발송');
    expect(writes).toHaveLength(0);
    fail = true;
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await screen.findByRole('alert');
    expect(
      (view.container.querySelector('[name=title]') as HTMLInputElement).value,
    ).toBe('이프 행사');
    fail = false;
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith(
        expect.stringMatching(/^\/notifications\/campaigns\//),
      ),
    );
    expect(writes[1].body).toEqual({
      title: '이프 행사',
      body: '새 이야기를 시작하세요.',
      reason: '행사 안내',
    });
  });
  it('공개 스토리 storyId를 미리 채우고 확인 후 요청 본문에 보낸다', async () => {
    const id = stories.find((story) => story.visibility === 'PUBLIC')!.storyId;
    const view = render(
      wrap(createElement(CampaignFormScreen, { storyId: id })),
    );

    fill(view.container);
    expect(
      (
        screen.getByRole('combobox', {
          name: '이동 대상 스토리',
        }) as HTMLSelectElement
      ).value,
    ).toBe(id);

    const submit = screen.getByRole('button', { name: '대상 확인 후 발송' });

    await waitFor(() =>
      expect((submit as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(submit);

    const dialog = await screen.findByRole('dialog');

    expect(dialog.textContent).toContain(
      stories.find((s) => s.storyId === id)!.title,
    );
    expect(writes).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalled());
    expect(writes[0].body).toMatchObject({ storyId: id });
  });
  it('비공개 스토리 미리 채움은 발송을 막고 정보성은 공지 작성으로 안내한다', async () => {
    render(
      wrap(
        createElement(CampaignFormScreen, {
          storyId: stories.find((s) => s.visibility === 'PRIVATE')!.storyId,
        }),
      ),
    );
    await screen.findByRole('alert');
    expect(
      (
        screen.getByRole('button', {
          name: '대상 확인 후 발송',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByRole('combobox', { name: '종류' }), {
      target: { value: 'SERVICE' },
    });
    expect(
      screen
        .getByRole('link', { name: '공지 작성으로 이동' })
        .getAttribute('href'),
    ).toBe('/notices/new');
    expect(writes).toHaveLength(0);
  });
  it('목록의 숫자 페이지·정렬이 필터를 보존한다', async () => {
    nav.search = 'page=2&size=2&status=SCHEDULED';
    render(wrap(createElement(CampaignListScreen)));
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: '예약 시각' }));
    expect(nav.push).toHaveBeenCalledWith(
      '/notifications/campaigns?page=1&size=2&status=SCHEDULED&sort=scheduledAt&order=desc',
    );
    expect(
      screen.getByRole('link', { name: '1페이지' }).getAttribute('href'),
    ).toContain('status=SCHEDULED');
  });
  it('완료 캠페인은 변경 버튼 없이 도달 회원과 기기 단계를 구분한다', async () => {
    render(
      wrap(
        createElement(CampaignDetailScreen, {
          id: 'c1000000-0000-4000-8000-000000000003',
        }),
      ),
    );
    await screen.findByRole('list', { name: '발송 단계' });
    expect(screen.queryByRole('button', { name: '예약 취소' })).toBeNull();
    expect(screen.queryByRole('button', { name: '재실행' })).toBeNull();
    expect(
      screen.getByRole('list', { name: '발송 단계' }).textContent,
    ).toContain('도달 기기');
  });
  it('공지 초안 삭제의 204 응답 후 목록으로 이동한다', async () => {
    const item = saveNotice({
      notificationTitle: '알림 제목',
      notificationBody: '알림 본문',
      title: '삭제 초안',
      tag: 'SERVICE',
      body: '본문',
      reason: '작성',
    });

    render(wrap(createElement(NoticeDetailScreen, { id: item.noticeId })));
    await screen.findByRole('heading', { name: '삭제 초안' });
    fireEvent.change(screen.getByRole('textbox', { name: '처리 사유' }), {
      target: { value: '초안 정리' },
    });
    fireEvent.click(screen.getByRole('button', { name: '초안 삭제' }));

    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/notices'));
  });
  it('문구의 과거 시작 시각은 확인 다이얼로그 전에 거절한다', async () => {
    const view = render(wrap(createElement(TemplateScreen)));

    await screen.findByRole('heading', { name: '출석 알림' });
    fireEvent.change(view.container.querySelector('[name=effectiveFrom]')!, {
      target: { value: '2000-01-01T10:00' },
    });
    fireEvent.change(view.container.querySelector('[name=reason]')!, {
      target: { value: '사유' },
    });
    fireEvent.click(screen.getByRole('button', { name: '문구 변경' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      '현재 이후',
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(writes).toHaveLength(0);
  });
});

it('서버 모드에서도 홍보 스토리를 검색·미리 채우고 확인 후 storyId를 전송한다', async () => {
  const story = stories.find((item) => item.visibility === 'PUBLIC')!;
  const view = render(
    wrap(
      createElement(
        ServerDataProvider,
        { value: true },
        createElement(CampaignFormScreen, { storyId: story.storyId }),
      ),
    ),
  );

  expect(
    screen.getByRole('combobox', { name: '이동 대상 스토리' }),
  ).toBeTruthy();
  expect(
    screen.queryByText(/스토리 이동 대상 지정은 준비 중입니다/),
  ).toBeNull();
  await waitFor(() =>
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) => String(url).startsWith('/api/stories?')),
    ).toBe(true),
  );
  fireEvent.change(screen.getByLabelText('홍보할 스토리 검색'), {
    target: { value: '이야기' },
  });
  await waitFor(() =>
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) =>
          String(url).includes(`q=${encodeURIComponent('이야기')}`),
        ),
    ).toBe(true),
  );
  fill(view.container);

  const submit = screen.getByRole('button', { name: '대상 확인 후 발송' });

  await waitFor(() => expect(submit.hasAttribute('disabled')).toBe(false));
  fireEvent.click(submit);

  const dialog = await screen.findByRole('dialog');

  expect(dialog.textContent).toContain(story.title);
  expect(writes).toHaveLength(0);
  fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0].body).toMatchObject({ storyId: story.storyId });
});

it.each(['도달 회원', '도달 기기', '실패 기기'])(
  '서버 캠페인 목록의 검색·종류 필터를 표시하고 %s 정렬에서 보존한다',
  async (label) => {
    nav.search = 'page=2&size=2&q=행사&kind=MARKETING';
    render(
      wrap(
        createElement(
          ServerDataProvider,
          { value: true },
          createElement(CampaignListScreen),
        ),
      ),
    );

    const button = await screen.findByRole('button', { name: label });

    expect(screen.getByRole('searchbox')).toBeTruthy();
    expect((screen.getByLabelText('종류') as HTMLSelectElement).value).toBe(
      'MARKETING',
    );
    expect(
      screen.queryByText('제목·본문 검색과 종류 필터는 준비 중입니다.'),
    ).toBeNull();
    fireEvent.click(button);

    const query = new URL(nav.push.mock.calls.at(-1)![0], 'http://localhost')
      .searchParams;

    expect(query.get('q')).toBe('행사');
    expect(query.get('kind')).toBe('MARKETING');
    expect(query.get('page')).toBe('1');
    expect(query.get('sort')).toBe(
      (
        {
          '도달 회원': 'deliveredMembers',
          '도달 기기': 'deliveredDevices',
          '실패 기기': 'failedDevices',
        } as Record<string, string>
      )[label],
    );
  },
);

it('서버 공지의 null 본문은 편집 화면에서 빈 입력으로 표시한다', async () => {
  const notice = saveNotice({
    notificationTitle: '알림 제목',
    notificationBody: '알림 본문',
    title: 'nullable 공지',
    tag: 'SERVICE',
    body: '본문',
    reason: '작성',
  });

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ ...notice, body: null })),
  );
  render(wrap(createElement(NoticeFormScreen, { id: notice.noticeId })));
  await screen.findByRole('heading', { name: '공지 수정' });
  expect((screen.getByLabelText('본문') as HTMLTextAreaElement).value).toBe('');
});
