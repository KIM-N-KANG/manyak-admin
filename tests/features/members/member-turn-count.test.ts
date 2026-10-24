// @vitest-environment jsdom
import { createElement } from 'react';

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/members/[id]/route';
import { DetailScreen } from '@/features/shared/detail-screen';
import { ListScreen } from '@/features/shared/list-screen';
import { chats, getMemberDetail, members } from '@/fixtures/entities';

const data = vi.hoisted(() => ({ turns: 1234 }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/members',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/features/shared/use-api', () => ({
  useApi: (url: string) => ({
    data:
      url === `/api/members/${members[0].memberId}`
        ? { ...getMemberDetail(members[0].memberId), turnCount: data.turns }
        : {
            items: url.startsWith('/api/members?') ? members : [],
            page: 1,
            size: 20,
            totalElements: 0,
            totalPages: 0,
          },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
beforeEach(() => {
  data.turns = 1234;
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
it.each([1234, 0])(
  '회원 상세의 누적 턴 %i를 채팅 다음·소모 이프 앞에 표시한다',
  (turns) => {
    data.turns = turns;
    render(
      createElement(DetailScreen, {
        domain: 'members',
        id: members[0].memberId,
      }),
    );

    const label = screen.getByText('누적 턴', { selector: 'dt' });

    expect(label.nextElementSibling?.textContent).toBe(
      `${turns.toLocaleString('ko-KR')}턴`,
    );
    expect(
      label.parentElement!.previousElementSibling?.querySelector('dt')
        ?.textContent,
    ).toBe('채팅');
    expect(
      label.parentElement!.nextElementSibling?.querySelector('dt')?.textContent,
    ).toBe('소모 이프');
  },
);
it('누적 턴 정의는 라벨 옆 물음표의 키보드 포커스와 설명 연결로만 표시한다', async () => {
  render(
    createElement(DetailScreen, { domain: 'members', id: members[0].memberId }),
  );

  const text =
    '이 회원이 가진 채팅의 AI 응답 수입니다. 삭제한 채팅과 게스트 때의 채팅도 포함하고 재생성은 세지 않습니다.';

  expect(screen.queryByText(text)).toBeNull();

  const button = screen.getByRole('button', { name: '누적 턴 집계 안내' });

  act(() => button.focus());

  const tip = await screen.findByRole('tooltip');

  expect(tip.textContent).toBe(text);
  expect(button.getAttribute('aria-describedby')).toBe(tip.id);
  expect(button.closest('dt')).toBeTruthy();
});
it('회원 목록 열과 목록 fixture에는 누적 턴을 추가하지 않는다', () => {
  render(createElement(ListScreen, { domain: 'members' }));
  expect(screen.queryByRole('columnheader', { name: /누적 턴/ })).toBeNull();
  expect(members[0]).not.toHaveProperty('turnCount');
});
it('회원 상세 fixture와 BFF는 소유 채팅의 턴 합을 정수로 제공한다', async () => {
  const member = members[1];
  const response = await GET(
    new Request(`http://localhost/api/members/${member.memberId}`),
    { params: Promise.resolve({ id: member.memberId }) },
  );

  expect(response.status).toBe(200);

  const result = await response.json();

  expect(result.turnCount).toBe(
    chats
      .filter((chat) => chat.member?.memberId === member.memberId)
      .reduce((sum, chat) => sum + chat.turnCount, 0),
  );
  expect(Number.isInteger(result.turnCount)).toBe(true);
});
