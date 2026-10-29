// @vitest-environment jsdom
import { createElement } from 'react';

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { GET as detail } from '@/app/api/chats/[id]/route';
import { GET as list } from '@/app/api/chats/route';
import { DetailScreen } from '@/features/shared/detail-screen';
import { ListScreen } from '@/features/shared/list-screen';
import { aiCalls, chats, deletedChats } from '@/fixtures/entities';

const state = vi.hoisted(() => ({
  summary: undefined as number | undefined,
  summaryBody: '테스트 전용 요약 본문 KNK-1913-HIDDEN-SUMMARY',
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('aiFeature=chat_compact'),
  usePathname: () => '/chats',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/features/shared/use-api', () => ({
  useApi: (url: string) => {
    const chat = { ...chats[0] };

    delete chat.summaryThroughTurn;

    return {
      data: url.includes('?')
        ? { items: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }
        : {
            ...chat,
            turnCount: 25,
            ...(state.summary === undefined
              ? {}
              : { summaryThroughTurn: state.summary }),
            summary: state.summaryBody,
          },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
}));
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
it.each([20, 0, undefined])(
  '요약 끝 턴 %s는 위치와 호환성을 지키고 대화 내용 미제공 문구를 보존한다',
  (summary) => {
    state.summary = summary;

    const { container, rerender } = render(
      createElement(DetailScreen, { domain: 'chats', id: chats[0].chatId }),
    );

    expect(
      screen.getByText('이 화면에서는 대화 내용을 제공하지 않습니다.'),
    ).toBeTruthy();
    expect(
      screen.getByText('턴 수', { selector: 'dt' }).nextElementSibling
        ?.textContent,
    ).toBe('25');

    expect(container.textContent).not.toContain(state.summaryBody);

    if (summary === undefined) {
      expect(screen.queryByText('요약 끝 턴', { selector: 'dt' })).toBeNull();

      const remainingDetail = () => ({
        items: Array.from(container.querySelectorAll('dt'))
          .filter((label) => !label.textContent?.startsWith('요약 끝 턴'))
          .map((label) => ({
            label: label.textContent,
            value: label.nextElementSibling?.textContent,
          })),
        links: Array.from(container.querySelectorAll('a')).map((link) => ({
          text: link.textContent,
          href: link.getAttribute('href'),
        })),
      });
      const withoutSummary = remainingDetail();

      expect(withoutSummary.items.length).toBeGreaterThan(0);
      expect(withoutSummary.links.length).toBeGreaterThan(0);
      state.summary = 20;
      rerender(
        createElement(DetailScreen, { domain: 'chats', id: chats[0].chatId }),
      );
      expect(screen.getByText('요약 끝 턴', { selector: 'dt' })).toBeTruthy();
      expect(remainingDetail()).toEqual(withoutSummary);
      expect(container.textContent).not.toContain(state.summaryBody);

      return;
    }

    const label = screen.getByText('요약 끝 턴', { selector: 'dt' });

    expect(label.nextElementSibling?.textContent).toBe(
      summary === 0 ? '요약 없음' : '20',
    );
    expect(
      label.parentElement!.previousElementSibling?.querySelector('dt')
        ?.textContent,
    ).toBe('턴 수');
    expect(
      label.parentElement!.nextElementSibling?.querySelector('dt')?.textContent,
    ).toBe('시작 시각');
  },
);
it('요약 끝 턴 도움말은 라벨 옆 물음표로 키보드 접근이 가능하다', async () => {
  state.summary = 20;
  render(createElement(DetailScreen, { domain: 'chats', id: chats[0].chatId }));

  const button = screen.getByRole('button', { name: '요약 끝 턴 안내' });

  act(() => button.focus());

  const tip = await screen.findByRole('tooltip');

  expect(tip.textContent).toBe(
    '대화 요약에 담긴 마지막 턴입니다. 요약을 아직 만들지 않았거나 재생성으로 요약이 비워지면 요약 없음으로 보입니다.',
  );
  expect(button.getAttribute('aria-describedby')).toBe(tip.id);
  expect(button.closest('dt')).toBeTruthy();
});
it('목록은 대화 요약 필터 이름만 표시하고 요약 끝 턴 열은 두지 않는다', () => {
  render(createElement(ListScreen, { domain: 'chats' }));
  expect(screen.getByText('대화 요약', { exact: false })).toBeTruthy();
  expect(screen.queryByRole('columnheader', { name: /요약 끝 턴/ })).toBeNull();
});
it('fixture의 모든 채팅은 요약 끝 턴을 제공하고 요약 호출 필터와 상세 BFF가 이를 보존한다', async () => {
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');

  for (const chat of [...chats, ...deletedChats]) {
    expect(Number.isInteger(chat.summaryThroughTurn)).toBe(true);
    expect(chat.summaryThroughTurn).toBeGreaterThanOrEqual(0);
    expect(chat.summaryThroughTurn).toBeLessThanOrEqual(chat.turnCount);
    expect(chat).not.toHaveProperty('summary');
  }

  const calls = aiCalls.filter(
    (call) =>
      call.feature === 'chat_compact' &&
      call.status === 'SUCCEEDED' &&
      call.latencySeconds !== null,
  );

  expect(calls.length).toBeGreaterThan(0);

  const response = list(
    new Request(
      'http://localhost/api/chats?aiFeature=chat_compact&aiStatus=SUCCEEDED&hasLatency=true&size=100',
    ),
  );

  expect(response.status).toBe(200);

  const page = await response.json();

  expect(page.items.length).toBeGreaterThan(0);
  expect(
    page.items.every((chat: { chatId: string }) =>
      calls.some((call) => call.chatId === chat.chatId),
    ),
  ).toBe(true);

  const room = chats.find((chat) => (chat.summaryThroughTurn ?? 0) > 0)!;
  const result = await detail(
    new Request(`http://localhost/api/chats/${room.chatId}`),
    { params: Promise.resolve({ id: room.chatId }) },
  );

  expect((await result.json()).summaryThroughTurn).toBe(
    room.summaryThroughTurn,
  );
});
