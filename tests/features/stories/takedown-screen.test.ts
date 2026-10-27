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

import { DetailScreen } from '@/features/shared/detail-screen';
import { StoryRows } from '@/features/shared/list-screen';
import { StoryTakedown } from '@/features/stories/takedown-dialog';
import type { Story } from '@/features/stories/types';
import { stories } from '@/fixtures/entities';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/stories',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/features/stories/story-settings', () => ({
  StorySettingsSection: () => null,
}));
vi.mock('@/features/shared/list-screen', async (load) => ({
  ...(await load<object>()),
  RelatedList: () => null,
}));

let client: QueryClient;
let story: Story;
let status: number;
let requests: { url: string; method: string; body: unknown }[];
let resolve: ((value: Response) => void) | undefined;
let pause = false;
const list = '/api/stories?memberId=owner';

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 60000, gcTime: Infinity },
    },
  });
  story = structuredClone(stories[1]);
  status = 200;
  requests = [];
  pause = false;
  resolve = undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';

      requests.push({
        url,
        method,
        body: init.body ? JSON.parse(String(init.body)) : null,
      });

      if (method === 'POST') {
        if (pause)
          return new Promise<Response>((done) => {
            resolve = done;
          });

        if (status === 200 || status === 409) {
          story.takenDownAt = '2026-10-27T02:00:00Z';
          story.takedownReason = 'COPYRIGHT_INFRINGEMENT';
          story.visibility = 'PRIVATE';
        }

        return Response.json({ message: '응답' }, { status });
      }

      return Response.json(
        url === list
          ? { items: [story] }
          : { ...story, retention: [], recentChats: [] },
      );
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

function draw(detail = false) {
  return render(
    createElement(
      QueryClientProvider,
      { client },
      detail
        ? createElement(DetailScreen, { domain: 'stories', id: story.storyId })
        : createElement(StoryTakedown, { story }),
    ),
  );
}

async function open() {
  const trigger = await screen.findByRole('button', { name: '공개 중단' });

  fireEvent.click(trigger);

  const dialog = await screen.findByRole('dialog', {
    name: '스토리 공개 중단',
  });
  const radios = within(dialog).getAllByRole('radio') as HTMLInputElement[];

  await waitFor(() => expect(document.activeElement).toBe(radios[0]));

  return {
    trigger,
    dialog,
    radios,
    confirm: within(dialog).getByRole('button', {
      name: '공개 중단',
    }) as HTMLButtonElement,
  };
}

async function cachedList() {
  await client.fetchQuery({
    queryKey: [list],
    queryFn: async () => (await fetch(list)).json(),
  });
}

it('선택 없음·사유 순서·필수 기타·글자 상한·분류 전환 초기화·초점 복귀를 지킨다', async () => {
  draw();

  const { dialog, radios, confirm, trigger } = await open();

  expect(radios.map((radio) => radio.value)).toEqual([
    'SEXUAL_CONTENT',
    'COPYRIGHT_INFRINGEMENT',
    'HATE_SPEECH',
    'ETC',
  ]);
  expect(radios.every((radio) => !radio.checked)).toBe(true);
  expect(confirm.disabled).toBe(true);
  expect(within(dialog).getByText('0/500')).toBeTruthy();
  fireEvent.click(radios[3]);

  const input = within(dialog).getByRole('textbox', {
    name: '소유자에게 보일 사유',
  }) as HTMLInputElement;

  expect(input.placeholder).toBe('예: 실존 인물 비방');
  expect(within(dialog).getByText('0/100')).toBeTruthy();

  for (const value of ['', '  ']) {
    fireEvent.change(input, { target: { value } });
    expect(confirm.disabled).toBe(true);
  }

  expect(
    within(dialog).getByText('소유자에게 보일 사유를 입력해 주세요.'),
  ).toBeTruthy();
  fireEvent.change(input, { target: { value: 'x'.repeat(101) } });
  expect(input.value).toHaveLength(100);
  expect(within(dialog).getByText('100/100')).toBeTruthy();

  const memo = within(dialog).getByRole('textbox', {
    name: '메모 (선택)',
  }) as HTMLTextAreaElement;

  fireEvent.change(memo, { target: { value: 'x'.repeat(501) } });
  expect(memo.value).toHaveLength(500);
  expect(within(dialog).getByText('500/500')).toBeTruthy();
  fireEvent.click(radios[2]);
  expect(
    within(dialog).queryByRole('textbox', { name: '소유자에게 보일 사유' }),
  ).toBeNull();
  fireEvent.click(radios[3]);
  expect(
    (
      within(dialog).getByRole('textbox', {
        name: '소유자에게 보일 사유',
      }) as HTMLInputElement
    ).value,
  ).toBe('');
  fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(requests).toHaveLength(0);
});
it.each([
  [
    'COPYRIGHT_INFRINGEMENT',
    '  신고 3건 확인  ',
    { reasonCode: 'COPYRIGHT_INFRINGEMENT', memo: '신고 3건 확인' },
  ],
  ['SEXUAL_CONTENT', '   ', { reasonCode: 'SEXUAL_CONTENT' }],
  ['ETC', '', { reasonCode: 'ETC', reasonDetail: '실존 인물 비방' }],
])(
  '사유 %s의 본문을 정리하고 성공 후 목록·상세를 갱신한다',
  async (code, memo, body) => {
    await cachedList();
    draw(true);

    const { dialog, radios, confirm } = await open();

    fireEvent.click(radios.find((radio) => radio.value === code)!);

    if (code === 'ETC')
      fireEvent.change(
        within(dialog).getByRole('textbox', { name: '소유자에게 보일 사유' }),
        { target: { value: '  실존 인물 비방  ' } },
      );

    fireEvent.change(
      within(dialog).getByRole('textbox', { name: '메모 (선택)' }),
      { target: { value: memo } },
    );
    fireEvent.click(confirm);
    await screen.findByText('공개 중단 조치를 적용했습니다.');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(requests.find((r) => r.method === 'POST')).toEqual({
      url: `/api/moderation/stories/${story.storyId}/takedown`,
      method: 'POST',
      body,
    });
    await screen.findByText('공개 중단됨');
    expect(screen.getByText('2026-10-27 11:00')).toBeTruthy();
    expect(screen.getByText('공개 중단 시각 (KST)')).toBeTruthy();
    expect(screen.getByText('공개 중단 사유')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '공개 중단' })).toBeNull();
    expect(client.getQueryState([list])?.isInvalidated).toBe(true);
    expect(
      requests.filter((r) => r.url === `/api/stories/${story.storyId}`),
    ).toHaveLength(2);
  },
);
it.each([404, 409, 500])(
  '오류 %i는 입력과 대화상자를 유지하고 분기별로 캐시를 갱신한다',
  async (failure) => {
    status = failure;
    await cachedList();
    draw(true);

    const { dialog, radios, confirm } = await open();

    fireEvent.click(radios[3]);
    fireEvent.change(
      within(dialog).getByRole('textbox', { name: '소유자에게 보일 사유' }),
      { target: { value: '입력 사유' } },
    );
    fireEvent.change(
      within(dialog).getByRole('textbox', { name: '메모 (선택)' }),
      { target: { value: '메모 유지' } },
    );
    fireEvent.click(confirm);

    const message =
      failure === 404
        ? '스토리를 찾을 수 없습니다. 목록에서 다시 확인해 주세요.'
        : failure === 409
          ? '공개 중단할 수 없는 상태의 스토리입니다. 상세를 새로 불러왔습니다.'
          : '공개를 중단하지 못했습니다. 잠시 후 다시 시도해 주세요.';

    expect((await screen.findByRole('alert')).textContent).toBe(message);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(
      (
        screen.getByRole('textbox', {
          name: '소유자에게 보일 사유',
        }) as HTMLInputElement
      ).value,
    ).toBe('입력 사유');
    expect(
      (
        screen.getByRole('textbox', {
          name: '메모 (선택)',
        }) as HTMLTextAreaElement
      ).value,
    ).toBe('메모 유지');
    expect(client.getQueryState([list])?.isInvalidated).toBe(failure === 404);
    expect(
      requests.filter((r) => r.url === `/api/stories/${story.storyId}`),
    ).toHaveLength(failure === 409 ? 2 : 1);
  },
);
it('처리 중에는 취소·선택·입력·중복 확인·Esc·바깥 클릭을 막는다', async () => {
  pause = true;
  draw();

  const { dialog, radios, confirm } = await open();

  fireEvent.click(radios[3]);
  fireEvent.change(
    within(dialog).getByRole('textbox', { name: '소유자에게 보일 사유' }),
    { target: { value: '사유' } },
  );
  fireEvent.click(confirm);

  const processing = await screen.findByRole('button', { name: '처리 중…' });

  expect((processing as HTMLButtonElement).disabled).toBe(true);
  expect(
    (within(dialog).getByRole('button', { name: '취소' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    (
      within(dialog).getByRole('textbox', {
        name: '메모 (선택)',
      }) as HTMLTextAreaElement
    ).disabled,
  ).toBe(true);
  expect(radios[0].closest('fieldset')!.disabled).toBe(true);
  fireEvent.keyDown(dialog, { key: 'Escape' });
  fireEvent.pointerDown(document.body);
  fireEvent.click(document.body);
  fireEvent.click(processing);
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(requests).toHaveLength(1);
  await act(async () => resolve!(Response.json({})));
});
it('목록은 삭제 뒤 공개 중단 배지를 두고 상세는 기타·모르는 사유를 표시한다', async () => {
  story.takenDownAt = '2026-10-27T02:00:00Z';
  story.deletedAt = story.takenDownAt;
  story.takedownReason = 'ETC';
  story.takedownReasonDetail = '실존 인물 비방';

  const rows = render(
    createElement(
      'table',
      null,
      createElement(
        'tbody',
        null,
        createElement(StoryRows, { items: [story] }),
      ),
    ),
  );
  const cell = screen.getByRole('link', { name: story.title }).closest('td')!;

  expect(cell.textContent).toContain('삭제됨공개 중단됨');
  rows.unmount();
  draw(true);
  await screen.findByText('기타 (실존 인물 비방)');
  expect(screen.queryByRole('button', { name: '공개 중단' })).toBeNull();
});
it.each(['메모 도움말', '소유자에게 보일 사유 도움말'])(
  '%s은 키보드 초점으로 열린다',
  async (label) => {
    draw();

    const { radios } = await open();

    fireEvent.click(radios[3]);
    fireEvent.focus(screen.getByRole('button', { name: label }));

    const tip = await screen.findByRole('tooltip');

    expect(tip.textContent).toBe(
      label === '메모 도움말'
        ? '감사 로그에만 남고 소유자에게 보내지 않습니다.'
        : '소유자 알림의 "{사유} 사유로 공개할 수 없어요"에 그대로 들어갑니다. 짧은 명사구로 적어 주세요.',
    );
  },
);
