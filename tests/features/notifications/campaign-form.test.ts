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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as createCampaign } from '@/app/api/notifications/campaigns/route';
import { GET as count } from '@/app/api/notifications/campaigns/target-count/route';
import { GET as storyDetail } from '@/app/api/stories/[id]/route';
import { GET as storyList } from '@/app/api/stories/route';
import {
  CampaignFormScreen,
  displayBody,
} from '@/features/notifications/campaign-form-screen';
import { fromKst } from '@/features/notifications/schedule';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

let client: QueryClient;
const writes: unknown[] = [];
const storyQueries = () =>
  vi
    .mocked(fetch)
    .mock.calls.map(([url]) => String(url))
    .filter((url) => url.startsWith('/api/stories?'))
    .map((url) => new URL(url, 'http://localhost').searchParams);

beforeEach(() => {
  writes.length = 0;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: RequestInit) => {
      const request = new Request(`http://localhost${url}`, {
        method: options?.method ?? 'GET',
        body: options?.body,
      });

      if (url.includes('/target-count')) return count(request);

      if (url.startsWith('/api/stories?')) return storyList(request);

      if (url.startsWith('/api/stories/'))
        return storyDetail(request, {
          params: Promise.resolve({ id: url.split('/').at(-1)! }),
        });

      if (url === '/api/notifications/campaigns') {
        writes.push(JSON.parse(String(options?.body)));

        return createCampaign(request);
      }

      throw new Error(`Unexpected ${url}`);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  client.clear();
  vi.unstubAllGlobals();
});

/** Date만 고정하고 타이머는 실제로 흐르게 해 디바운스와 쿼리를 그대로 검증한다. */
function freeze(iso: string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}

function renderForm(storyId?: string) {
  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(CampaignFormScreen, { storyId }),
    ),
  );
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function combobox() {
  return screen.getByRole('combobox', { name: '이동 대상 스토리 검색' });
}

describe('이동 대상 스토리 선택기', () => {
  it('검색어 없이 채팅이 많은 공개 스토리를 보여 주고 키보드로 고른다', async () => {
    renderForm();
    expect(screen.getByText('이동 대상 없음', { selector: 'p' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '스토리 선택' }));

    const input = combobox();

    expect(document.activeElement).toBe(input);

    const options = await screen.findAllByRole('option');
    const query = storyQueries().at(-1)!;

    expect(query.get('visibility')).toBe('PUBLIC');
    expect(query.get('sort')).toBe('chatCount');
    expect(query.has('q')).toBe(false);
    expect(screen.getByText('채팅이 많은 공개 스토리')).toBeTruthy();

    const chats = options.map((option) =>
      Number(/채팅 ([\d,]+)/.exec(option.textContent!)![1].replace(/,/g, '')),
    );

    expect(chats).toEqual(chats.toSorted((a, b) => b - a));
    expect(options[0].textContent).toMatch(/턴 \d{1,3}(,\d{3})+/);
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(options[1].id);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.getAttribute('aria-activedescendant')).toBe(
      options.at(-1)!.id,
    );
    fireEvent.keyDown(input, { key: 'Home' });

    const title = options[0].querySelector('.truncate')!.textContent!;

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText(title, { selector: 'p' })).toBeTruthy();
    expect(document.activeElement?.textContent).toBe('변경');
    expect(
      screen.getByRole('link', { name: /상세 보기/ }).getAttribute('target'),
    ).toBe('_blank');

    fireEvent.click(screen.getByRole('button', { name: '선택 해제' }));
    expect(screen.getByText('이동 대상 없음', { selector: 'p' })).toBeTruthy();
  });
  it('입력이 멈춘 뒤 한 번만 검색하고 일치 부분을 강조한다', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: '스토리 선택' }));
    await screen.findAllByRole('option');
    fireEvent.change(combobox(), { target: { value: '별' } });
    fireEvent.change(combobox(), { target: { value: '별이' } });
    fireEvent.change(combobox(), { target: { value: '별이 잠' } });
    expect(screen.getByText('검색 중…')).toBeTruthy();
    await waitFor(() =>
      expect(storyQueries().some((q) => q.get('q') === '별이 잠')).toBe(true),
    );
    expect(storyQueries().filter((q) => q.has('q'))).toHaveLength(1);

    await waitFor(() =>
      expect(screen.getAllByRole('option')[0].textContent).toContain(
        '별이 잠든 도서관',
      ),
    );
    expect(
      screen
        .getAllByRole('option')
        .every(
          (option) => option.querySelector('mark')?.textContent === '별이 잠',
        ),
    ).toBe(true);
    expect(screen.getByText('‘별이 잠’ 검색 결과')).toBeTruthy();
  });
  it('결과가 없으면 안내하고 지우기 버튼으로 기본 목록에 돌아간다', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: '스토리 선택' }));
    fireEvent.change(combobox(), { target: { value: '없는제목' } });
    expect(
      await screen.findByText(
        '검색어 ‘없는제목’에 맞는 공개 스토리가 없습니다.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
    expect(document.activeElement).toBe(combobox());
    expect(await screen.findByText('채팅이 많은 공개 스토리')).toBeTruthy();
  });
  it('Esc는 포커스를 되돌리며 닫고 바깥을 누르면 닫는다', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: '스토리 선택' }));
    fireEvent.keyDown(combobox(), { key: 'Escape' });
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '스토리 선택' }),
    );

    fireEvent.click(screen.getByRole('button', { name: '스토리 선택' }));
    fireEvent.pointerDown(combobox());
    expect(screen.queryByRole('combobox')).not.toBeNull();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('combobox')).toBeNull();
  });
  it('조회되지 않는 미리 채운 스토리는 경고하고 제출을 막는다', async () => {
    freeze('2026-10-27T03:00:00Z');
    renderForm('00000000-0000-4000-8000-00000000ffff');
    type('제목', '행사');
    type('본문', '본문');
    type('사유', '사유');
    expect((await screen.findByRole('alert')).textContent).toContain(
      '스토리를 찾을 수 없습니다.',
    );
    expect(
      screen.getByText('이동 대상 스토리를 변경하거나 선택 해제해 주세요.'),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: '검토 후 발송' })
        .hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '선택 해제' }));
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: '검토 후 발송' })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
  });
});

describe('알림 내용과 미리보기', () => {
  it('제목과 본문을 실시간으로 미리 보이고 광고 표기를 한 번만 붙인다', async () => {
    renderForm();

    const preview = screen.getByRole('figure', { name: '알림 미리보기' });

    expect(
      within(preview).getByText('(광고) 제목을 입력해 주세요'),
    ).toBeTruthy();
    type('제목', '주말 이벤트');
    type('본문', '이프 두 배');
    expect(within(preview).getByText('(광고) 주말 이벤트')).toBeTruthy();
    expect(screen.getByTestId('preview-body').textContent).toBe(
      '이프 두 배\n수신거부: 마이 > 알림 설정',
    );
    expect(screen.getByText('6/100')).toBeTruthy();
    type('제목', '(광고) 주말 이벤트');
    expect(within(preview).getByText('(광고) 주말 이벤트')).toBeTruthy();
    expect(
      screen.getByText('(광고) 표기는 자동으로 붙으니 빼고 입력해 주세요.'),
    ).toBeTruthy();
  });
  it('부족한 입력을 순서대로 버튼 아래에 알려 준다', async () => {
    freeze('2026-10-27T03:00:00Z');
    renderForm();
    expect(screen.getByText('제목을 입력해 주세요.')).toBeTruthy();
    type('제목', '행사');
    expect(screen.getByText('본문을 입력해 주세요.')).toBeTruthy();
    type('본문', '본문');
    expect(screen.getByText('발송 사유를 입력해 주세요.')).toBeTruthy();
    type('사유', '사유');
    expect(
      await screen.findByText('다음 단계에서 내용을 한 번 더 확인합니다.'),
    ).toBeTruthy();
  });
});

describe('수신거부 안내', () => {
  it('광고성 본문 끝에 줄바꿈과 안내를 붙이고 이미 있으면 다시 붙이지 않는다', () => {
    expect(displayBody('MARKETING', '본문')).toBe(
      '본문\n수신거부: 마이 > 알림 설정',
    );
    expect(
      displayBody('MARKETING', '본문\n수신거부: 마이 > 알림 설정  \n'),
    ).toBe('본문\n수신거부: 마이 > 알림 설정  \n');
    expect(displayBody('SERVICE', '본문')).toBe('본문');
  });
  it('미리보기에 안내를 한 번만 보이고 빈 본문에도 안내 자리를 보인다', () => {
    renderForm();

    const body = () => screen.getByTestId('preview-body').textContent;

    expect(body()).toBe(
      '본문을 입력하면 여기에 표시됩니다.\n수신거부: 마이 > 알림 설정',
    );
    type('본문', '이프 두 배\n수신거부: 마이 > 알림 설정');
    expect(body()!.match(/수신거부/g)).toHaveLength(1);
    expect(
      screen.getByText(
        '(광고) 표기와 수신거부 안내는 발송할 때 서버가 붙입니다.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        '본문 끝의 ‘수신거부: 마이 > 알림 설정’ 안내는 서버가 붙이니 빼고 입력합니다.',
      ),
    ).toBeTruthy();
  });
});

describe('발송 시각', () => {
  it('지난 시각은 즉시 막고 빠른 선택으로 KST 시각을 예약한다', async () => {
    freeze('2026-10-27T03:00:00Z');
    renderForm();
    type('제목', '행사');
    type('본문', '본문');
    type('사유', '사유');
    fireEvent.click(screen.getByRole('radio', { name: '예약 발송' }));
    expect(
      screen.getAllByText('예약 날짜와 시각을 선택해 주세요.'),
    ).toHaveLength(2);
    expect(
      (screen.getByRole('button', { name: '오늘 12:00' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    type('예약 날짜', '2026-10-27');
    fireEvent.change(screen.getByLabelText('예약 시'), {
      target: { value: '11' },
    });
    fireEvent.change(screen.getByLabelText('예약 분'), {
      target: { value: '55' },
    });
    expect(screen.getByRole('alert').textContent).toBe(
      '이미 지난 시각입니다. 현재 이후로 선택해 주세요.',
    );
    expect(
      screen.getByText('예약 시각을 현재 이후로 바꿔 주세요.'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '내일 10:00' }));
    expect(
      screen
        .getByRole('button', { name: '내일 10:00' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getAllByText('2026년 10월 28일 (수) 오전 10:00 KST').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('22시간 뒤').length).toBeGreaterThan(0);

    const submit = screen.getByRole('button', { name: '검토 후 예약' });

    await waitFor(() => expect(submit.hasAttribute('disabled')).toBe(false));
    fireEvent.click(submit);

    const dialog = await screen.findByRole('dialog');

    expect(dialog.textContent).toContain(
      '2026년 10월 28일 (수) 오전 10:00 KST',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: '예약' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({
      scheduledAt: fromKst('2026-10-28', 10, 0)!.toISOString(),
    });
  });
  it('야간 광고는 야간 동의 인원을 경고하고 다음 날 08:00로 옮긴다', async () => {
    freeze('2026-10-27T13:00:00Z');
    renderForm();

    const warning = await screen.findByText('야간 광고 시간대입니다');
    const box = warning.closest('[role=status]') as HTMLElement;

    await waitFor(() => expect(box.textContent).toContain('180명'));
    expect(box.textContent).toContain('광고 수신 동의 412명 중');
    expect(screen.getByText('야간 규칙 적용')).toBeTruthy();

    fireEvent.click(
      within(box).getByRole('button', {
        name: '2026년 10월 28일 (수) 오전 8:00로 예약',
      }),
    );
    expect(
      (screen.getByRole('radio', { name: '예약 발송' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect((screen.getByLabelText('예약 날짜') as HTMLInputElement).value).toBe(
      '2026-10-28',
    );
    expect(screen.queryByText('야간 광고 시간대입니다')).toBeNull();
  });
  it('주간에 21:00 예약을 고르면 야간 규칙을 확인 대화상자에 적는다', async () => {
    freeze('2026-10-27T03:00:00Z');
    renderForm();
    type('제목', '행사');
    type('본문', '본문');
    type('사유', '사유');
    expect(screen.queryByText('야간 광고 시간대입니다')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '예약 발송' }));
    type('예약 날짜', '2026-10-27');
    fireEvent.change(screen.getByLabelText('예약 시'), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText('예약 분'), {
      target: { value: '55' },
    });
    expect(screen.queryByText('야간 광고 시간대입니다')).toBeNull();
    fireEvent.change(screen.getByLabelText('예약 시'), {
      target: { value: '21' },
    });
    fireEvent.change(screen.getByLabelText('예약 분'), {
      target: { value: '0' },
    });
    expect(screen.getByText('야간 광고 시간대입니다')).toBeTruthy();

    const submit = screen.getByRole('button', { name: '검토 후 예약' });

    await waitFor(() => expect(submit.hasAttribute('disabled')).toBe(false));
    fireEvent.click(submit);

    const dialog = await screen.findByRole('dialog');

    expect(dialog.textContent).toContain('약 180명');
    expect(dialog.textContent).toContain('적용, 야간 광고 동의자에게만 발송');
  });
});
