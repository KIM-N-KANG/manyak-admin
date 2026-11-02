// @vitest-environment jsdom
import { createElement } from 'react';

import type { UseQueryResult } from '@tanstack/react-query';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { MetricScope } from '@/features/analytics/metric-definition';
import { AcquisitionContent } from '@/features/analytics/tab-content';
import type {
  CampaignOpensResponse,
  PushOpensResponse,
} from '@/features/analytics/types';
import { CampaignOpens } from '@/features/notifications/campaign-opens';
import { metricFixture } from '@/fixtures/metrics';

const data = () =>
  metricFixture(
    '/campaigns/push-opens',
    new URLSearchParams('from=2026-10-21&to=2026-10-23'),
  ) as PushOpensResponse;

afterEach(cleanup);
it.each(['MEASURED', 'NO_LINK', 'BEFORE_MEASUREMENT', 'PENDING'] as const)(
  '%s여도 채팅 전환은 독립적인 값이며 도달 없음은 null로 표시한다',
  (state) => {
    const payload = data();

    Object.assign(payload.campaigns[0], {
      openState: state,
      chattedMembers: 97,
      chattedBeforeMembers: 64,
      chatRate: 0.2354,
    });
    render(
      createElement(
        MetricScope,
        { value: 'acquisition' },
        createElement(AcquisitionContent, {
          tab: 'push',
          data: payload,
          segment: 'all',
        }),
      ),
    );

    const table = screen.getAllByRole('table')[0];

    expect(
      within(table).getByRole('columnheader', { name: /채팅 전환/ }),
    ).toBeTruthy();
    expect(within(table).getByText('97명')).toBeTruthy();
    expect(within(table).getByText('도달 전 24시간 64명')).toBeTruthy();
    expect(within(table).getByText('23.5%')).toBeTruthy();
  },
);
it('채팅 전환 필드가 없는 이전 응답에는 전환 열을 추가하지 않는다', () => {
  const payload = data();

  for (const row of [...payload.campaigns, ...payload.activityTypes])
    for (const key of ['chattedMembers', 'chattedBeforeMembers', 'chatRate'])
      delete (row as unknown as Record<string, unknown>)[key];

  render(
    createElement(
      MetricScope,
      { value: 'acquisition' },
      createElement(AcquisitionContent, {
        tab: 'push',
        data: payload,
        segment: 'all',
      }),
    ),
  );
  expect(screen.queryByRole('columnheader', { name: /채팅 전환/ })).toBeNull();
  expect(screen.queryByRole('columnheader', { name: /전환율/ })).toBeNull();
});
it('채팅 전환 null은 도달 없음이고 정의에 사전 비교값을 설명한다', async () => {
  const payload = data();

  for (const row of payload.campaigns)
    Object.assign(row, {
      chattedMembers: null,
      chattedBeforeMembers: null,
      chatRate: null,
    });

  render(
    createElement(
      MetricScope,
      { value: 'acquisition' },
      createElement(AcquisitionContent, {
        tab: 'push',
        data: payload,
        segment: 'all',
      }),
    ),
  );
  expect(screen.getAllByText('도달 없음').length).toBeGreaterThan(0);
  act(() =>
    screen.getAllByRole('button', { name: '채팅 전환 지표 정의' })[0].focus(),
  );
  expect((await screen.findByRole('tooltip')).textContent).toContain(
    '도달 전 24시간',
  );
});
it.each([true, false])(
  '캠페인 상세는 전환 필드 유무 %s에 따라 두 카드만 추가한다',
  (present) => {
    const payload = {
      ...data().campaigns[0],
      asOf: null,
      pendingDates: [],
      from: null,
      to: null,
    } as unknown as CampaignOpensResponse;

    if (present)
      Object.assign(payload, {
        chattedMembers: 97,
        chattedBeforeMembers: 64,
        chatRate: 0.2354,
      });
    else
      for (const key of ['chattedMembers', 'chattedBeforeMembers', 'chatRate'])
        delete (payload as unknown as Record<string, unknown>)[key];

    render(
      createElement(CampaignOpens, {
        query: {
          data: payload,
          isPending: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
        } as unknown as UseQueryResult<CampaignOpensResponse>,
      }),
    );

    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((node) => node.textContent);

    expect(titles).toEqual(
      present
        ? ['채팅 전환', '전환율', '푸시 열람', '열람률', '알림함 열람']
        : ['푸시 열람', '열람률', '알림함 열람'],
    );
    expect(
      screen.getByRole('button', {
        name: 'Amplitude와 서버 DB 출처와 집계 안내',
      }),
    ).toBeTruthy();
  },
);

it('캠페인 열람 첫 로딩은 새 카드 다섯 개의 골격을 예약한다', () => {
  const view = render(
    createElement(CampaignOpens, {
      query: {
        isPending: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as UseQueryResult<CampaignOpensResponse>,
    }),
  );

  expect(
    view.container.querySelector('[data-loading-layout="summary-card"]'),
  ).toBeNull();
  expect(view.container.querySelectorAll('[data-slot="card"]')).toHaveLength(5);
});
