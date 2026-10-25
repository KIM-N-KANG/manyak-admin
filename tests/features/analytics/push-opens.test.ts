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
import { setTimeout as realDelay } from 'node:timers/promises';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { AnalyticsScreen } from '@/features/analytics/analytics-screen';
import type { PushOpensResponse } from '@/features/analytics/types';

const nav = vi.hoisted(() => ({ search: 'tab=push', push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/analytics/acquisition',
  useRouter: () => ({ push: nav.push }),
}));

const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const campaign: PushOpensResponse['campaigns'][number] = {
  campaignId: id,
  title: '점검 알림',
  kind: 'SERVICE',
  noticeId: id,
  startedAt: '2026-10-23T02:00:31Z',
  deliveredMembers: 412,
  openState: 'MEASURED',
  pushOpens: 58,
  pushOpenRate: 0.1408,
};
const makeData = (): PushOpensResponse => ({
  asOf: '2026-10-24T05:10:00Z',
  pendingDates: [] as string[],
  from: '2026-10-18',
  to: '2026-10-24',
  measuredFrom: '2026-10-21',
  campaigns: [campaign],
  activityFrom: '2026-10-21',
  activityTypes: [
    {
      type: 'STORY_COMPLETED',
      deliveredMembers: 61,
      openState: 'MEASURED',
      pushOpens: 27,
      pushOpenRate: 0.4426,
    },
    {
      type: 'STORY_MODERATION_COMPLETED',
      deliveredMembers: 11,
      openState: 'MEASURED',
      pushOpens: 4,
      pushOpenRate: 0.3636,
    },
    {
      type: 'ATTENDANCE_REMINDER',
      deliveredMembers: 1206,
      openState: 'MEASURED',
      pushOpens: 104,
      pushOpenRate: 0.0862,
    },
    {
      type: 'CREDIT_EXPIRY_REMINDER',
      deliveredMembers: 80,
      openState: 'MEASURED',
      pushOpens: 12,
      pushOpenRate: 0.15,
    },
  ],
});
let data: ReturnType<typeof makeData>;
let client: QueryClient;
let fail = false;
const requests: string[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-24T05:00:00Z'));
  data = makeData();
  fail = false;
  requests.length = 0;
  nav.search = 'tab=push';
  nav.push.mockReset();
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false },
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requests.push(url);

      if (url === '/api/campaigns') return new Promise<Response>(() => {});

      return fail
        ? Response.json({ code: 'SERVICE_UNAVAILABLE' }, { status: 503 })
        : Response.json(data);
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function draw() {
  const element = () =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(AnalyticsScreen, { screen: 'acquisition' }),
    );
  const view = render(element());

  return {
    ...view,
    go: () => {
      nav.search = new URL(
        nav.push.mock.calls.at(-1)![0],
        'http://localhost',
      ).search.slice(1);
      view.rerender(element());
    },
  };
}

const campaignTable = () =>
  screen.getByRole('heading', { name: '관리자 캠페인' }).closest('section')!;
const activityTable = () =>
  screen.getByRole('heading', { name: '활동 알림' }).closest('section')!;

it('캠페인 목록을 기다리지 않고 최근 7일을 요청하며 여섯 탭과 출처를 표시한다', async () => {
  draw();
  await screen.findByRole('heading', { name: '관리자 캠페인' });
  expect(requests).toEqual([
    '/api/campaigns/push-opens?from=2026-10-18&to=2026-10-24',
  ]);
  expect(screen.queryByRole('combobox', { name: '광고 캠페인' })).toBeNull();
  expect(screen.getAllByRole('tab').map((x) => x.textContent)).toEqual([
    '캠페인 추이',
    '간편 제작 퍼널',
    '상세 진입 퍼널',
    '유입 소스',
    '푸시 열람',
    '앱 설치',
  ]);

  const source = screen.getByRole('button', {
    name: 'Amplitude 출처와 집계 안내',
  });

  await act(async () => source.focus());
  expect((await screen.findByRole('tooltip')).textContent).toBe(
    'Amplitude 출처 지표입니다. 웹 기준으로 푸시를 눌러 연 페이지 조회를 날짜별 고유 사용자로 세어 더합니다. 도달 회원은 서버 발송 결과이며 팀 계정을 제외하지 않습니다.',
  );
});

it('공지 배지와 성격·천 구분·단위·소수 퍼센트 및 활동 알림 고정 순서를 표시한다', async () => {
  data.activityTypes.reverse();
  draw();
  await screen.findByRole('heading', { name: '관리자 캠페인' });

  const rows = within(campaignTable()).getAllByRole('row');

  expect(rows[0].textContent).toContain('마지막 발송 시작');
  expect(rows[1].textContent).toContain('공지점검 알림');
  expect(rows[1].textContent).toContain('정보성');
  expect(rows[1].textContent).toContain('412명');
  expect(rows[1].textContent).toContain('58명');
  expect(rows[1].textContent).toContain('14.1%');
  expect(rows[1].textContent).toContain('11:00');

  const activity = within(activityTable()).getAllByRole('row').slice(1);

  expect(activity.map((row) => row.querySelector('td')!.textContent)).toEqual([
    '스토리 완성',
    '검수 완료',
    '출석 리마인드',
    '이프 소멸 예정 안내',
  ]);
  expect(activity[2].textContent).toContain('1,206명');
  expect(activity[3].textContent).toContain('80명');
  expect(activity[3].textContent).toContain('12명');
  expect(activity[3].textContent).toContain('15.0%');
});

it.each([
  ['BEFORE_MEASUREMENT', '측정 시작 전'],
  ['NO_LINK', '링크 없음'],
  ['PENDING', '발송 기록 없음'],
] as const)('%s는 두 열에 %s로 표시한다', async (openState, label) => {
  data.campaigns = [
    {
      ...campaign,
      openState,
      pushOpens: null,
      pushOpenRate: null,
    },
  ];
  draw();
  await screen.findByRole('heading', { name: '관리자 캠페인' });
  expect(within(campaignTable()).getAllByText(label)).toHaveLength(2);
});

it.each([
  [0, 0, '0.0%'],
  [3, 1.5, '150.0%'],
  [0, null, '계산할 수 없음'],
] as const)(
  'MEASURED의 %j·%j를 변환하거나 자르지 않는다',
  async (pushOpens, pushOpenRate, label) => {
    data.campaigns = [{ ...campaign, pushOpens, pushOpenRate }];
    draw();
    await screen.findByRole('heading', { name: '관리자 캠페인' });
    expect(within(campaignTable()).getByText(`${pushOpens}명`)).toBeTruthy();
    expect(within(campaignTable()).getByText(label)).toBeTruthy();
  },
);

it('두 표 위 부분 집계와 활동 표의 집계 시작 및 두 머리 도움말을 표시한다', async () => {
  data.pendingDates = ['2026-10-23'];
  draw();
  await screen.findByRole('heading', { name: '관리자 캠페인' });

  const partial = screen.getByText(
    '열람 수는 준비된 날짜만 합산했습니다. 열람률은 일부 날짜의 열람 수를 전체 도달 회원 수로 나눈 값입니다.',
  );

  expect(
    partial.compareDocumentPosition(campaignTable()) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    within(activityTable()).getByText(
      '2026-10-21부터 집계했습니다. 그 전은 측정 시작 전입니다.',
    ),
  ).toBeTruthy();

  const start = screen.getByRole('button', { name: '마지막 발송 시작 도움말' });

  await act(async () => start.focus());
  expect((await screen.findByRole('tooltip')).textContent).toBe(
    '기간과 정렬은 마지막 발송 작업의 시작 시각 기준입니다.',
  );

  const rate = screen.getAllByRole('button', { name: '푸시 열람률 도움말' })[0];

  await act(async () => rate.focus());
  await waitFor(() =>
    expect(screen.getByRole('tooltip').textContent).toBe(
      '푸시 열람 수를 도달 회원 수로 나눈 값입니다. 열람 수는 웹에서 연 경우만 세며, 도달 회원 수에는 앱 수신 회원도 포함합니다. 같은 회원이 다른 날 다시 열면 두 번 셉니다.',
    ),
  );
});

it('빈 캠페인 안내와 활동 알림 표를 함께 유지하고 null 기준 시각은 표시하지 않는다', async () => {
  data.campaigns = [];
  data.asOf = null;
  data.activityFrom = null;
  draw();
  await screen.findByRole('heading', { name: '관리자 캠페인' });
  expect(
    screen.getByText('선택한 기간에 해당하는 관리자 캠페인이 없습니다.'),
  ).toBeTruthy();
  expect(screen.getByRole('heading', { name: '활동 알림' })).toBeTruthy();
  expect(screen.queryByText(/KST 집계 기준/)).toBeNull();
  expect(screen.queryByText(/열람 수는 준비된 날짜만/)).toBeNull();
  expect(screen.queryByText(/부터 집계했습니다/)).toBeNull();
});

it('기간을 URL에 동기화하고 366일 초과는 요청하지 않는다', async () => {
  const view = draw();

  await screen.findByRole('heading', { name: '관리자 캠페인' });
  fireEvent.click(screen.getByRole('button', { name: /기간:/ }));
  fireEvent.click(screen.getByRole('button', { name: '최근 30일' }));
  expect(nav.push.mock.calls.at(-1)![0]).toBe(
    '/analytics/acquisition?tab=push&range=last30d',
  );
  view.go();
  await waitFor(() =>
    expect(requests).toContain(
      '/api/campaigns/push-opens?from=2026-09-25&to=2026-10-24',
    ),
  );
  nav.search = 'tab=push&from=2024-01-01&to=2026-10-24';
  view.rerender(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AnalyticsScreen, { screen: 'acquisition' }),
    ),
  );
  expect(screen.getByRole('alert').textContent).toContain('최대 366일');
  expect(requests.some((x) => x.includes('2024-01-01'))).toBe(false);
});

it('503은 기존 Amplitude 오류와 재시도 UI로 처리한다', async () => {
  fail = true;
  draw();
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByRole('heading', { name: '관리자 캠페인' });
});

it('로딩 중에도 두 표의 6열·4열 골격을 예약한다', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => {})),
  );

  const view = draw();
  const tables = view.container.querySelectorAll(
    '[data-loading-layout="table"]',
  );

  expect(tables).toHaveLength(2);
  expect(tables[0].querySelector('[style]')?.getAttribute('style')).toContain(
    'repeat(6,',
  );
  expect(tables[1].querySelector('[style]')?.getAttribute('style')).toContain(
    'repeat(4,',
  );
});

it.each([false, true])(
  '준비 날짜 %s이면 60초 뒤 재요청하고 준비가 끝나면 멈춘다',
  async (pending) => {
    vi.useRealTimers();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T05:00:00Z'));
    data.asOf = pending ? data.asOf : null;
    data.pendingDates = pending ? ['2026-10-23'] : [];
    draw();
    await act(async () => {
      for (let i = 0; i < 6; i++) {
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(1);
      }

      await realDelay(0);
    });
    expect(screen.getByRole('heading', { name: '관리자 캠페인' })).toBeTruthy();
    expect(requests).toHaveLength(1);
    data.pendingDates = [];
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60001);
      await realDelay(0);
    });
    expect(requests).toHaveLength(pending ? 2 : 1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000);
    });
    expect(requests).toHaveLength(pending ? 2 : 1);
  },
);
