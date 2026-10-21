// @vitest-environment jsdom
import { createElement, type ReactNode, useState } from 'react';

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

import { GET as chats } from '@/app/api/chats/route';
import { GET as detail, PATCH } from '@/app/api/originals/[id]/route';
import { GET as catalog } from '@/app/api/originals/catalog/route';
import { GET as list, POST } from '@/app/api/originals/route';
import { GET as story } from '@/app/api/stories/[id]/route';
import { originalRequestFields } from '@/features/originals/form-values';
import { ImageUpload } from '@/features/originals/image-upload';
import { OriginalDetailScreen } from '@/features/originals/original-detail-screen';
import { OriginalFormScreen } from '@/features/originals/original-form-screen';
import { OriginalListScreen } from '@/features/originals/original-list-screen';
import type { OriginalUpload } from '@/features/originals/types';
import { DetailScreen } from '@/features/shared/detail-screen';
import { StoryRows } from '@/features/shared/list-screen';
import { stories } from '@/fixtures/entities';
import { getOriginal, saveOriginal } from '@/fixtures/originals';

import { originalPayload } from '../../helpers/originals';

const navigation = vi.hoisted(() => ({
  search: '',
  pathname: '/originals',
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const baseStories = structuredClone(stories);
let client: QueryClient;
let failSave: boolean;
const requests: { url: string; method: string; body?: unknown }[] = [];

beforeEach(() => {
  delete (globalThis as typeof globalThis & { manyakOriginalFixture?: unknown })
    .manyakOriginalFixture;
  stories.splice(0, stories.length, ...structuredClone(baseStories));
  navigation.search = '';
  navigation.pathname = '/originals';
  navigation.push.mockReset();
  requests.length = 0;
  failSave = false;
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: RequestInit) => {
      const method = options?.method ?? 'GET';

      requests.push({
        url,
        method,
        body:
          typeof options?.body === 'string'
            ? JSON.parse(options.body)
            : undefined,
      });

      if (failSave && method !== 'GET')
        return Response.json({ message: 'unavailable' }, { status: 503 });

      const request = new Request(`http://localhost${url}`, {
        method,
        headers: options?.headers,
        body: options?.body,
      });
      const match = /^\/api\/originals\/([\w-]+)$/.exec(url);

      if (url === '/api/originals/catalog') return catalog();

      if (match)
        return method === 'PATCH'
          ? PATCH(request, { params: Promise.resolve({ id: match[1] }) })
          : detail(request, { params: Promise.resolve({ id: match[1] }) });

      if (url.startsWith('/api/originals'))
        return method === 'POST' ? POST(request) : list(request);

      const storyMatch = /^\/api\/stories\/([\w-]+)$/.exec(url);

      if (storyMatch)
        return story(request, {
          params: Promise.resolve({ id: storyMatch[1] }),
        });

      if (url.startsWith('/api/chats')) return chats(request);

      throw new Error(`Unexpected request ${url}`);
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

const wrapped = (node: ReactNode) =>
  createElement(QueryClientProvider, { client }, node);
const changes = () => requests.filter((request) => request.method !== 'GET');

function setField(container: HTMLElement, name: string, value: string) {
  fireEvent.change(container.querySelector(`[name="${name}"]`)!, {
    target: { value },
  });
}

function fill(container: HTMLElement) {
  const data = originalPayload();

  setField(container, 'reason', '테스트 사유');

  for (const key of [
    'title',
    'oneLineIntro',
    'description',
    'protagonistName',
  ] as const)
    setField(container, key, data[key]!);

  for (const [key, value] of Object.entries(data.storySettings))
    setField(container, `storySettings.${key}`, value);

  for (const key of ['name', 'prologue', 'startSituation'] as const)
    setField(container, `startSettings.0.${key}`, data.startSettings[0][key]);

  data.startSettings[0].suggestedInputs.forEach((value, index) =>
    setField(container, `startSettings.0.suggestedInputs.${index}`, value),
  );
  fireEvent.change(screen.getByRole('combobox', { name: '장르 선택' }), {
    target: { value: '판타지' },
  });
}

describe('오리지널 작성·수정', () => {
  it('빈 제목 저장을 막고 제목·사유를 채운 초안은 저장한다', async () => {
    render(wrapped(createElement(OriginalFormScreen)));
    await screen.findByRole('option', { name: '판타지' });
    fireEvent.click(screen.getByRole('button', { name: '공개' }));
    expect(screen.getByRole('alert').textContent).toContain('필수');
    expect(changes()).toHaveLength(0);
    fireEvent.change(screen.getByRole('textbox', { name: '변경 사유' }), {
      target: { value: '초안 작성' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /제목 ·/ }), {
      target: { value: '초안 제목' },
    });
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());

    const id = navigation.push.mock.calls[0][0].split('/').at(-1);

    expect(getOriginal(id)).toMatchObject({
      status: 'DRAFT',
      visibility: 'PRIVATE',
    });
  });
  it('완성한 폼은 확인 전 저장하지 않고 취소·확인 후 공개를 구분한다', async () => {
    const view = render(wrapped(createElement(OriginalFormScreen)));

    await screen.findByRole('option', { name: '판타지' });
    fill(view.container);
    fireEvent.click(screen.getByRole('button', { name: '공개' }));

    const dialog = await screen.findByRole('dialog', {
      name: '오리지널 공개 확인',
    });

    expect(changes()).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(changes()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: '공개' }));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: '확인',
      }),
    );
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    expect(changes()).toHaveLength(1);
    expect(changes()[0].body).toMatchObject({
      status: 'PUBLISHED',
      title: '{username}의 도서관',
      genres: ['판타지'],
      reason: '테스트 사유',
    });

    const id = navigation.push.mock.calls[0][0].split('/').at(-1);

    expect(getOriginal(id)).toMatchObject({
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      owner: { nickname: '마냑' },
    });
  });
  it('발행 내용은 변경 저장으로 즉시 반영하며 발행 상태를 유지한다', async () => {
    const original = saveOriginal({
      ...originalRequestFields(originalPayload()),
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      reason: '작성',
    });
    const view = render(
      wrapped(createElement(OriginalFormScreen, { id: original.storyId })),
    );

    await screen.findByRole('heading', { name: '오리지널 수정' });
    setField(view.container, 'title', '수정 제목');
    setField(view.container, 'reason', '오탈자 수정');
    fireEvent.click(screen.getByRole('button', { name: '변경 저장' }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    expect(getOriginal(original.storyId)).toMatchObject({
      title: '수정 제목',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    });
    expect(changes()[0].body).not.toHaveProperty('payload');
  });
  it('저장 실패 중 입력을 유지하고 다시 저장할 수 있다', async () => {
    failSave = true;

    const view = render(wrapped(createElement(OriginalFormScreen)));

    await screen.findByRole('option', { name: '판타지' });
    setField(view.container, 'title', '유지할 입력');
    setField(view.container, 'reason', '수정 사유');
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
    await screen.findByText(/저장하지 못했습니다/);
    expect(
      (view.container.querySelector('[name="title"]') as HTMLInputElement)
        .value,
    ).toBe('유지할 입력');
    failSave = false;
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
  });
});

describe('오리지널 목록·상세·연결', () => {
  it('목록 번호·머리글 정렬·필터 복귀와 새 작성 링크를 제공한다', async () => {
    navigation.search = 'page=2&size=2';

    const view = render(wrapped(createElement(OriginalListScreen)));

    await screen.findByRole('navigation', { name: '목록 페이지' });
    expect(
      screen.getByRole('link', { name: '새 오리지널' }).getAttribute('href'),
    ).toBe('/originals/new');
    expect(
      screen
        .getByRole('link', { name: '2페이지' })
        .getAttribute('aria-current'),
    ).toBe('page');

    for (const [label, key] of [
      ['채팅 수', 'chatCount'],
      ['총 턴 수', 'totalTurns'],
      ['수정 시각', 'updatedAt'],
    ]) {
      fireEvent.click(screen.getByRole('button', { name: label }));

      let url = new URL(
        navigation.push.mock.calls.at(-1)![0],
        'http://localhost',
      );

      expect(url.searchParams.get('sort')).toBe(key);
      expect(url.searchParams.get('order')).toBe('desc');
      expect(url.searchParams.get('page')).toBe('1');
      navigation.search = url.search.slice(1);
      view.rerender(wrapped(createElement(OriginalListScreen)));
      await screen.findByRole('navigation', { name: '목록 페이지' });
      fireEvent.click(screen.getByRole('button', { name: label }));
      url = new URL(navigation.push.mock.calls.at(-1)![0], 'http://localhost');
      expect(url.searchParams.get('order')).toBe('asc');
      navigation.search = url.search.slice(1);
      view.rerender(wrapped(createElement(OriginalListScreen)));
      await waitFor(() =>
        expect(
          screen
            .getByRole('button', { name: label })
            .closest('th')!
            .getAttribute('aria-sort'),
        ).toBe('ascending'),
      );
    }

    navigation.search += '&page=3';
    view.rerender(wrapped(createElement(OriginalListScreen)));
    fireEvent.change(screen.getByLabelText('공개 상태'), {
      target: { value: 'PRIVATE' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: '적용' }).closest('form')!,
    );
    await waitFor(() =>
      expect(
        new URL(
          navigation.push.mock.calls.at(-1)![0],
          'http://localhost',
        ).searchParams.get('visibility'),
      ).toBe('PRIVATE'),
    );
    expect(
      new URL(
        navigation.push.mock.calls.at(-1)![0],
        'http://localhost',
      ).searchParams.get('page'),
    ).toBe('1');
  });
  it('상세의 공개 전환은 확인 후 실행하고 캠페인에 storyId를 전달한다', async () => {
    const original = saveOriginal({
      status: 'PUBLISHED',
      ...originalRequestFields(originalPayload()),
      visibility: 'PUBLIC',
      reason: '작성',
    });

    render(
      wrapped(createElement(OriginalDetailScreen, { id: original.storyId })),
    );

    const button = await screen.findByRole('button', { name: '비공개로 전환' });

    expect(
      screen
        .getByRole('link', { name: '홍보 알림 만들기' })
        .getAttribute('href'),
    ).toBe(`/notifications/campaigns/new?storyId=${original.storyId}`);
    fireEvent.change(screen.getByRole('textbox', { name: '변경 사유' }), {
      target: { value: '비공개 검토' },
    });
    fireEvent.click(button);

    const dialog = await screen.findByRole('dialog', {
      name: '비공개 전환 확인',
    });

    expect(changes()).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await screen.findByRole('button', { name: '공개로 전환' });
    expect(getOriginal(original.storyId)?.visibility).toBe('PRIVATE');
  });
  it('관리 스토리 목록에 배지를 표시하고 오리지널 상세 관리로 연결한다', async () => {
    const original = stories.find((entry) => entry.scope === 'original')!;
    const view = render(
      createElement(
        'table',
        null,
        createElement(
          'tbody',
          null,
          createElement(StoryRows, { items: [original] }),
        ),
      ),
    );

    expect(screen.getByText('오리지널').tagName).toBe('SPAN');
    view.unmount();
    render(
      wrapped(
        createElement(DetailScreen, {
          domain: 'stories',
          id: original.storyId,
        }),
      ),
    );

    const link = await screen.findByRole('link', { name: '오리지널 관리 →' });

    expect(link.getAttribute('href')).toBe(`/originals/${original.storyId}`);
  });
});

function UploadHarness() {
  const [url, setUrl] = useState<string | null>('/old.png');

  return createElement(ImageUpload, {
    label: '표지',
    kind: 'COVER',
    imageUrl: url,
    onPendingChange: () => undefined,
    onUpload: (result: OriginalUpload) => setUrl(result.imageUrl),
    onRemove: () => setUrl(null),
  });
}

describe('이미지 업로드 UI', () => {
  it('업로드 성공 시 미리보기를 교체하고 제거할 수 있다', async () => {
    const create = vi.fn(() => '/new.png');

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: create,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });

    const uploadFetch = vi.fn(async (_url: string, options?: RequestInit) =>
      options?.method === 'PUT'
        ? new Response(null, { status: 200 })
        : Response.json({
            objectKey: 'fixture.png',
            uploadUrl: '/put-target',
            expiresInSeconds: 600,
          }),
    );

    vi.stubGlobal('fetch', uploadFetch);
    render(createElement(UploadHarness));
    fireEvent.change(screen.getByLabelText('표지 교체'), {
      target: {
        files: [new File(['png'], 'image.png', { type: 'image/png' })],
      },
    });
    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: '표지 미리보기' }).getAttribute('src'),
      ).toBe('/new.png'),
    );
    expect(
      uploadFetch.mock.calls.map(([, options]) => options?.method),
    ).toEqual(['POST', 'PUT']);
    fireEvent.click(screen.getByRole('button', { name: '표지 제거' }));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByLabelText('표지 업로드')).toBeTruthy();
  });
  it('파일 형식 오류와 업로드 실패 때 기존 미리보기를 유지한다', async () => {
    const fetch = vi.fn(async () => Response.json({}, { status: 503 }));

    vi.stubGlobal('fetch', fetch);
    render(createElement(UploadHarness));
    fireEvent.change(screen.getByLabelText('표지 교체'), {
      target: {
        files: [new File(['svg'], 'image.svg', { type: 'image/svg+xml' })],
      },
    });
    expect(screen.getByRole('alert').textContent).toContain('5MB');
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('표지 교체'), {
      target: {
        files: [new File(['png'], 'image.png', { type: 'image/png' })],
      },
    });
    await screen.findByText(/다른 파일로 다시 시도/);
    expect(screen.getByRole('img').getAttribute('src')).toBe('/old.png');
  });
});
