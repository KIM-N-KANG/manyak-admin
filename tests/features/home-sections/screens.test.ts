// @vitest-environment jsdom
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  initialForm,
  sectionBody,
  sectionFormSchema,
  sectionMessages,
} from '@/features/home-sections/form';
import { HomeSectionsScreen } from '@/features/home-sections/home-sections-screen';
import { navigation } from '@/features/navigation/sidebar-state';
import { stories } from '@/fixtures/entities';
import {
  homeSectionRows,
  resetHomeSectionsFixture,
} from '@/fixtures/home-sections';
import { homeSectionsRoute } from '@/fixtures/home-sections-route';
import { originalGenres } from '@/fixtures/original-genres';

let client: QueryClient;
let calls: { url: string; method: string; body: Record<string, unknown> }[];
let failStatus = 0;
let failSecond = false;
let pause = false;
let resolveSave: ((response: Response) => void) | undefined;

beforeEach(() => {
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  vi.stubEnv('VERCEL_ENV', 'preview');
  resetHomeSectionsFixture();
  calls = [];
  failStatus = 0;
  failSecond = false;
  pause = false;
  resolveSave = undefined;
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 60000, gcTime: Infinity },
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit = {}) => {
      const method = options.method ?? 'GET';

      calls.push({
        url,
        method,
        body: options.body ? JSON.parse(String(options.body)) : {},
      });

      if (url.startsWith('/api/stories'))
        return Response.json({ items: stories });

      if (method !== 'GET') {
        if (pause)
          return new Promise<Response>((resolve) => {
            resolveSave = resolve;
          });

        if (
          failStatus ||
          (failSecond &&
            calls.filter((call) => call.method === 'PATCH').length === 2)
        )
          return Response.json(
            {
              message: '입력을 확인해 주세요.',
              code: failStatus === 400 ? 'INVALID_GENRE' : 'ERROR',
              details: [
                { field: 'genres[1]', message: '제공하지 않는 장르입니다.' },
              ],
            },
            { status: failStatus || 500 },
          );
      }

      const { signal: _signal, ...init } = options;

      return homeSectionsRoute(
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
});

function draw() {
  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(HomeSectionsScreen),
    ),
  );
}

async function ready() {
  draw();
  await screen.findByRole('button', { name: '직접 고른 스토리 수정' });
}

const input = (name: string, value: string) =>
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));
const writes = () => calls.filter((call) => call.method !== 'GET');

async function confirm() {
  input('처리 사유', '홈 개편');
  click('확인');
}

it('관리 메뉴는 오리지널 아래 홈 섹션이며 목록은 세 행과 비활성 스위치를 보인다', async () => {
  const items = navigation.find((group) => group.id === 'manage')!.items;

  expect(items[items.findIndex(([url]) => url === '/originals') + 1]).toEqual([
    '/home-sections',
    '홈 섹션',
  ]);
  await ready();
  expect(screen.getAllByRole('row')).toHaveLength(4);
  expect(screen.getByText('스토리 3개, 노출 안 됨 1개')).toBeTruthy();
  expect(
    (
      screen.getByRole('switch', {
        name: '오리지널 신작 활성',
      }) as HTMLInputElement
    ).checked,
  ).toBe(false);
  expect(
    screen
      .getByRole('button', { name: '인기 스토리 위로' })
      .hasAttribute('disabled'),
  ).toBe(true);
  expect(
    screen
      .getByRole('button', { name: '오리지널 신작 아래로' })
      .hasAttribute('disabled'),
  ).toBe(true);
});
it.each([false, true])(
  '활성 섹션이 없으면 안내 또는 빈 상태를 보인다: 빈 목록 %s',
  async (empty) => {
    if (empty) resetHomeSectionsFixture([]);
    else
      homeSectionRows().forEach((row) => {
        row.isActive = false;
      });

    draw();
    expect(
      await screen.findByText(
        empty ? sectionMessages.empty : sectionMessages.fallback,
      ),
    ).toBeTruthy();
  },
);
it('조건 등록은 장르, 오리지널, 정렬, 개수를 보내고 storyIds를 보내지 않는다', async () => {
  await ready();
  click('등록');
  expect((screen.getByLabelText('출처') as HTMLSelectElement).value).toBe(
    'FILTER',
  );
  expect((screen.getByLabelText('개수') as HTMLInputElement).value).toBe('20');
  input('이름', '조건 섹션');

  for (const name of originalGenres.slice(0, 2)) {
    input('장르', name);
    click('장르 추가');
  }

  fireEvent.click(screen.getByLabelText('오리지널만'));
  input('정렬', 'chats');
  input('개수', '12');
  await confirm();
  await screen.findByText(sectionMessages.saved);
  expect(writes()[0]).toMatchObject({
    method: 'POST',
    body: {
      name: '조건 섹션',
      source: 'FILTER',
      genres: originalGenres.slice(0, 2),
      originalOnly: true,
      sort: 'chats',
      itemLimit: 12,
      reason: '홈 개편',
    },
  });
  expect(writes()[0].body).not.toHaveProperty('storyIds');
});
it('검색으로 스토리를 추가하고 둘째를 위로 옮겨 직접 고름 순서대로 등록한다', async () => {
  await ready();
  click('등록');
  input('이름', '직접 섹션');
  input('출처', 'MANUAL');
  input('스토리 검색', '스토리');
  await screen.findByRole('list', { name: '검색 결과' });

  for (const story of stories.slice(1, 4)) click(`${story.title} 추가`);

  click(`${stories[2].title} 위로`);
  await confirm();
  await screen.findByText(sectionMessages.saved);
  expect(
    calls.some(
      (call) => call.url.includes('/api/stories?') && call.url.includes('q='),
    ),
  ).toBe(true);
  expect(writes()[0].body.storyIds).toEqual([
    stories[2].storyId,
    stories[1].storyId,
    stories[3].storyId,
  ]);

  for (const field of ['genres', 'originalOnly', 'sort'])
    expect(writes()[0].body).not.toHaveProperty(field);
});
it('스토리 21개째, 중복 스토리, 장르 11개째, 개수 21과 빈 사유를 막는다', async () => {
  await ready();
  click('등록');
  input('이름', '제한');

  for (let i = 0; i < 10; i++) {
    input('장르', `장르${i}`);
    click('장르 추가');
  }

  input('장르', '열한째');
  expect(
    screen.getByRole('button', { name: '장르 추가' }).hasAttribute('disabled'),
  ).toBe(true);
  input('개수', '21');
  input('처리 사유', '사유');
  expect(
    screen.getByRole('button', { name: '확인' }).hasAttribute('disabled'),
  ).toBe(true);
  input('개수', '20');
  input('처리 사유', ' ');
  expect(
    screen.getByRole('button', { name: '확인' }).hasAttribute('disabled'),
  ).toBe(true);
  input('출처', 'MANUAL');
  input('스토리 검색', '스토리');
  await screen.findByRole('list', { name: '검색 결과' });

  for (const story of stories.slice(0, 20)) click(`${story.title} 추가`);

  expect(
    screen
      .getByRole('button', { name: `${stories[20].title} 추가` })
      .hasAttribute('disabled'),
  ).toBe(true);
  expect(
    screen
      .getByRole('button', { name: `${stories[0].title} 추가` })
      .hasAttribute('disabled'),
  ).toBe(true);
});
it('400 장르 오류는 둘째 칩에 표시하고 입력을 유지한다', async () => {
  await ready();
  click('등록');
  input('이름', '입력 유지');

  for (const genre of ['로맨스', '잘못된 장르']) {
    input('장르', genre);
    click('장르 추가');
  }

  failStatus = 400;
  await confirm();

  const chip = await screen.findByText(
    '잘못된 장르: 제공하지 않는 장르입니다.',
  );

  expect(chip.getAttribute('aria-invalid')).toBe('true');
  expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe(
    '입력 유지',
  );
  expect(screen.getByRole('dialog')).toBeTruthy();
});
it('이름만 수정하면 name과 reason만 보낸다', async () => {
  await ready();
  click('인기 스토리 수정');
  input('이름', '새 이름');
  await confirm();
  await screen.findByText(sectionMessages.saved);
  expect(writes()[0].body).toEqual({ name: '새 이름', reason: '홈 개편' });
});
it('수정 중 조건에서 직접 고름으로 바꾸면 새 출처의 필수 필드를 보낸다', () => {
  const original = homeSectionRows()[0];
  const form = initialForm(original);

  form.source = 'MANUAL';
  form.stories = [
    { storyId: stories[1].storyId, title: stories[1].title, isListed: true },
  ];
  expect(sectionBody(form, '사유', original)).toEqual({
    source: 'MANUAL',
    storyIds: [stories[1].storyId],
    reason: '사유',
  });
  expect(sectionFormSchema.safeParse({ ...form, stories: [] }).success).toBe(
    false,
  );
});
it('활성 전환은 확인 후 isActive와 reason만 보낸다', async () => {
  await ready();
  fireEvent.click(screen.getByRole('switch', { name: '인기 스토리 활성' }));
  expect(writes()).toHaveLength(0);
  await confirm();
  await screen.findByText(sectionMessages.saved);
  expect(writes()[0].body).toEqual({ isActive: false, reason: '홈 개편' });
});
it.each([false, true])(
  '순서 이동은 두 PATCH를 순차 실행하고 둘째 실패에는 실제 목록을 다시 받는다: %s',
  async (second) => {
    await ready();
    failSecond = second;
    click('직접 고른 스토리 위로');
    await confirm();
    await screen.findByText(
      second ? sectionMessages.partial : sectionMessages.saved,
    );

    const patches = writes();

    expect(patches.map((call) => call.body)).toEqual([
      { sortOrder: 1, reason: '홈 개편' },
      { sortOrder: 2, reason: '홈 개편' },
    ]);
    expect(patches[0].url).toContain(
      homeSectionRows().find((row) => row.name === '직접 고른 스토리')!.id,
    );
    await waitFor(() =>
      expect(calls.filter((call) => call.method === 'GET')).toHaveLength(2),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  },
);
it.each([0, 404, 500])(
  '삭제는 사유를 보내고 응답별 닫기와 입력 유지를 처리한다: %s',
  async (status) => {
    await ready();
    failStatus = status;
    click('인기 스토리 삭제');
    expect(screen.getByText(sectionMessages.delete)).toBeTruthy();
    await confirm();
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toMatchObject({
      method: 'DELETE',
      body: { reason: '홈 개편' },
    });

    if (status === 500) {
      await screen.findByRole('alert');
      expect(
        (screen.getByLabelText('처리 사유') as HTMLTextAreaElement).value,
      ).toBe('홈 개편');
    } else {
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(calls.filter((call) => call.method === 'GET')).toHaveLength(2);
    }
  },
);
it('처리 중에는 취소와 Esc를 막고 중복 요청을 보내지 않는다', async () => {
  await ready();
  pause = true;
  click('등록');
  input('이름', '잠금');
  await confirm();
  await waitFor(() => expect(resolveSave).toBeTruthy());
  expect(
    screen.getByRole('button', { name: '취소' }).hasAttribute('disabled'),
  ).toBe(true);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(writes()).toHaveLength(1);
  resolveSave!(Response.json({}, { status: 201 }));
  await screen.findByText(sectionMessages.saved);
});
it('수정 대화상자는 노출 안 됨 배지를 보이고 취소하면 요청을 보내지 않는다', async () => {
  await ready();
  click('직접 고른 스토리 수정');
  expect(
    within(screen.getByRole('dialog')).getByText('노출 안 됨'),
  ).toBeTruthy();
  click('취소');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(writes()).toHaveLength(0);
});
it('폼은 30자 이름과 1~20개, 장르 10개까지 검증한다', () => {
  const form = initialForm();

  expect(
    sectionFormSchema.safeParse({ ...form, name: 'x'.repeat(30) }).success,
  ).toBe(true);
  expect(
    sectionFormSchema.safeParse({ ...form, name: 'x'.repeat(31) }).success,
  ).toBe(false);
});
