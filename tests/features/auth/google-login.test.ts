// @vitest-environment jsdom
import { createElement } from 'react';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { FetchError } from '@/api/mutator/custom-instance';
import { QueryState } from '@/components/admin/data-ui';
import { GoogleLogin } from '@/features/auth/google-login';

vi.mock('next/script', () => ({
  default: ({
    onReady,
    onError,
  }: {
    onReady: () => void;
    onError: () => void;
  }) =>
    createElement(
      'div',
      {},
      createElement('button', { onClick: onReady }, 'SDK 준비'),
      createElement('button', { onClick: onError }, 'SDK 오류'),
    ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete window.google;
});

it('클라이언트 설정이 없으면 로그인 설정 안내를 표시한다', () => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', '');
  render(createElement(GoogleLogin));
  expect(screen.getByText('Google 로그인 설정이 필요합니다.')).toBeTruthy();
});

it.each([401, 403])(
  '%s 실패는 같은 관리자 권한 안내를 표시한다',
  async (status) => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'web-client-id');

    let callback: (response: { credential: string }) => void = () => {};
    const renderButton = vi.fn();

    window.google = {
      accounts: {
        id: {
          initialize: vi.fn((options) => {
            callback = options.callback;
          }),
          renderButton,
          disableAutoSelect: vi.fn(),
        },
      },
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: '서버 오류 상세' }, { status }),
      );

    vi.stubGlobal('fetch', fetchMock);
    render(createElement(GoogleLogin));
    fireEvent.click(screen.getByRole('button', { name: 'SDK 준비' }));
    expect(window.google.accounts.id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'web-client-id',
        auto_select: false,
      }),
    );
    expect(renderButton).toHaveBeenCalledOnce();
    await act(async () => {
      callback({ credential: 'google-id-proof' });
    });
    expect(screen.getByRole('alert').textContent).toBe(
      '관리자 권한이 없는 계정입니다.',
    );
    expect(screen.queryByText('서버 오류 상세')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: '{"idToken":"google-id-proof"}',
      }),
    );
  },
);

it('Google 스크립트 실패를 안내한다', () => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'web-client-id');
  render(createElement(GoogleLogin));
  fireEvent.click(screen.getByRole('button', { name: 'SDK 오류' }));
  expect(screen.getByRole('alert').textContent).toContain(
    'Google 로그인을 불러오지 못했습니다.',
  );
});

it('서버 미구현 응답은 화면에 별도로 안내한다', () => {
  render(
    createElement(QueryState, {
      pending: false,
      error: new FetchError('요청 실패', 503, { message: '서버 미구현' }),
      retry: vi.fn(),
    }),
  );
  expect(screen.getByRole('alert').textContent).toContain('서버 미구현');
  expect(screen.getByRole('alert').textContent).toContain(
    '서버 연결을 준비 중',
  );
});
