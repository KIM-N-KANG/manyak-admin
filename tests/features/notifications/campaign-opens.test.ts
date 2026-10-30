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

import { analyticsRefetch } from '@/features/analytics/range';
import type { CampaignOpensResponse } from '@/features/analytics/types';
import { CampaignDetailScreen } from '@/features/notifications/campaign-detail-screen';
import { getCampaign } from '@/fixtures/notifications';

const id = 'c1000000-0000-4000-8000-000000000005';
const url = `/api/campaigns/push-opens/${id}`;
let data: CampaignOpensResponse;
let client: QueryClient;
let failOpens = false;
let failDetail = false;
const requests: string[] = [];

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
beforeEach(() => {
  data = {
    campaignId: id,
    asOf: '2026-10-30T05:10:00Z',
    pendingDates: [],
    startedAt: '2026-10-23T02:00:31Z',
    from: '2026-10-23',
    to: '2026-10-30',
    measuredFrom: '2026-10-21',
    androidMeasuredFrom: '2026-10-23',
    deliveredMembers: 412,
    openState: 'MEASURED',
    pushOpens: 84,
    webPushOpens: 61,
    androidPushOpens: 23,
    pushOpenRate: 0.2039,
    inboxOpens: 11,
    webInboxOpens: 4,
    androidInboxOpens: 7,
  };
  client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 60000,
        refetchOnWindowFocus: false,
      },
    },
  });
  failOpens = false;
  failDetail = false;
  requests.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input) => {
      requests.push(String(input));

      const opens = String(input) === url;

      return (opens && failOpens) || (!opens && failDetail)
        ? Response.json({ message: '사용 불가' }, { status: 503 })
        : Response.json(opens ? data : getCampaign(id));
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

const draw = () =>
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(CampaignDetailScreen, { id }),
    ),
  );

it('5-1-16 상세와 열람은 쿼리 없이 동시에 요청하고 발송 단계 아래에 세 카드를 표시한다', async () => {
  let resolveDetail!: (response: Response) => void;

  vi.mocked(fetch).mockImplementation(async (input) => {
    requests.push(String(input));

    return String(input) === url
      ? Response.json(data)
      : new Promise<Response>((resolve) => {
          resolveDetail = resolve;
        });
  });
  draw();
  await waitFor(() =>
    expect(requests).toEqual([`/api/notifications/campaigns/${id}`, url]),
  );
  expect(screen.queryByRole('region', { name: '열람' })).toBeNull();
  await act(async () => resolveDetail(Response.json(getCampaign(id))));

  const area = await screen.findByRole('region', { name: '열람' });

  expect(
    within(area)
      .getAllByRole('heading')
      .map((h) => h.textContent),
  ).toEqual(['열람', '푸시 열람', '열람률', '알림함 열람']);

  for (const text of [
    '84명',
    '웹 61명, 앱 23명',
    '20.4%',
    '11명',
    '웹 4명, 앱 7명',
    '2026-10-23 ~ 2026-10-30',
  ])
    expect(within(area).getByText(text)).toBeTruthy();

  expect(
    screen
      .getByRole('list', { name: '발송 단계' })
      .compareDocumentPosition(area) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    area.compareDocumentPosition(
      screen.getByRole('textbox', { name: '처리 사유' }),
    ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

it.each([
  ['NO_LINK', '측정 불가'],
  ['BEFORE_MEASUREMENT', '측정 시작 전'],
  ['PENDING', '발송 기록 없음'],
] as const)('5-1-16 %s는 세 카드에 %s만 표시한다', async (state, message) => {
  data.openState = state;
  data.from = null;
  data.to = null;
  data.asOf = null;
  draw();

  const area = await screen.findByRole('region', { name: '열람' });

  expect(within(area).getAllByText(message)).toHaveLength(3);
  expect(within(area).queryByText(/웹 /)).toBeNull();
  expect(within(area).queryByText(/2026-10-23 ~ /)).toBeNull();
  expect(within(area).queryByText(/KST 집계 기준/)).toBeNull();
});

it('5-1-16 앱 null은 측정 전이며 150%와 실제 0을 보존한다', async () => {
  data.androidPushOpens = null;
  data.androidInboxOpens = null;
  data.pushOpenRate = 1.5;
  data.inboxOpens = 0;
  data.webInboxOpens = 0;
  draw();

  const area = await screen.findByRole('region', { name: '열람' });

  expect(within(area).getByText('웹 61명, 앱 측정 시작 전')).toBeTruthy();
  expect(within(area).getByText('웹 0명, 앱 측정 시작 전')).toBeTruthy();
  expect(within(area).getByText('150.0%')).toBeTruthy();
  expect(within(area).getByText('0명')).toBeTruthy();
});

it('5-1-16 열람 실패는 상세의 재실행을 가리지 않고 같은 열람 요청만 다시 시도한다', async () => {
  failOpens = true;
  draw();

  const area = await screen.findByRole('region', { name: '열람' });

  await within(area).findByRole('alert');
  expect(screen.getByRole('button', { name: '재실행' })).toBeTruthy();
  failOpens = false;
  fireEvent.click(within(area).getByRole('button', { name: '다시 시도' }));
  await within(area).findByText('84명');
  expect(requests.filter((p) => p === url)).toHaveLength(2);
  expect(requests.filter((p) => p.includes('/notifications/'))).toHaveLength(1);
});

it('5-1-16 상세가 실패하면 성공한 열람 영역도 표시하지 않는다', async () => {
  failDetail = true;
  draw();
  await screen.findByRole('alert');
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(screen.queryByRole('region', { name: '열람' })).toBeNull();
});

it('5-1-16 준비 중 안내와 재요청 조건을 유지하고 떠나면 관찰을 중단한다', async () => {
  data.pendingDates = ['2026-10-29'];

  const view = draw();
  const area = await screen.findByRole('region', { name: '열람' });
  const notice = within(area).getByText(
    '열람 수는 준비된 날짜만 합산했습니다. 열람률은 일부 날짜의 열람 수를 전체 도달 회원 수로 나눈 값입니다.',
  );

  expect(
    notice.compareDocumentPosition(
      within(area).getByRole('heading', { name: '푸시 열람' }),
    ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(analyticsRefetch({ state: { data } })).toBe(60000);
  expect(
    analyticsRefetch({ state: { data: { ...data, pendingDates: [] } } }),
  ).toBe(false);

  const query = client.getQueryCache().find({ queryKey: [url] })!;

  expect(query.getObserversCount()).toBe(1);
  view.unmount();
  expect(query.getObserversCount()).toBe(0);
});

it('5-1-16 알림함 카드 도움말은 정본 정의를 표시한다', async () => {
  draw();

  const area = await screen.findByRole('region', { name: '열람' });

  await act(async () =>
    within(area).getByRole('button', { name: '알림함 열람 지표 정의' }).focus(),
  );

  const help = await screen.findByRole('tooltip');

  expect(help.textContent).toContain(
    '알림함에는 푸시를 끈 회원의 알림도 있어 열람률을 두지 않음',
  );
  expect(help.textContent).toContain('이프 만료 예정');
});
