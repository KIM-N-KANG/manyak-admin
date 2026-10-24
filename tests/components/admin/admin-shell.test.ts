// @vitest-environment jsdom

import { createElement } from 'react';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminShell } from '@/components/admin/admin-shell';

const navigation = vi.hoisted(() => ({ pathname: '/dashboard' }));

vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  const values = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    clear: () => values.clear(),
  });
});

const entries = [
  ['/dashboard', '개요'],
  ['/dashboard/analytics', '분석'],
  ['/analytics/acquisition', '유입'],
  ['/analytics/users', '사용자'],
  ['/analytics/conversion', '전환'],
  ['/analytics/quality', '기능과 품질'],
  ['/analytics/infra', '인프라'],
  ['/members', '회원'],
  ['/stories', '스토리'],
  ['/moderation/submissions', '검수 제출'],
  ['/originals', '오리지널'],
  ['/chats', '채팅'],
  ['/payments', '결제'],
  ['/credits/transactions', '이프'],
  ['/notices', '공지'],
  ['/audit-logs', '감사 로그'],
  ['/notifications/campaigns', '캠페인'],
  ['/notifications/stats', '발송 통계'],
  ['/notifications/templates', '문구 템플릿'],
] as const;

function shell(pathname: string) {
  navigation.pathname = pathname;

  return render(
    createElement(AdminShell, null, createElement('h1', null, '본문')),
  );
}

describe('관리자 메뉴 구조', () => {
  it('번호 없는 세 구역에 지정한 메뉴를 순서대로 배치한다', () => {
    shell('/dashboard');

    fireEvent.click(screen.getByRole('button', { name: '관리' }));
    fireEvent.click(screen.getByRole('button', { name: '알림' }));

    const nav = screen.getByRole('navigation', { name: '관리자 메뉴' });

    expect(
      within(nav)
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent?.replace('▸', '')),
    ).toEqual(['대시보드', '관리', '알림']);
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.getAttribute('href'), link.textContent]),
    ).toEqual(entries);
    expect(
      within(nav)
        .getByRole('region', { name: '대시보드' })
        .querySelectorAll('a'),
    ).toHaveLength(7);
    expect(
      within(nav).getByRole('region', { name: '관리' }).querySelectorAll('a'),
    ).toHaveLength(9);
    expect(
      within(nav).getByRole('region', { name: '알림' }).querySelectorAll('a'),
    ).toHaveLength(3);
    expect(
      screen.getByRole('link', { name: '마냑 관리자' }).getAttribute('href'),
    ).toBe('/dashboard');
  });

  it.each(entries)('%s는 %s 메뉴만 활성화한다', (pathname, label) => {
    shell(pathname);

    const active = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');

    expect(active).toHaveLength(1);
    expect(active[0].textContent).toBe(label);
  });

  it.each(
    entries.filter(([path]) =>
      ['/members', '/stories', '/chats', '/payments'].includes(path),
    ),
  )('%s 상세도 %s 메뉴를 활성화한다', (pathname, label) => {
    shell(`${pathname}/00000001-0000-4000-8000-000000000001`);

    const active = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');

    expect(active).toHaveLength(1);
    expect(active[0].textContent).toBe(label);
  });

  it('비슷한 접두사 경로를 활성 메뉴로 오인하지 않는다', () => {
    shell('/dashboard/analytics-other');
    expect(
      screen
        .getAllByRole('link')
        .some((link) => link.hasAttribute('aria-current')),
    ).toBe(false);
  });
});

it('다른 구역을 접고 펼친 상태는 새로고침 뒤 유지하고 현재 구역은 접히지 않는다', () => {
  const view = shell('/members');
  const current = screen.getByRole('button', { name: '관리' });

  expect(current.getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(current);
  expect(current.getAttribute('aria-expanded')).toBe('true');

  const other = screen.getByRole('button', { name: '알림' });

  expect(other.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(other);
  expect(other.getAttribute('aria-expanded')).toBe('true');
  view.unmount();
  shell('/members');
  expect(
    screen.getByRole('button', { name: '알림' }).getAttribute('aria-expanded'),
  ).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '알림' }));
  expect(screen.queryByRole('link', { name: '캠페인' })).toBeNull();
});

it('사이드바 하단에 로그인 관리자 닉네임과 로그아웃을 표시한다', () => {
  render(createElement(AdminShell, { nickname: '운영자 이름' }, '내용'));
  expect(screen.getByText('운영자 이름')).toBeTruthy();
  expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy();
});

it('미리보기 닉네임과 고정 데이터 표시를 노출하고 로그아웃을 숨긴다', () => {
  render(
    createElement(AdminShell, { nickname: '미리보기', preview: true }, '본문'),
  );
  expect(screen.getByText('미리보기')).toBeTruthy();
  expect(screen.getByText('고정 데이터 미리보기')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull();
});
