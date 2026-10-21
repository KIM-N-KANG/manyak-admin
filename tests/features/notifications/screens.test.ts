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
import { CampaignDetailScreen } from '@/features/notifications/campaign-detail-screen';
import { CampaignFormScreen } from '@/features/notifications/campaign-form-screen';
import { CampaignListScreen } from '@/features/notifications/campaign-list-screen';
import { TemplateScreen } from '@/features/notifications/template-screen';
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
  it.each(['SERVICE', 'MARKETING'])(
    '공지 %s 안내와 게시 확인에 종류·동의 대상·야간 기준을 표시한다',
    async (kind) => {
      const item = saveNotice({
        title: '동의 안내 확인',
        body: '공지 본문',
        reason: '작성',
      });

      render(wrap(createElement(NoticeDetailScreen, { id: item.noticeId })));
      await screen.findByRole('heading', { name: '동의 안내 확인' });
      fireEvent.click(
        screen.getByRole('checkbox', { name: '게시할 때 알림 보내기' }),
      );
      fireEvent.change(screen.getByRole('combobox', { name: '알림 종류' }), {
        target: { value: kind },
      });

      const guidance = screen.getByText(
        kind === 'SERVICE'
          ? /^정보성은 서비스 알림 동의자에게/
          : /^광고성 알림은 광고 수신에 동의한 회원만 대상이며/,
      );

      expect(guidance.textContent).toContain(
        '정보성은 서비스 알림 동의자에게 야간 제한 없이 발송',
      );

      if (kind === 'MARKETING')
        expect(guidance.textContent).toContain('야간 광고 수신 동의자만 대상');

      fireEvent.change(screen.getByRole('textbox', { name: '처리 사유' }), {
        target: { value: '게시 사유' },
      });
      fireEvent.click(screen.getByRole('button', { name: '게시' }));

      const dialog = await screen.findByRole('dialog');

      expect(dialog.textContent).toContain(
        kind === 'SERVICE'
          ? '정보성 알림을 서비스 알림 동의자에게 야간 제한 없이 발송'
          : '광고성 알림은 광고 수신에 동의한 회원만 대상',
      );

      if (kind === 'MARKETING')
        expect(dialog.textContent).toContain(
          '야간 광고 수신 동의자에게만 발송',
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
  it('storyId를 선택에 채우고 계약 없는 이동 대상을 발송하지 않는다', async () => {
    const id = stories[0].storyId;
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
    expect((await screen.findByRole('alert')).textContent).toContain(
      '아직 지원하지 않습니다',
    );
    expect(writes).toHaveLength(0);
    fireEvent.change(screen.getByRole('combobox', { name: '종류' }), {
      target: { value: 'SERVICE' },
    });
    expect(
      screen
        .getByRole('link', { name: '공지 작성으로 이동' })
        .getAttribute('href'),
    ).toBe('/notices/new');
    expect((submit as HTMLButtonElement).disabled).toBe(true);
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
      title: '삭제 초안',
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

    await screen.findByRole('heading', { name: '출석 리마인더' });
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
