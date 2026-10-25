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

import { GET as detailRoute } from '@/app/api/stories/[id]/route';
import { GET as settingsRoute } from '@/app/api/stories/[id]/settings/route';
import { DetailScreen } from '@/features/shared/detail-screen';
import { storySettingsHelp } from '@/features/stories/story-settings';
import type { StorySettings } from '@/features/stories/types';
import { stories } from '@/fixtures/entities';
import { getStorySettings } from '@/fixtures/story-settings';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/stories',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/features/shared/list-screen', () => ({ RelatedList: () => null }));

const story = stories[1];
const settingsUrl = `/api/stories/${story.storyId}/settings`;
let client: QueryClient;
let requests: string[];
let settings: (() => Response) | null;

beforeEach(() => {
  requests = [];
  settings = null;
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requests.push(url);

      const request = new Request(new URL(url, 'https://admin.example'));
      const params = { params: Promise.resolve({ id: story.storyId }) };

      if (url === settingsUrl)
        return settings ? settings() : settingsRoute(request, params);

      return detailRoute(request, params);
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function base(): StorySettings {
  return getStorySettings(story.storyId)!;
}

function respond(value: StorySettings) {
  settings = () => Response.json(value);
}

async function draw() {
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(DetailScreen, { domain: 'stories', id: story.storyId }),
    ),
  );

  const heading = await screen.findByRole('heading', { name: '스토리 설정' });

  return heading.closest('section')!;
}

async function loaded() {
  const section = await draw();

  await within(section).findByText('세계관 설정');

  return section;
}

function value(section: HTMLElement, label: string) {
  return within(section).getByText(label, { selector: 'dt' })
    .nextElementSibling!;
}

it('상세 요청과 따로 설정을 요청하고 고정 데이터로 구역을 그린다', async () => {
  await loaded();

  expect(requests).toEqual([`/api/stories/${story.storyId}`, settingsUrl]);
});

it('원문은 이름 토큰을 치환하지 않고 줄바꿈을 보존한다', async () => {
  respond({
    ...base(),
    storySettings: {
      ...base().storySettings,
      worldSetting: '# 세계관\n{username}은 계약서를 찾는다.',
    },
  });

  const text = value(await loaded(), '세계관 설정').firstElementChild!;

  expect(text.textContent).toBe('# 세계관\n{username}은 계약서를 찾는다.');
  expect(text.className).toContain('whitespace-pre-wrap');
  expect(text.className).toContain('break-words');
});

it('표시 이름은 표지부터 주요 사건까지 정해진 순서다', async () => {
  const section = await loaded();
  const order = [
    '표지',
    '한 줄 소개',
    '주요 내용',
    '기본 주인공 이름',
    '세계관 설정',
    '인물 설정',
    '주인공 역할 설정',
    '전개 규칙',
    '인물',
    '시작 설정',
    '주요 사건',
  ];
  const labels = [...section.querySelectorAll('dt, h3')]
    .map((element) => element.textContent!)
    .filter((label) => order.includes(label));

  expect(labels).toEqual(order);
});

it('빈 값은 입력 없음과 항목별 없음 문구로 보인다', async () => {
  respond({
    ...base(),
    oneLineIntro: null,
    storySettings: { ...base().storySettings, ruleSetting: '' },
    thumbnailUrl: null,
    mainEvents: [],
    characters: [{ ...base().characters[0], images: [] }],
  });

  const section = await loaded();

  expect(value(section, '한 줄 소개').textContent).toBe('입력 없음');
  expect(value(section, '전개 규칙').textContent).toBe('입력 없음');
  expect(value(section, '표지').textContent).toBe('표지 없음');
  expect(within(section).getByText('주요 사건 없음')).toBeTruthy();
  expect(within(section).getByText('이미지 없음')).toBeTruthy();
  expect(section.textContent).not.toContain('—');
});

it('빈 배열의 인물과 시작 설정은 없음 문구로 보인다', async () => {
  respond({ ...base(), characters: [], startSettings: [] });

  const section = await loaded();

  expect(within(section).getByText('인물 없음')).toBeTruthy();
  expect(within(section).getByText('시작 설정 없음')).toBeTruthy();
});

it('시작 설정은 응답 순서로 추천 입력과 엔딩을 보인다', async () => {
  const [first, second] = base().startSettings;

  respond({
    ...base(),
    startSettings: [first, { ...second, suggestedInputs: [], endings: [] }],
  });

  const section = await loaded();
  const names = within(section)
    .getAllByText('상황 이름', { selector: 'dt' })
    .map((dt) => dt.nextElementSibling!.textContent);

  expect(names).toEqual([first.name, second.name]);

  const cards = within(section)
    .getAllByText('상황 이름', { selector: 'dt' })
    .map((dt) => dt.closest('[data-slot="card"]') as HTMLElement);

  expect(within(cards[0]).getAllByRole('listitem')).toHaveLength(3);

  for (const text of [
    '왕좌를 되찾다',
    '10턴',
    first.endings[0].requirement.achievementCondition,
    first.endings[0].epilogue,
  ])
    expect(within(cards[0]).getByText(text)).toBeTruthy();

  expect(within(cards[1]).getByText('엔딩 없음')).toBeTruthy();
  expect(within(cards[1]).getByText('추천 입력 없음')).toBeTruthy();
});

it('승인 외 이미지 상태를 배지로 보이고 모든 이미지를 보인다', async () => {
  const character = base().characters[0];

  respond({
    ...base(),
    thumbnailModerationStatus: 'PENDING',
    characters: [
      {
        ...character,
        images: [
          { ...character.images[0], moderationStatus: 'APPROVED' },
          { ...character.images[1], moderationStatus: 'REJECTED' },
          { ...character.images[2], moderationStatus: 'NEW_STATUS' },
        ],
      },
    ],
  });

  const section = await loaded();
  const cover = value(section, '표지') as HTMLElement;
  const images = value(section, '이미지') as HTMLElement;

  expect(within(cover).getByText('판정 전')).toBeTruthy();
  expect(within(images).getAllByRole('img')).toHaveLength(3);
  expect(within(images).getByText('반려')).toBeTruthy();
  expect(within(images).getByText('NEW_STATUS')).toBeTruthy();

  const approved = within(images)
    .getByText(character.images[0].imageName, { selector: 'span' })
    .closest('figcaption')!;

  expect(approved.textContent).toBe(character.images[0].imageName);
});

it('대체 텍스트와 크게 보기 버튼 이름은 표지와 이미지 이름이다', async () => {
  const section = await loaded();

  expect(within(section).getByAltText('표지')).toBeTruthy();
  expect(within(section).getByAltText('도윤_기본')).toBeTruthy();
  expect(
    within(section).getByRole('button', { name: '표지 크게 보기' }),
  ).toBeTruthy();
  expect(
    within(section).getByRole('button', { name: '도윤_기본 크게 보기' }),
  ).toBeTruthy();
});

it('크게 보기는 닫기 버튼에 초점을 두고 Esc로 닫으면 누른 이미지로 돌아간다', async () => {
  const section = await loaded();
  const trigger = within(section).getByRole('button', {
    name: '도윤_놀람 크게 보기',
  });

  trigger.focus();
  fireEvent.click(trigger);

  const dialog = await screen.findByRole('dialog');

  expect(within(dialog).getByAltText('도윤_놀람')).toBeTruthy();
  expect(within(dialog).getByText('도윤_놀람')).toBeTruthy();
  expect(within(dialog).getByText('판정 전')).toBeTruthy();
  await waitFor(() =>
    expect(document.activeElement).toBe(
      within(dialog).getByRole('button', { name: '닫기' }),
    ),
  );

  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it('불러오지 못한 이미지는 대체 문구와 이름을 보이고 크게 보기가 없다', async () => {
  const section = await loaded();

  fireEvent.error(within(section).getByAltText('도윤_기본'));

  const fallback = within(section).getByText('이미지 불러오기 실패');

  expect(fallback.parentElement!.textContent).toBe(
    '이미지 불러오기 실패도윤_기본',
  );
  expect(
    within(section).queryByRole('button', { name: '도윤_기본 크게 보기' }),
  ).toBeNull();
});

it('설정 요청이 실패하면 구역 안에서만 실패 상자와 다시 시도를 보인다', async () => {
  settings = () => Response.json({ message: '오류' }, { status: 500 });

  const section = await draw();

  expect(await within(section).findByText('데이터 불러오기 실패')).toBeTruthy();
  expect(screen.getByRole('heading', { name: '턴 유지율' })).toBeTruthy();

  const before = requests.length;

  settings = null;
  fireEvent.click(within(section).getByRole('button', { name: '다시 시도' }));
  await within(section).findByText('세계관 설정');
  expect(requests.slice(before)).toEqual([settingsUrl]);
});

it('구역 도움말과 읽기 전용 구성을 따른다', async () => {
  const section = await loaded();

  expect(storySettingsHelp).toBe(
    '제작자가 저장한 설정 원문입니다. {username}은 채팅에서 주인공 이름으로 바뀝니다. 검수 중인 수정 내용은 승인된 뒤에 보입니다.',
  );
  expect(
    within(section).getByRole('button', { name: '스토리 설정 도움말' }),
  ).toBeTruthy();
  expect(section.querySelector('input, textarea, select')).toBeNull();
  expect(within(section).queryByRole('button', { name: /저장/ })).toBeNull();
});
