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

import { SuccessNotice } from '@/components/admin/reason-dialog';
import { SubmissionLinks } from '@/features/moderation/submission-links';
import {
  SubmissionDetailScreen,
  SubmissionsScreen,
} from '@/features/moderation/submissions-screen';
import { moderationRows, resetModerationFixture } from '@/fixtures/moderation';
import { moderationRoute } from '@/fixtures/moderation-route';

const nav = vi.hoisted(() => ({ search: '', push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/moderation/submissions',
  useRouter: () => ({ push: nav.push }),
}));

let client: QueryClient;
let requests: { url: string; method: string; body?: BodyInit | null }[];
let releaseStatus = 0;
let missing = false;
let pause = false;
let resolveRelease: ((response: Response) => void) | undefined;

beforeEach(() => {
  nav.search = '';
  nav.push.mockReset();
  requests = [];
  releaseStatus = 0;
  missing = false;
  pause = false;
  resolveRelease = undefined;
  resetModerationFixture();
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 60000,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit = {}) => {
      const method = options.method ?? 'GET';

      requests.push({ url, method, body: options.body });

      if (method === 'POST') {
        if (pause)
          return new Promise<Response>((resolve) => {
            resolveRelease = resolve;
          });

        if (releaseStatus) {
          if (releaseStatus === 409) moderationRows()[1].status = 'PENDING';

          return Response.json({ message: '오류' }, { status: releaseStatus });
        }
      }

      if (missing && /\/submissions\//.test(url))
        return Response.json({ message: '없음' }, { status: 404 });

      const { signal: _signal, ...init } = options;

      return moderationRoute(
        new Request(new URL(url, 'https://admin.example'), init),
      );
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function draw(id?: string) {
  const element = () =>
    createElement(
      QueryClientProvider,
      { client },
      id
        ? createElement(SubmissionDetailScreen, { id })
        : createElement(SubmissionsScreen),
    );
  const view = render(element());

  return {
    ...view,
    change: (search: string) => {
      nav.search = search;
      view.rerender(element());
    },
  };
}

async function openFirst() {
  const first = (await screen.findAllByRole('button', { name: '해제' }))[0];

  fireEvent.click(first);

  const dialog = await screen.findByRole('dialog', { name: '보류 해제' });
  const input = within(dialog).getByRole('textbox', { name: '처리 사유' });

  await waitFor(() => expect(document.activeElement).toBe(input));

  return { first, dialog, input };
}

async function confirmFirst() {
  const current = await openFirst();

  fireEvent.change(current.input, { target: { value: 'AI 서버 복구 확인' } });
  fireEvent.click(within(current.dialog).getByRole('button', { name: '확인' }));

  return current;
}

it('기본 요청·첫 20행·반려된 새 스토리·상태·첫 사유·코드·행 이동을 표시한다', async () => {
  draw();
  await screen.findByText('검수 제출 1');
  expect(requests[0].url).toBe(
    '/api/moderation/submissions?page=1&size=20&sort=createdAt&order=desc',
  );

  const rows = screen.getAllByRole('row');

  expect(rows).toHaveLength(21);
  expect(rows[1].textContent).toContain('등록');
  expect(rows[1].textContent).toContain('반려');
  expect(rows[1].textContent).toContain('새 스토리');
  expect(rows[1].textContent).toContain('신체 훼손을 상세히 묘사합니다.');
  expect(rows[1].textContent).toContain('극단적인 잔혹 표현');
  expect(rows[1].textContent).toContain('NEW_RULE');
  expect(rows[1].textContent).toContain('외 1건');
  expect(within(rows[2]).getByRole('button', { name: '해제' })).toBeTruthy();
  expect(rows[2].textContent).toContain('검수 서버 응답 실패');
  expect(rows[3].textContent).toContain('이미지 형식 또는 크기 오류');
  expect(within(rows[3]).queryByRole('button', { name: '해제' })).toBeNull();
  fireEvent.click(within(rows[1]).getByText('反려'.replace('反', '반')));
  expect(nav.push).toHaveBeenCalledWith(
    `/moderation/submissions/${moderationRows()[0].submissionId}`,
  );
  expect(screen.queryByRole('button', { name: '승인' })).toBeNull();
  expect(screen.queryByRole('button', { name: '반려' })).toBeNull();
  expect(
    screen.getByRole('link', { name: '1페이지' }).getAttribute('aria-current'),
  ).toBe('page');
});
it('상태·접수일·검색 조건과 링크 조건은 URL과 요청으로 이어지고 지울 수 있다', async () => {
  const row = moderationRows()[1];

  nav.search = `memberId=${row.owner.memberId}&storyId=${row.story.storyId}`;

  const view = draw();

  await screen.findByText(row.story.title);
  expect(requests[0].url).toContain(
    `memberId=${row.owner.memberId}&storyId=${row.story.storyId}`,
  );
  fireEvent.click(
    screen.getByRole('button', { name: '소유 회원 조건 지우기' }),
  );
  expect(nav.push.mock.calls.at(-1)![0]).not.toContain('memberId');
  fireEvent.click(screen.getByRole('button', { name: '스토리 조건 지우기' }));
  expect(nav.push.mock.calls.at(-1)![0]).not.toContain('storyId');
  fireEvent.change(screen.getByRole('combobox', { name: '상태' }), {
    target: { value: 'HELD' },
  });
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: '검수 제출' },
  });
  fireEvent.change(screen.getByLabelText('시작 날짜'), {
    target: { value: '2026-10-20' },
  });
  fireEvent.change(screen.getByLabelText('끝 날짜'), {
    target: { value: '2026-10-21' },
  });
  fireEvent.submit(screen.getByRole('form'));

  const url = nav.push.mock.calls.at(-1)![0] as string;

  expect(url).toContain('status=HELD');
  expect(url).toContain('from=2026-10-20');
  expect(url).toContain('to=2026-10-21');
  view.change(url.split('?')[1]);
  await waitFor(() => expect(requests.at(-1)!.url).toContain('status=HELD'));
});
it('정렬 머리와 페이지 번호는 다른 조건을 유지하고 현재 정렬 방향을 알린다', async () => {
  draw();
  await screen.findByText('검수 제출 1');
  fireEvent.click(screen.getByRole('button', { name: '판정 시각 (KST)' }));
  expect(nav.push).toHaveBeenCalledWith(
    '/moderation/submissions?sort=decidedAt&order=desc&page=1',
  );
  expect(
    screen
      .getByRole('columnheader', { name: /접수 시각/ })
      .getAttribute('aria-sort'),
  ).toBe('descending');
  expect(
    screen.getByRole('link', { name: '2페이지' }).getAttribute('href'),
  ).toContain('page=2');
});
it('빈 목록은 전용 문구로 표시한다', async () => {
  nav.search = 'q=없는제출';
  draw();
  expect(
    await screen.findByText('조건에 맞는 검수 제출이 없습니다.'),
  ).toBeTruthy();
});
it('상세는 처리 경과·대상 7개·위반 위치·모든 위반·이미지 결과만 표시한다', async () => {
  draw(moderationRows()[0].submissionId);
  await screen.findByRole('heading', { name: '검수 대상 필드' });
  expect(screen.getByRole('heading', { name: '검수 제출 상세' })).toBeTruthy();

  for (const label of [
    '제목',
    '한 줄 소개',
    '주요 내용',
    '기본 주인공 이름',
    '장르',
    '공개 범위',
    '인물 이름',
  ])
    expect(screen.getByText(label, { selector: 'dt' })).toBeTruthy();

  expect(screen.getByText('세계관 설정')).toBeTruthy();
  expect(screen.getByText('인물 2 이미지 1')).toBeTruthy();
  expect(screen.getByText('극단적인 잔혹 표현')).toBeTruthy();
  expect(screen.getByText('통과')).toBeTruthy();
  expect(screen.getByText('반려', { selector: 'td' })).toBeTruthy();
  expect(screen.getByText('오류', { selector: 'td' })).toBeTruthy();
  expect(screen.getByText('판정 전')).toBeTruthy();
  expect(screen.getByText('이미지 판독 불가')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '해제' })).toBeNull();
  expect(screen.queryByText('설정 본문')).toBeNull();
  expect(screen.queryByText('시작 설정')).toBeNull();
  expect(screen.queryByText('주요 사건')).toBeNull();
});
it('없는 상세는 전용 404 문구로 표시한다', async () => {
  missing = true;
  draw('missing');
  expect(await screen.findByText('제출본을 찾을 수 없습니다.')).toBeTruthy();
});
it('빈 값·공백·501자 사유는 요청하지 않고 취소하면 연 버튼으로 초점이 돌아간다', async () => {
  draw();

  const { first, dialog, input } = await openFirst();

  for (const value of ['', '   ', 'x'.repeat(501)]) {
    fireEvent.change(input, { target: { value } });
    expect(
      (
        within(dialog).getByRole('button', {
          name: '확인',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  }

  expect(requests.filter((request) => request.method === 'POST')).toHaveLength(
    0,
  );
  fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(first));
});
it('해제 성공은 본문·알림·목록 다시 요청과 fixture의 대기 상태를 반영한다', async () => {
  draw();
  await confirmFirst();
  await screen.findByText('보류를 해제했습니다.');
  expect(requests.find((request) => request.method === 'POST')).toMatchObject({
    url: `/api/moderation/holds/${moderationRows()[1].submissionId}/release`,
    body: '{"reason":"AI 서버 복구 확인"}',
  });
  await waitFor(() =>
    expect(requests.filter((request) => request.method === 'GET')).toHaveLength(
      2,
    ),
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(moderationRows()[1].status).toBe('PENDING');
});
it('상세 해제는 활성 상세와 캐시된 목록을 모두 다시 요청한다', async () => {
  const list =
    '/api/moderation/submissions?page=1&size=20&sort=createdAt&order=desc';

  await client.fetchQuery({
    queryKey: [list],
    queryFn: async () => (await fetch(list)).json(),
  });
  draw(moderationRows()[1].submissionId);
  await confirmFirst();
  await screen.findByText('보류를 해제했습니다.');
  await waitFor(() =>
    expect(requests.filter((request) => request.method === 'GET')).toHaveLength(
      4,
    ),
  );
  expect(await screen.findByText('대기', { selector: 'span' })).toBeTruthy();
});
it.each([409, 404, 500])(
  '해제 %i는 정본 오류와 대화상자를 유지하며 404·409만 갱신한다',
  async (status) => {
    releaseStatus = status;
    draw();
    await confirmFirst();

    const message =
      status === 409
        ? '이미 보류가 풀린 제출본입니다. 목록을 새로 불러왔습니다.'
        : status === 404
          ? '제출본을 찾을 수 없습니다. 목록을 새로 불러왔습니다.'
          : '보류를 해제하지 못했습니다. 잠시 후 다시 시도해 주세요.';

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      message,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      'AI 서버 복구 확인',
    );
    expect(requests.filter((request) => request.method === 'GET')).toHaveLength(
      status === 500 ? 1 : 2,
    );
  },
);
it('처리 중에는 두 버튼·입력이 비활성이고 Esc·바깥 누름·중복 확인이 막힌다', async () => {
  pause = true;
  draw();

  const { dialog, input } = await confirmFirst();

  await screen.findByRole('button', { name: '처리 중…' });
  expect((input as HTMLTextAreaElement).disabled).toBe(true);
  expect(
    (within(dialog).getByRole('button', { name: '취소' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.keyDown(input, { key: 'Escape' });
  fireEvent.pointerDown(document.body);
  fireEvent.click(document.body);
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(requests.filter((request) => request.method === 'POST')).toHaveLength(
    1,
  );
  await act(async () => resolveRelease!(Response.json({ status: 'PENDING' })));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
it('성공 알림은 4초 뒤 사라진다', () => {
  vi.useFakeTimers();
  render(createElement(SuccessNotice, { message: '보류를 해제했습니다.' }));
  expect(screen.getByRole('status').textContent).toBe('보류를 해제했습니다.');
  act(() => vi.advanceTimersByTime(4000));
  expect(screen.queryByRole('status')).toBeNull();
});
it('스토리·회원 상세 연결은 정본의 공개 ID 조건으로 이어진다', () => {
  render(
    createElement(SubmissionLinks, {
      storyId: 'story-id',
      memberId: 'member-id',
      held: true,
    }),
  );
  expect(
    screen.getByRole('link', { name: '제출 이력' }).getAttribute('href'),
  ).toBe('/moderation/submissions?storyId=story-id');
  expect(
    screen.getByRole('link', { name: '검수 보류 보기' }).getAttribute('href'),
  ).toBe('/moderation/submissions?storyId=story-id&status=HELD');
  expect(
    screen.getByRole('link', { name: '검수 제출' }).getAttribute('href'),
  ).toBe('/moderation/submissions?memberId=member-id');
});

it('검수 회차 도움말은 키보드 포커스로 열리고 설명 연결을 제공한다', async () => {
  draw();

  const button = await screen.findByRole('button', {
    name: '검수 회차 도움말',
  });

  fireEvent.focus(button);

  const tip = await screen.findByRole('tooltip');

  expect(tip.textContent).toBe(
    '접수 때 1이고 선점과 재제출마다 늘어나는 실행 구분 번호입니다. 실행 횟수와 다릅니다.',
  );
  expect(button.getAttribute('aria-describedby')).toBe(tip.id);
});
it('목록 해제 성공은 캐시된 상세도 재조회해 이후 상세 진입에 새 상태를 제공한다', async () => {
  const id = moderationRows()[1].submissionId;
  const url = `/api/moderation/submissions/${id}`;

  await client.fetchQuery({
    queryKey: [url],
    queryFn: async () => (await fetch(url)).json(),
  });
  draw();
  await confirmFirst();
  await screen.findByText('보류를 해제했습니다.');
  await waitFor(() =>
    expect(client.getQueryData<{ status: string }>([url])?.status).toBe(
      'PENDING',
    ),
  );
  expect(
    requests.filter((r) => r.url === url && r.method === 'GET'),
  ).toHaveLength(2);
  expect(client.getQueryState([url])?.isInvalidated).toBe(true);
  await client.fetchQuery({
    queryKey: [url],
    queryFn: async () => (await fetch(url)).json(),
  });
  expect(
    requests.filter((r) => r.url === url && r.method === 'GET'),
  ).toHaveLength(3);
});
it('상세 해제 404는 목록과 상세를 재조회하고 이전 상세 데이터를 캐시에서 없앤다', async () => {
  const list =
    '/api/moderation/submissions?page=1&size=20&sort=createdAt&order=desc';

  await client.fetchQuery({
    queryKey: [list],
    queryFn: async () => (await fetch(list)).json(),
  });

  const id = moderationRows()[1].submissionId;
  const url = `/api/moderation/submissions/${id}`;

  draw(id);
  await screen.findByRole('button', { name: '해제' });
  expect(client.getQueryData([url])).toBeTruthy();
  releaseStatus = 404;
  missing = true;
  await confirmFirst();
  expect(await screen.findByText('제출본을 찾을 수 없습니다.')).toBeTruthy();
  await screen.findByRole('alert');
  expect(client.getQueryData([url])).toBeUndefined();
  expect(screen.queryByRole('heading', { name: '검수 대상 필드' })).toBeNull();
  expect(requests.filter((r) => r.url === list)).toHaveLength(2);
  expect(requests.filter((r) => r.url === url)).toHaveLength(2);
});

it('보류·실패 원인 도움말은 검수한 전체 문구를 포커스로 제공한다', async () => {
  draw();

  const button = await screen.findByRole('button', {
    name: '보류 사유 도움말',
  });

  fireEvent.focus(button);

  const tooltip = await screen.findByRole('tooltip');

  expect(tooltip.textContent).toBe(
    '보류 사유에는 마지막 검수 실행의 실패 원인을, 실패 원인에는 최종 실패 원인을 표시합니다. 보류된 제출본은 원인을 조치한 뒤 해제해 주세요.',
  );
  expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
});
